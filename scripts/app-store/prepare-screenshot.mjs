import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIRECTORY, "../..");
const DEFAULT_ACCEPTED_DIMENSIONS = Object.freeze([
  Object.freeze({ width: 1260, height: 2736 }),
  Object.freeze({ width: 1290, height: 2796 }),
  Object.freeze({ width: 1320, height: 2868 }),
]);
const REJECTED_COLOR_PROFILE_CHUNKS = new Set([
  "cHRM",
  "gAMA",
  "iCCP",
  "cICP",
  "mDCv",
  "cLLi",
]);
const APNG_CHUNKS = new Set(["acTL", "fcTL", "fdAT"]);
const MAX_SOURCE_PNG_BYTES = 64 * 1024 * 1024;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function parsePng(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("source must be a complete PNG file");
  }

  const chunks = [];
  let offset = 8;
  let sawImageData = false;
  let sawEnd = false;

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      throw new Error("source PNG contains a truncated chunk");
    }
    const length = buffer.readUInt32BE(offset);
    const nextOffset = offset + 12 + length;
    if (nextOffset > buffer.length) {
      throw new Error("source PNG contains a truncated chunk");
    }
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/u.test(type)) {
      throw new Error("source PNG contains an invalid chunk type");
    }
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = buffer.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(buffer.subarray(offset + 4, offset + 8 + length));
    if (actualCrc !== expectedCrc) {
      throw new Error(`source PNG ${type} checksum is invalid`);
    }
    if (chunks.length === 0 && (type !== "IHDR" || length !== 13)) {
      throw new Error("source PNG must begin with a 13-byte IHDR chunk");
    }
    if (type === "IHDR" && chunks.length !== 0) {
      throw new Error("source PNG contains more than one IHDR chunk");
    }
    if (type === "IDAT") sawImageData ||= length > 0;
    if (type === "IEND") {
      if (length !== 0 || nextOffset !== buffer.length) {
        throw new Error("source PNG has an invalid IEND chunk");
      }
      sawEnd = true;
    }
    if (APNG_CHUNKS.has(type)) {
      throw new Error("animated PNG screenshots are not supported");
    }
    const isCritical = type[0] === type[0].toUpperCase();
    if (isCritical && !new Set(["IHDR", "PLTE", "IDAT", "IEND"]).has(type)) {
      throw new Error(`source PNG contains unsupported critical chunk ${type}`);
    }
    chunks.push({ type, data });
    offset = nextOffset;
    if (type === "IEND") break;
  }

  if (!sawImageData || !sawEnd) {
    throw new Error("source PNG is missing image data or IEND");
  }

  const ihdr = chunks[0].data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const compressionMethod = ihdr[10];
  const filterMethod = ihdr[11];
  const interlaceMethod = ihdr[12];
  if (width === 0 || height === 0) {
    throw new Error("source PNG dimensions are invalid");
  }
  if (![2, 6].includes(colorType) || bitDepth !== 8) {
    throw new Error("source PNG must use 8-bit RGB or RGBA pixels");
  }
  if (compressionMethod !== 0 || filterMethod !== 0 || interlaceMethod !== 0) {
    throw new Error(
      "source PNG must be non-interlaced with standard compression",
    );
  }
  if (chunks.some(({ type }) => type === "tRNS")) {
    throw new Error("source PNG contains a transparency chunk");
  }

  return { chunks, width, height, colorType };
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function decodePixels(parsed) {
  const channels = parsed.colorType === 6 ? 4 : 3;
  const rowBytes = parsed.width * channels;
  const expectedLength = (rowBytes + 1) * parsed.height;
  const compressed = Buffer.concat(
    parsed.chunks.filter(({ type }) => type === "IDAT").map(({ data }) => data),
  );
  let inflation;
  try {
    inflation = inflateSync(compressed, {
      maxOutputLength: expectedLength,
      info: true,
    });
  } catch {
    throw new Error("source PNG image data cannot be decompressed safely");
  }
  const inflated = inflation.buffer;
  if (inflation.engine.bytesWritten !== compressed.length) {
    throw new Error("source PNG image data contains unconsumed bytes");
  }
  if (inflated.length !== expectedLength) {
    throw new Error("source PNG image data does not match its dimensions");
  }

  const decoded = Buffer.alloc(rowBytes * parsed.height);
  for (let row = 0; row < parsed.height; row += 1) {
    const encodedOffset = row * (rowBytes + 1);
    const decodedOffset = row * rowBytes;
    const filter = inflated[encodedOffset];
    if (filter > 4) {
      throw new Error(`source PNG row ${row} uses an invalid filter`);
    }
    for (let columnByte = 0; columnByte < rowBytes; columnByte += 1) {
      const encoded = inflated[encodedOffset + 1 + columnByte];
      const left =
        columnByte >= channels
          ? decoded[decodedOffset + columnByte - channels]
          : 0;
      const up = row > 0 ? decoded[decodedOffset - rowBytes + columnByte] : 0;
      const upperLeft =
        row > 0 && columnByte >= channels
          ? decoded[decodedOffset - rowBytes + columnByte - channels]
          : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? Math.floor((left + up) / 2)
                : paethPredictor(left, up, upperLeft);
      decoded[decodedOffset + columnByte] = (encoded + predictor) & 0xff;
    }
  }
  return decoded;
}

