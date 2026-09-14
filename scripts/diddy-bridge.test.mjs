import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { generatePreparedFurryScene } from "../plugins/furry-image-studio/scripts/diddy-bridge.mjs";

const bridge = "plugins/furry-image-studio/scripts/diddy-bridge.mjs";

function runBridge(manifest, extraEnv = {}, entrypoint = bridge) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entrypoint], {
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
    response.end('{"stored":true,"imageId":"keeper-image","replayed":true}');
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
    assert.deepEqual(JSON.parse(saved.stdout), { stored: true, imageId: "keeper-image", replayed: true, profilePictureChanged: false });
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
  assert.equal(result.stderr, "DIDdy bridge failed.\n");
});

test("scene adapter gives a generator each canonical identity and local reference, then cleans up", async () => {
  const capabilities = ["private-twilight-one-capability", "private-twilight-two-capability", "private-potts-capability"];
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const service = await localServer((request, response) => {
    const requested = new URL(request.url, "http://localhost").searchParams.get("cap");
    assert.ok(capabilities.includes(requested));
    response.writeHead(200, { "content-type": "image/png" });
    response.end(`synthetic-${requested}`);
  });
  let callbackInput;
  const outputDirectory = await mkdtemp(join(tmpdir(), "furry-scene-output-"));
  const outputPath = join(outputDirectory, "fresh-scene.png");
  await writeFile(outputPath, "synthetic-fresh-scene");
  try {
    const result = await generatePreparedFurryScene({
      toolResult: {
        structuredContent: {
          ready: true,
          status: "READY",
          prompt: "Twilight Arcade and Potts Arcade are broing out in a fresh scene.",
          identities: [
            { alterId: "twilight-id", alterName: "Twilight Arcade", referenceImageIds: ["twilight-one", "twilight-two"] },
            { alterId: "potts-id", alterName: "Potts Arcade", referenceImageIds: ["potts-image"] },
          ],
        },
        _meta: {
          referenceMedia: [
            { role: "character_reference", alterId: "potts-id", alterName: "Potts Arcade", imageId: "potts-image", contentType: "image/png", src: `${service.origin}/api/system/images/inline/potts-image?cap=${capabilities[2]}` },
            { role: "character_reference", alterId: "twilight-id", alterName: "Twilight Arcade", imageId: "twilight-one", contentType: "image/png", src: `${service.origin}/api/system/images/inline/twilight-one?cap=${capabilities[0]}` },
            { role: "character_reference", alterId: "twilight-id", alterName: "Twilight Arcade", imageId: "twilight-two", contentType: "image/png", src: `${service.origin}/api/system/images/inline/twilight-two?cap=${capabilities[1]}` },
          ],
        },
      },
      generateScene: async (input) => {
        callbackInput = input;
        assert.equal(await readFile(input.references[0].path, "utf8"), `synthetic-${capabilities[0]}`);
        assert.equal(await readFile(input.references[1].path, "utf8"), `synthetic-${capabilities[1]}`);
        assert.equal(await readFile(input.references[2].path, "utf8"), `synthetic-${capabilities[2]}`);
        return { outputPath, contentType: "image/png", privateUrl: "must-not-escape" };
      },
    });
    assert.deepEqual(result, { outputPath, contentType: "image/png" });
    assert.deepEqual(callbackInput.characters, [
      { alterId: "twilight-id", alterName: "Twilight Arcade", referenceImageIds: ["twilight-one", "twilight-two"] },
      { alterId: "potts-id", alterName: "Potts Arcade", referenceImageIds: ["potts-image"] },
    ]);
    assert.deepEqual(callbackInput.references.map(({ alterId, alterName, imageId, contentType }) => ({ alterId, alterName, imageId, contentType })), [
      { alterId: "twilight-id", alterName: "Twilight Arcade", imageId: "twilight-one", contentType: "image/png" },
      { alterId: "twilight-id", alterName: "Twilight Arcade", imageId: "twilight-two", contentType: "image/png" },
      { alterId: "potts-id", alterName: "Potts Arcade", imageId: "potts-image", contentType: "image/png" },
    ]);
    await assert.rejects(stat(dirname(callbackInput.references[0].path)), { code: "ENOENT" });
    assert.doesNotMatch(JSON.stringify(callbackInput), /private-(twilight|potts)-capability/);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    await rm(outputDirectory, { recursive: true, force: true });
    await service.close();
  }
});

