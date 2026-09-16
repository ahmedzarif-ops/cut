import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateSync, inflateSync } from "node:zlib";

import {
  prepareScreenshot,
  prepareScreenshotFile,
} from "./prepare-screenshot.mjs";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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

function chunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(
    crc32(Buffer.concat([typeBytes, data])),
    8 + data.length,
  );
  return result;
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const distances = [
    Math.abs(estimate - left),
    Math.abs(estimate - up),
    Math.abs(estimate - upperLeft),
  ];
  const minimum = Math.min(...distances);
  return distances[0] === minimum
    ? left
    : distances[1] === minimum
      ? up
      : upperLeft;
}

function filteredRows({ width, height, channels, pixels, filters }) {
  const rowBytes = width * channels;
  const encoded = Buffer.alloc((rowBytes + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const filter = filters[row % filters.length];
    const sourceOffset = row * rowBytes;
    const targetOffset = row * (rowBytes + 1);
    encoded[targetOffset] = filter;
    for (let columnByte = 0; columnByte < rowBytes; columnByte += 1) {
      const value = pixels[sourceOffset + columnByte];
      const left =
        columnByte >= channels
          ? pixels[sourceOffset + columnByte - channels]
          : 0;
      const up = row > 0 ? pixels[sourceOffset - rowBytes + columnByte] : 0;
      const upperLeft =
        row > 0 && columnByte >= channels
          ? pixels[sourceOffset - rowBytes + columnByte - channels]
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
                : paeth(left, up, upperLeft);
      encoded[targetOffset + 1 + columnByte] = (value - predictor) & 0xff;
    }
  }
  return encoded;
}

function makePng({
  width,
  height,
  colorType,
  pixels,
  filters = [0],
  trns,
  ancillary = [],
  idatSuffix = Buffer.alloc(0),
}) {
  const channels = colorType === 6 ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    ...(trns ? [chunk("tRNS", trns)] : []),
    ...ancillary,
    chunk(
      "IDAT",
      Buffer.concat([
        deflateSync(filteredRows({ width, height, channels, pixels, filters })),
        idatSuffix,
      ]),
    ),
    chunk("IEND"),
  ]);
}

function rgbaPixels(width, height, alpha = 255) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const pixel = offset / 4;
    pixels[offset] = (pixel * 17 + 3) & 0xff;
    pixels[offset + 1] = (pixel * 31 + 7) & 0xff;
    pixels[offset + 2] = (pixel * 47 + 11) & 0xff;
    pixels[offset + 3] = alpha;
  }
  return pixels;
}

function rgbFromRgba(rgba) {
  const rgb = Buffer.alloc((rgba.length / 4) * 3);
  for (
    let source = 0, target = 0;
    source < rgba.length;
    source += 4, target += 3
  ) {
    rgba.copy(rgb, target, source, source + 3);
  }
  return rgb;
}

function outputColorTypeAndPixels(png) {
  const colorType = png[25];
  let offset = 8;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT")
      idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rowBytes = png.readUInt32BE(16) * 3;
  const height = png.readUInt32BE(20);
  const pixels = Buffer.alloc(rowBytes * height);
  for (let row = 0; row < height; row += 1) {
    assert.equal(raw[row * (rowBytes + 1)], 0);
    raw.copy(
      pixels,
      row * rowBytes,
      row * (rowBytes + 1) + 1,
      (row + 1) * (rowBytes + 1),
    );
  }
  return { colorType, pixels };
}

function chunkTypes(png) {
  const types = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    types.push(type);
    offset += length + 12;
    if (type === "IEND") break;
  }
  return types;
}

test("fully opaque RGBA is converted to identical decoded RGB across all PNG filters", () => {
  const width = 3;
  const height = 5;
  const rgba = rgbaPixels(width, height);
  const source = makePng({
    width,
    height,
    colorType: 6,
    pixels: rgba,
    filters: [0, 1, 2, 3, 4],
  });
  const prepared = prepareScreenshot(source, {
    acceptedDimensions: [{ width, height }],
  });
  const output = outputColorTypeAndPixels(prepared.output);

  assert.equal(prepared.report.action, "opaque_alpha_stripped_and_reencoded");
  assert.equal(prepared.report.sourceHadAlphaChannel, true);
  assert.equal(prepared.report.allSourceAlphaSamplesOpaque, true);
  assert.equal(prepared.report.decodedRgbEqualityVerified, true);
  assert.equal(output.colorType, 2);
  assert.deepEqual(output.pixels, rgbFromRgba(rgba));
  assert.notEqual(prepared.report.sourceSha256, prepared.report.outputSha256);
});

test("any non-opaque alpha sample fails closed without an output", () => {
  const pixels = rgbaPixels(2, 2);
  pixels[7] = 254;
  const source = makePng({
    width: 2,
    height: 2,
    colorType: 6,
    pixels,
  });
  assert.throws(
    () =>
      prepareScreenshot(source, {
        acceptedDimensions: [{ width: 2, height: 2 }],
      }),
    /non-opaque alpha at pixel 1,0/u,
  );
});

test("an already opaque RGB PNG is re-encoded with identical decoded pixels", () => {
  const pixels = rgbFromRgba(rgbaPixels(2, 2));
  const source = makePng({
    width: 2,
    height: 2,
    colorType: 2,
    pixels,
    filters: [4, 1],
  });
  const prepared = prepareScreenshot(source, {
    acceptedDimensions: [{ width: 2, height: 2 }],
  });
  assert.equal(prepared.report.action, "opaque_rgb_reencoded");
  assert.equal(prepared.report.sourceHadAlphaChannel, false);
  assert.equal(prepared.report.allSourceAlphaSamplesOpaque, null);
  assert.deepEqual(outputColorTypeAndPixels(prepared.output).pixels, pixels);
});