function canonicalColorChunks(chunks) {
  let canonicalSrgb = null;
  let sawImageData = false;
  for (const { type, data } of chunks) {
    if (type === "IDAT") sawImageData = true;
    if (REJECTED_COLOR_PROFILE_CHUNKS.has(type)) {
      throw new Error(
        `source PNG ${type} color profile requires separate reviewed conversion`,
      );
    }
    if (type === "sRGB") {
      if (
        sawImageData ||
        canonicalSrgb !== null ||
        data.length !== 1 ||
        data[0] !== 0
      ) {
        throw new Error("source PNG sRGB declaration must be canonical");
      }
      canonicalSrgb = pngChunk("sRGB", Buffer.from([0]));
    }
  }
  return canonicalSrgb === null ? [] : [canonicalSrgb];
}

function rgbPixels(parsed, decoded) {
  if (parsed.colorType === 2) return Buffer.from(decoded);
  const rgb = Buffer.alloc(parsed.width * parsed.height * 3);
  for (
    let sourceOffset = 0, targetOffset = 0;
    sourceOffset < decoded.length;
    sourceOffset += 4, targetOffset += 3
  ) {
    if (decoded[sourceOffset + 3] !== 255) {
      const pixel = sourceOffset / 4;
      const x = pixel % parsed.width;
      const y = Math.floor(pixel / parsed.width);
      throw new Error(
        `source PNG contains non-opaque alpha at pixel ${x},${y}`,
      );
    }
    rgb[targetOffset] = decoded[sourceOffset];
    rgb[targetOffset + 1] = decoded[sourceOffset + 1];
    rgb[targetOffset + 2] = decoded[sourceOffset + 2];
  }
  return rgb;
}

function encodeOpaquePng(parsed, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(parsed.width, 0);
  ihdr.writeUInt32BE(parsed.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const rowBytes = parsed.width * 3;
  const unfiltered = Buffer.alloc((rowBytes + 1) * parsed.height);
  for (let row = 0; row < parsed.height; row += 1) {
    const targetOffset = row * (rowBytes + 1);
    unfiltered[targetOffset] = 0;
    rgb.copy(
      unfiltered,
      targetOffset + 1,
      row * rowBytes,
      (row + 1) * rowBytes,
    );
  }

  const preserved = canonicalColorChunks(parsed.chunks);
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    ...preserved,
    pngChunk("IDAT", deflateSync(unfiltered)),
    pngChunk("IEND"),
  ]);
}

