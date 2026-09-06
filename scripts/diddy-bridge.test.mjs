import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

const bridge = "plugins/furry-image-studio/scripts/diddy-bridge.mjs";

function runBridge(manifest, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bridge], {
      env: { ...process.env, NODE_ENV: "test", ...extraEnv },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(`${JSON.stringify(manifest)}\n`);
  });
}

async function localServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

test("installed bridge materializes selected references without emitting capability URLs and cleans up", async () => {
  const capability = "private-reference-capability";
  const png = Buffer.from("synthetic-private-png");
  const service = await localServer((request, response) => {
    assert.equal(request.url, `/api/system/images/inline/reference?cap=${capability}`);
    response.writeHead(200, { "content-type": "image/png" });
    response.end(png);
  });
  try {
    const materialized = await runBridge({
      action: "materialize",
      referenceMedia: [{ role: "character_reference", src: `${service.origin}/api/system/images/inline/reference?cap=${capability}`, contentType: "image/png" }],
    });
    assert.equal(materialized.code, 0, materialized.stderr);
    assert.doesNotMatch(materialized.stdout, new RegExp(capability));
    const handoff = JSON.parse(materialized.stdout);
    assert.equal(await readFile(handoff.paths[0], "utf8"), png.toString("utf8"));

    const cleaned = await runBridge({ action: "cleanup", directory: handoff.directory });
    assert.equal(cleaned.code, 0, cleaned.stderr);
    assert.deepEqual(JSON.parse(cleaned.stdout), { cleaned: true });
    await assert.rejects(stat(handoff.directory), { code: "ENOENT" });
  } finally {
    await service.close();
  }
});

test("installed bridge sends chosen keeper privately and emits only a benign receipt", async () => {
  const capability = "private-keeper-capability";
  let uploaded = Buffer.alloc(0);
  const service = await localServer(async (request, response) => {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "/api/mcp-furry-result-upload");
    assert.equal(request.headers.authorization, `Bearer ${capability}`);
    for await (const chunk of request) uploaded = Buffer.concat([uploaded, chunk]);
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"stored":true}');
  });
  const outputDirectory = await mkdtemp(join(tmpdir(), "furry-output-"));
  const outputPath = join(outputDirectory, "keeper.png");
  await writeFile(outputPath, "synthetic-generated-png");
  try {
    const saved = await runBridge({
      action: "save",
      uploadEndpoint: `${service.origin}/api/mcp-furry-result-upload`,
      uploadCapability: capability,
      alterId: "11111111-1111-4111-8111-111111111111",
      path: outputPath,
      filename: "keeper.png",
      contentType: "image/png",
    });
    assert.equal(saved.code, 0, saved.stderr);
    assert.deepEqual(JSON.parse(saved.stdout), { stored: true, profilePictureChanged: false });
    assert.doesNotMatch(saved.stdout, new RegExp(capability));
    assert.match(uploaded.toString("utf8"), /synthetic-generated-png/);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
    await service.close();
  }
});

test("installed bridge rejects a non-DIDdy keeper destination", async () => {
  const result = await runBridge({
    action: "save",
    uploadEndpoint: "https://example.invalid/api/mcp-furry-result-upload",
    uploadCapability: "private-keeper-capability",
    alterId: "11111111-1111-4111-8111-111111111111",
    path: "/does/not/matter.png",
    filename: "keeper.png",
    contentType: "image/png",
  });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Invalid generated-result upload endpoint/);
});