test("unknown text metadata is stripped from an RGB source", () => {
  const pixels = rgbFromRgba(rgbaPixels(2, 2));
  const source = makePng({
    width: 2,
    height: 2,
    colorType: 2,
    pixels,
    ancillary: [
      chunk("tEXt", Buffer.from("Comment\0HIDDEN_PRIVATE_DATA", "latin1")),
    ],
  });
  const prepared = prepareScreenshot(source, {
    acceptedDimensions: [{ width: 2, height: 2 }],
  });
  assert.equal(prepared.report.action, "opaque_rgb_reencoded");
  assert.equal(
    prepared.output.includes(Buffer.from("HIDDEN_PRIVATE_DATA")),
    false,
  );
  assert.deepEqual(outputColorTypeAndPixels(prepared.output).pixels, pixels);
});

test("only an exact canonical sRGB declaration can survive normalization", () => {
  const pixels = rgbFromRgba(rgbaPixels(2, 2));
  const source = makePng({
    width: 2,
    height: 2,
    colorType: 2,
    pixels,
    ancillary: [chunk("sRGB", Buffer.from([0]))],
  });
  const prepared = prepareScreenshot(source, {
    acceptedDimensions: [{ width: 2, height: 2 }],
  });
  assert.deepEqual(chunkTypes(prepared.output), [
    "IHDR",
    "sRGB",
    "IDAT",
    "IEND",
  ]);
  assert.deepEqual(outputColorTypeAndPixels(prepared.output).pixels, pixels);

  assert.throws(
    () =>
      prepareScreenshot(
        makePng({
          width: 2,
          height: 2,
          colorType: 2,
          pixels,
          ancillary: [chunk("sRGB", Buffer.from([1]))],
        }),
        { acceptedDimensions: [{ width: 2, height: 2 }] },
      ),
    /sRGB declaration must be canonical/u,
  );
  assert.throws(
    () =>
      prepareScreenshot(
        makePng({
          width: 2,
          height: 2,
          colorType: 2,
          pixels,
          ancillary: [
            chunk("iCCP", Buffer.from("owner-ahmed-private\0\0payload")),
          ],
        }),
        { acceptedDimensions: [{ width: 2, height: 2 }] },
      ),
    /iCCP color profile requires separate reviewed conversion/u,
  );
  assert.throws(
    () =>
      prepareScreenshot(
        makePng({
          width: 2,
          height: 2,
          colorType: 2,
          pixels,
          ancillary: [chunk("cHRM", Buffer.alloc(32, 0xff))],
        }),
        { acceptedDimensions: [{ width: 2, height: 2 }] },
      ),
    /cHRM color profile requires separate reviewed conversion/u,
  );
});

test("unconsumed bytes after the PNG zlib stream fail closed", () => {
  const pixels = rgbFromRgba(rgbaPixels(2, 2));
  const source = makePng({
    width: 2,
    height: 2,
    colorType: 2,
    pixels,
    idatSuffix: Buffer.from("HIDDEN_PRIVATE_DATA"),
  });
  assert.throws(
    () =>
      prepareScreenshot(source, {
        acceptedDimensions: [{ width: 2, height: 2 }],
      }),
    /image data contains unconsumed bytes/u,
  );
});

test("RGB transparency chunks are rejected", () => {
  const pixels = rgbFromRgba(rgbaPixels(1, 1));
  const source = makePng({
    width: 1,
    height: 1,
    colorType: 2,
    pixels,
    trns: Buffer.alloc(6),
  });
  assert.throws(
    () =>
      prepareScreenshot(source, {
        acceptedDimensions: [{ width: 1, height: 1 }],
      }),
    /transparency chunk/u,
  );
});

test("the file workflow retains raw evidence and never overwrites prepared bytes", (t) => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "cut-screenshot-prep-"),
  );
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const repoRoot = path.join(temporaryRoot, "repo");
  const assets = path.join(repoRoot, "app-store/screenshots/files");
  fs.mkdirSync(assets, { recursive: true });
  const raw = path.join(temporaryRoot, "raw.png");
  const pixels = rgbFromRgba(rgbaPixels(1260, 2736));
  fs.writeFileSync(
    raw,
    makePng({
      width: 1260,
      height: 2736,
      colorType: 2,
      pixels,
    }),
  );

  const report = prepareScreenshotFile({
    inputPath: raw,
    outputName: "01-today-next-action.png",
    repoRoot,
  });
  assert.equal(report.action, "opaque_rgb_reencoded");
  assert.equal(report.outputFile, "01-today-next-action.png");
  assert.equal(fs.existsSync(raw), true);
  assert.throws(
    () =>
      prepareScreenshotFile({
        inputPath: raw,
        outputName: "01-today-next-action.png",
        repoRoot,
      }),
    /refusing to overwrite/u,
  );

  const rawInsideAssets = path.join(assets, "raw");
  fs.mkdirSync(rawInsideAssets);
  const misplacedRaw = path.join(rawInsideAssets, "source.png");
  fs.copyFileSync(raw, misplacedRaw);
  assert.throws(
    () =>
      prepareScreenshotFile({
        inputPath: misplacedRaw,
        outputName: "02-today-weigh-in-complete.png",
        repoRoot,
      }),
    /retain the raw capture outside/u,
  );
});