test("scene adapter rejects incomplete metadata and sanitizes callback errors", async () => {
  await assert.rejects(
    generatePreparedFurryScene({
      toolResult: { structuredContent: { ready: true, status: "READY", prompt: "scene", identities: [{ alterId: "a", alterName: "A", referenceImageIds: ["a-image"] }, { alterId: "b", alterName: "B", referenceImageIds: ["b-image"] }] }, _meta: { referenceMedia: [] } },
      generateScene: async () => ({ outputPath: "/tmp/nope.png" }),
    }),
    { message: "Prepared scene is missing a canonical character reference." },
  );
  await assert.rejects(
    generatePreparedFurryScene({ toolResult: {}, generateScene: async () => ({ outputPath: "/tmp/nope.png" }) }),
    { message: "Prepared scene is not ready." },
  );

  const secret = "private-callback-capability";
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const service = await localServer((_, response) => {
    response.writeHead(200, { "content-type": "image/png" });
    response.end("synthetic");
  });
  try {
    await assert.rejects(
      generatePreparedFurryScene({
        toolResult: {
          structuredContent: { ready: true, status: "PREPARED", prompt: "scene", identities: [{ alterId: "a", alterName: "A", referenceImageIds: ["a-image"] }, { alterId: "b", alterName: "B", referenceImageIds: ["b-image"] }] },
          _meta: { referenceMedia: [
            { role: "character_reference", alterId: "a", alterName: "A", imageId: "a-image", contentType: "image/png", src: `${service.origin}/api/system/images/inline/a-image?cap=${secret}` },
            { role: "character_reference", alterId: "b", alterName: "B", imageId: "b-image", contentType: "image/png", src: `${service.origin}/api/system/images/inline/b-image?cap=${secret}` },
          ] },
        },
        generateScene: async () => { throw new Error(secret); },
      }),
      (error) => error.message === "Scene generation callback failed." && !error.message.includes(secret),
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    await service.close();
  }
});

test("CLI scene materialization validates the full prepared packet and never echoes malformed private input", async () => {
  const sentinel = "https://private.invalid/inline?cap=do-not-print";
  const malformed = await runBridge(`{ "action": "materialize-scene", "toolResult": ${sentinel}`);
  assert.notEqual(malformed.code, 0);
  assert.doesNotMatch(`${malformed.stdout}${malformed.stderr}`, /do-not-print/);
  const developmentMalformed = await runBridge(`{ "action": "materialize-scene", "toolResult": ${sentinel}`, {}, "scripts/diddy-bridge.mjs");
  assert.notEqual(developmentMalformed.code, 0);
  assert.doesNotMatch(`${developmentMalformed.stdout}${developmentMalformed.stderr}`, /do-not-print/);

  const missing = await runBridge({ action: "materialize-scene", toolResult: { structuredContent: { ready: true, status: "READY", prompt: "scene", identities: [{ alterId: "a", alterName: "A", referenceImageIds: ["a-image"] }] }, _meta: { referenceMedia: [] } } });
  assert.notEqual(missing.code, 0);
  assert.equal(missing.stdout, "");

  const service = await localServer((request, response) => {
    assert.match(request.url, /cap=scene-capability/);
    response.writeHead(200, { "content-type": "image/png" });
    response.end("scene-reference");
  });
  try {
    const materialized = await runBridge({
      action: "materialize-scene",
      toolResult: {
        structuredContent: {
          ready: true,
          status: "READY",
          prompt: "Twilight Arcade is broing out.",
          identities: [{ alterId: "twilight-id", alterName: "Twilight Arcade", referenceImageIds: ["twilight-image"] }],
        },
        _meta: {
          referenceMedia: [{ role: "character_reference", alterId: "twilight-id", alterName: "Twilight Arcade", imageId: "twilight-image", contentType: "image/png", src: `${service.origin}/api/system/images/inline/twilight-image?cap=scene-capability` }],
        },
      },
    });
    assert.equal(materialized.code, 0, materialized.stderr);
    assert.doesNotMatch(materialized.stdout, /scene-capability/);
    const handoff = JSON.parse(materialized.stdout);
    assert.equal(handoff.prompt, "Twilight Arcade is broing out.");
    assert.deepEqual(handoff.identities, [{ alterId: "twilight-id", alterName: "Twilight Arcade", referenceImageIds: ["twilight-image"] }]);
    assert.deepEqual(handoff.references.map(({ alterId, alterName, imageId, contentType }) => ({ alterId, alterName, imageId, contentType })), [{ alterId: "twilight-id", alterName: "Twilight Arcade", imageId: "twilight-image", contentType: "image/png" }]);
    await runBridge({ action: "cleanup", directory: handoff.directory });
  } finally {
    await service.close();
  }
});

test("scene materialization rejects a valid capability URL wired to another image ID before fetching", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  let requested = false;
  const service = await localServer((_, response) => {
    requested = true;
    response.writeHead(200, { "content-type": "image/png" });
    response.end("wrong-reference");
  });
  try {
    await assert.rejects(
      generatePreparedFurryScene({
        toolResult: {
          structuredContent: { ready: true, status: "READY", prompt: "scene", identities: [{ alterId: "a", alterName: "A", referenceImageIds: ["a-image"] }] },
          _meta: { referenceMedia: [{ role: "character_reference", alterId: "a", alterName: "A", imageId: "a-image", contentType: "image/png", src: `${service.origin}/api/system/images/inline/b-image?cap=valid-but-wrong` }] },
        },
        generateScene: async () => ({ outputPath: "/tmp/not-used.png" }),
      }),
      { message: "Private reference did not match its canonical image ID." },
    );
    assert.equal(requested, false);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    await service.close();
  }
});

test("scene adapter rejects a reference file as output and still cleans up", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const service = await localServer((_, response) => {
    response.writeHead(200, { "content-type": "image/png" });
    response.end("temporary-reference");
  });
  let referencePath;
  try {
    await assert.rejects(
      generatePreparedFurryScene({
        toolResult: {
          structuredContent: { ready: true, status: "READY", prompt: "scene", identities: [{ alterId: "a", alterName: "A", referenceImageIds: ["a-image"] }] },
          _meta: { referenceMedia: [{ role: "character_reference", alterId: "a", alterName: "A", imageId: "a-image", contentType: "image/png", src: `${service.origin}/api/system/images/inline/a-image?cap=temporary-reference` }] },
        },
        generateScene: async ({ references }) => {
          referencePath = references[0].path;
          return { outputPath: referencePath, contentType: "image/png" };
        },
      }),
      { message: "Scene generation output must not be a temporary character reference." },
    );
    await assert.rejects(stat(referencePath), { code: "ENOENT" });
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    await service.close();
  }
});