export function prepareScreenshot(
  source,
  { acceptedDimensions = DEFAULT_ACCEPTED_DIMENSIONS } = {},
) {
  if (!Buffer.isBuffer(source)) {
    throw new TypeError("source screenshot must be a Buffer");
  }
  if (source.length > MAX_SOURCE_PNG_BYTES) {
    throw new Error("source PNG exceeds the 64 MiB safety limit");
  }
  const parsed = parsePng(source);
  if (
    !acceptedDimensions.some(
      ({ width, height }) => parsed.width === width && parsed.height === height,
    )
  ) {
    throw new Error(
      `source PNG has unsupported dimensions ${parsed.width}x${parsed.height}`,
    );
  }

  const sourceDecoded = decodePixels(parsed);
  const rgb = rgbPixels(parsed, sourceDecoded);
  const action =
    parsed.colorType === 6
      ? "opaque_alpha_stripped_and_reencoded"
      : "opaque_rgb_reencoded";
  const output = encodeOpaquePng(parsed, rgb);

  const outputParsed = parsePng(output);
  const outputRgb = rgbPixels(outputParsed, decodePixels(outputParsed));
  if (outputParsed.colorType !== 2 || !outputRgb.equals(rgb)) {
    throw new Error("prepared PNG failed the decoded RGB equality check");
  }

  return {
    output,
    report: {
      schemaVersion: 1,
      action,
      width: parsed.width,
      height: parsed.height,
      sourceHadAlphaChannel: parsed.colorType === 6,
      allSourceAlphaSamplesOpaque: parsed.colorType === 6 ? true : null,
      sourceSha256: sha256(source),
      outputSha256: sha256(output),
      decodedRgbSha256: sha256(rgb),
      decodedRgbEqualityVerified: true,
    },
  };
}

export function prepareScreenshotFile({
  inputPath,
  outputName,
  repoRoot = DEFAULT_REPO_ROOT,
}) {
  if (
    typeof outputName !== "string" ||
    outputName !== path.basename(outputName) ||
    !/^[a-z0-9][a-z0-9._-]*\.png$/u.test(outputName)
  ) {
    throw new Error("output must be a lowercase PNG filename without a path");
  }

  const input = path.resolve(inputPath);
  const inputStat = fs.lstatSync(input);
  if (!inputStat.isFile() || inputStat.isSymbolicLink()) {
    throw new Error("input must be a regular non-symlink PNG file");
  }
  if (inputStat.size > MAX_SOURCE_PNG_BYTES) {
    throw new Error("source PNG exceeds the 64 MiB safety limit");
  }

  const assetDirectory = path.resolve(repoRoot, "app-store/screenshots/files");
  const assetStat = fs.lstatSync(assetDirectory);
  const realAssetDirectory = fs.realpathSync(assetDirectory);
  const expectedRealAssetDirectory = path.join(
    fs.realpathSync(path.resolve(repoRoot)),
    "app-store/screenshots/files",
  );
  if (
    !assetStat.isDirectory() ||
    assetStat.isSymbolicLink() ||
    realAssetDirectory !== expectedRealAssetDirectory
  ) {
    throw new Error(
      "controlled screenshot directory is not a regular directory",
    );
  }
  const outputPath = path.join(realAssetDirectory, outputName);
  const realInput = fs.realpathSync(input);
  if (realInput.startsWith(`${realAssetDirectory}${path.sep}`)) {
    throw new Error(
      "retain the raw capture outside the controlled upload directory",
    );
  }
  if (fs.existsSync(outputPath)) {
    throw new Error("refusing to overwrite an existing prepared screenshot");
  }

  const prepared = prepareScreenshot(fs.readFileSync(realInput));
  fs.writeFileSync(outputPath, prepared.output, { flag: "wx", mode: 0o644 });
  return { ...prepared.report, outputFile: outputName };
}

export function main(arguments_ = process.argv.slice(2)) {
  if (arguments_.length !== 2) {
    throw new Error(
      "usage: node scripts/app-store/prepare-screenshot.mjs <raw.png> <output-name.png>",
    );
  }
  return prepareScreenshotFile({
    inputPath: arguments_[0],
    outputName: arguments_[1],
  });
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  try {
    process.stdout.write(`${JSON.stringify(main(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  }
}
