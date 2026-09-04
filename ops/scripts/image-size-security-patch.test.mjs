import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const imageSizeEntry = require.resolve("image-size", {
  paths: [path.join(repoRoot, "node_modules/.pnpm/node_modules")],
});

const maliciousPayloads = {
  icnsZeroLengthEntry: Buffer.concat([
    Buffer.from("icns"),
    Buffer.from([0, 0, 0, 16]),
    Buffer.from("ic07"),
    Buffer.from([0, 0, 0, 0]),
  ]),
  jxlZeroLengthBox: Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("JXL "),
    Buffer.from([0, 0, 0, 12]),
    Buffer.from("ftyp"),
    Buffer.from("jxl "),
  ]),
  heifZeroLengthBox: Buffer.concat([
    Buffer.from([0, 0, 0, 16]),
    Buffer.from("ftyp"),
    Buffer.from("heic"),
    Buffer.alloc(4),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("junk"),
  ]),
};

const childScript = `
  const imageSize = require(process.argv[1]);
  const payload = Buffer.from(process.argv[2], "base64");
  try {
    imageSize(payload);
    process.exit(2);
  } catch {
    process.exit(0);
  }
`;

for (const [name, payload] of Object.entries(maliciousPayloads)) {
  test(`patched image-size rejects ${name} without blocking the event loop`, () => {
    const result = spawnSync(
      process.execPath,
      ["-e", childScript, imageSizeEntry, payload.toString("base64")],
      { timeout: 2_000 },
    );

    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.signal, null, `${name} timed out and was killed`);
    assert.equal(result.status, 0, `${name} was accepted or failed unexpectedly`);
  });
}
