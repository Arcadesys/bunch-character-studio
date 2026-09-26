import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const script = new URL("./telegram-stickers.mjs", import.meta.url);

test("prints help", () => {
  const result = spawnSync(process.execPath, [script.pathname, "help"], {encoding:"utf8"});
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Telegram static sticker publisher/);
});

test("validates a static manifest", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sticker-test-"));
  const png = path.join(dir, "yes.png");
  fs.writeFileSync(png, Buffer.from([0x89,0x50,0x4e,0x47]));
  const manifest = path.join(dir, "manifest.json");
  fs.writeFileSync(manifest, JSON.stringify({stickers:[{id:"yes",path:png,emoji:"👍"}]}));
  const result = spawnSync(process.execPath, [script.pathname, "validate", "--input", manifest], {encoding:"utf8"});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validated 1 sticker file/);
});
