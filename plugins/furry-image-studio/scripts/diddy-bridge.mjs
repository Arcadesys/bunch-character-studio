#!/usr/bin/env node
/**
 * Private local adapter for the DIDdy → Furry Image Studio handoff.
 *
 * The request is deliberately one JSON line on stdin so a host can pass MCP
 * metadata without putting short-lived capability URLs in a prompt, argument,
 * terminal transcript, or stdout. stdout only contains local paths or a
 * benign save receipt.
 */
import { createWriteStream } from "node:fs";
import { mkdtemp, chmod, realpath, rm, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const MAX_BYTES = 5 * 1024 * 1024;
const CONTENT_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function usage() {
  return [
    "Usage: stty -echo; node <plugin-root>/scripts/diddy-bridge.mjs",
    "Reads one programmatic JSON manifest from stdin and never prints capabilities or URLs.",
    "Actions: materialize, materialize-scene, cleanup, save.",
  ].join("\n");
}

function isLocalTest(url) {
  return process.env.NODE_ENV === "test" && url.protocol === "http:" && url.hostname === "127.0.0.1";
}

function requireUrl(value, label) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`Invalid ${label}.`);
  }
}

function isBridgeDirectory(directory) {
  const root = resolve(tmpdir());
  const target = resolve(directory);
  return dirname(target) === root && basename(target).startsWith("diddy-furry-");
}

function safeError(message) {
  return new Error(message);
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw safeError(`Invalid ${label}.`);
  return value;
}

function canonicalReferenceImageIds(identity) {
  const values = Array.isArray(identity?.referenceImageIds)
    ? identity.referenceImageIds
    : [identity?.referenceImageId];
  if (values.length < 1) throw safeError("Prepared scene requires canonical reference image IDs.");
  const imageIds = values.map((value) => requiredString(value, "scene reference image ID"));
  if (new Set(imageIds).size !== imageIds.length) throw safeError("Prepared scene contains duplicate reference image IDs.");
  return imageIds;
}

function preparedScene(toolResult) {
  const structured = toolResult?.structuredContent;
  const referenceMedia = toolResult?._meta?.referenceMedia;
  const prompt = structured?.prompt;
  const identities = structured?.identities;
  if (!structured || toolResult?.isError === true || structured.ready !== true || !["READY", "PREPARED"].includes(structured.status)) {
    throw safeError("Prepared scene is not ready.");
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw safeError("Prepared scene requires a canonical prompt.");
  }
  if (!Array.isArray(identities) || identities.length < 1 || identities.length > 12) {
    throw safeError("Prepared scene requires one to twelve canonical identities.");
  }
  if (!Array.isArray(referenceMedia)) {
    throw safeError("Prepared scene references are unavailable.");
  }

  const characters = identities.map((identity) => ({
    alterId: requiredString(identity?.alterId, "scene alter ID"),
    alterName: requiredString(identity?.alterName, "scene alter name"),
    referenceImageIds: canonicalReferenceImageIds(identity),
  }));
  const expectedIds = new Set(characters.map(({ alterId }) => alterId));
  if (expectedIds.size !== characters.length) throw safeError("Prepared scene contains duplicate alter IDs.");

  const referencesByIdentityAndImage = new Map();
  const expectedReferences = new Map();
  for (const character of characters) {
    for (const imageId of character.referenceImageIds) {
      expectedReferences.set(`${character.alterId}:${imageId}`, character);
    }
  }
  for (const reference of referenceMedia) {
    const alterId = requiredString(reference?.alterId, "reference alter ID");
    const alterName = requiredString(reference?.alterName, "reference alter name");
    const imageId = requiredString(reference?.imageId, "reference image ID");
    const identityKey = `${alterId}:${imageId}`;
    if (reference?.role !== "character_reference" || !expectedIds.has(alterId) || !expectedReferences.has(identityKey)) {
      throw safeError("Prepared scene has an unsupported character reference.");
    }
    if (referencesByIdentityAndImage.has(identityKey)) throw safeError("Prepared scene has duplicate character references.");
    const character = expectedReferences.get(identityKey);
    if (alterName !== character.alterName) throw safeError("Prepared scene reference identity did not match its canonical character.");
    referencesByIdentityAndImage.set(identityKey, {
      role: reference.role,
      alterId,
      alterName,
      imageId,
      contentType: reference.contentType,
      src: reference.src,
    });
  }
  if (referencesByIdentityAndImage.size !== expectedReferences.size) {
    throw safeError("Prepared scene is missing a canonical character reference.");
  }
  return {
    prompt: prompt.trim(),
    characters,
    referenceMedia: characters.flatMap(({ alterId, referenceImageIds }) => referenceImageIds.map((imageId) => referencesByIdentityAndImage.get(`${alterId}:${imageId}`))),
  };
}

async function readOneLine() {
  return new Promise((resolveRequest, reject) => {
    let buffer = "";
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      process.stdin.destroy();
      if (!value.trim()) reject(new Error("Private bridge request is required."));
      else resolveRequest(value.trim());
    };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
      const lineEnd = buffer.indexOf("\n");
      if (lineEnd >= 0) finish(buffer.slice(0, lineEnd));
    });
    process.stdin.once("end", () => finish(buffer));
    process.stdin.once("error", reject);
  });
}

async function copyReference(source, destination) {
  const response = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!response.ok || !response.body) throw new Error("Private reference download failed.");
  const type = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
  if (!CONTENT_TYPES.has(type)) throw new Error("Private reference must be JPEG, PNG, or WebP.");

  let total = 0;
  const output = createWriteStream(destination, { mode: 0o600 });
  try {
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > MAX_BYTES) throw new Error("Private reference exceeds 5 MB.");
      if (!output.write(chunk)) await new Promise((resolveDrain, reject) => {
        output.once("drain", resolveDrain);
        output.once("error", reject);
      });
    }
    await new Promise((resolveClose, reject) => {
      output.once("finish", resolveClose);
      output.once("error", reject);
      output.end();
    });
  } catch (error) {
    output.destroy();
    throw error;
  }
  return { contentType: type, size: total };
}

async function materializeReferences(referenceMedia, publicOrigin, requireCanonicalPath = false) {
  if (!Array.isArray(referenceMedia) || referenceMedia.length < 1 || referenceMedia.length > 12) throw new Error("Choose one to twelve selected private references.");
  // The metadata already contains every secured DIDdy URL. Derive its common
  // origin here rather than requiring a model-visible configuration value.
  const origin = requireUrl(referenceMedia[0]?.src, "private reference URL");
  if (origin.protocol !== "https:" && !isLocalTest(origin)) throw new Error("DIDdy public origin must use HTTPS.");
  if (publicOrigin && requireUrl(publicOrigin, "DIDdy public origin").origin !== origin.origin) throw new Error("Private reference origin did not match its DIDdy handoff.");

  const directory = await mkdtemp(join(tmpdir(), "diddy-furry-"));
  await chmod(directory, 0o700);
  try {
    const references = [];
    for (const [index, reference] of referenceMedia.entries()) {
      if (reference?.role !== "character_reference") throw new Error("Unsupported private reference role.");
      const source = requireUrl(reference.src, "private reference URL");
      if (source.origin !== origin.origin || !source.pathname.startsWith("/api/system/images/inline/") || !source.searchParams.has("cap")) {
        throw new Error("Private reference is not an authorized DIDdy image handoff.");
      }
      if (requireCanonicalPath && source.pathname !== `/api/system/images/inline/${encodeURIComponent(reference.imageId)}`) {
        throw new Error("Private reference did not match its canonical image ID.");
      }
      const extension = CONTENT_TYPES.get(reference.contentType);
      if (!extension) throw new Error("Unsupported private reference content type.");
      const path = join(directory, `reference-${index + 1}${extension}`);
      const copied = await copyReference(source, path);
      if (copied.contentType !== reference.contentType) throw new Error("Private reference content type did not match its handoff.");
      references.push({
        alterId: typeof reference.alterId === "string" ? reference.alterId : undefined,
        alterName: typeof reference.alterName === "string" ? reference.alterName : undefined,
        imageId: typeof reference.imageId === "string" ? reference.imageId : undefined,
        contentType: reference.contentType,
        path,
      });
    }
    return { directory, references };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function materialize(input) {
  const handoff = await materializeReferences(input.referenceMedia, input.publicOrigin);
  process.stdout.write(`${JSON.stringify({
    paths: handoff.references.map(({ path }) => path),
    references: handoff.references,
    directory: handoff.directory,
  })}\n`);
}

async function materializePreparedScene(input) {
  const scene = preparedScene(input.toolResult);
  const handoff = await materializeReferences(scene.referenceMedia, input.toolResult?._meta?.publicOrigin, true);
  process.stdout.write(`${JSON.stringify({
    prompt: scene.prompt,
    identities: scene.characters,
    references: handoff.references,
    directory: handoff.directory,
  })}\n`);
}

/**
 * Run a prepared multi-character scene without ever passing private metadata
 * to the image model. This is deliberately an exported programmatic adapter:
 * a CLI cannot safely serialize an image-generation callback.
 */
export async function generatePreparedFurryScene({ toolResult, generateScene }) {
  if (typeof generateScene !== "function") throw safeError("HOST_ADAPTER_REQUIRED");
  const scene = preparedScene(toolResult);
  let handoff;
  try {
    handoff = await materializeReferences(scene.referenceMedia, toolResult?._meta?.publicOrigin, true);
    const references = handoff.references.map(({ alterId, alterName, imageId, contentType, path }) => ({
      alterId,
      alterName,
      imageId,
      contentType,
      path,
    }));
    let generated;
    try {
      generated = await generateScene({ prompt: scene.prompt, characters: scene.characters, references });
    } catch {
      throw safeError("Scene generation callback failed.");
    }
    const outputPath = generated?.outputPath;
    if (typeof outputPath !== "string" || !isAbsolute(outputPath)) {
      throw safeError("Scene generation did not return a local output path.");
    }
    let outputInfo;
    try {
      outputInfo = await stat(outputPath);
    } catch {
      throw safeError("Scene generation did not return a readable local output file.");
    }
    if (!outputInfo.isFile() || outputInfo.size < 1) {
      throw safeError("Scene generation did not return a readable local output file.");
    }
    const [resolvedOutputPath, resolvedReferenceDirectory] = await Promise.all([
      realpath(outputPath),
      realpath(handoff.directory),
    ]);
    if (resolvedOutputPath === resolvedReferenceDirectory || resolvedOutputPath.startsWith(`${resolvedReferenceDirectory}${sep}`)) {
      throw safeError("Scene generation output must not be a temporary character reference.");
    }
    const contentType = generated.contentType;
    if (contentType !== undefined && !CONTENT_TYPES.has(contentType)) {
      throw safeError("Scene generation returned an unsupported output type.");
    }
    return contentType ? { outputPath, contentType } : { outputPath };
  } finally {
    if (handoff?.directory) await rm(handoff.directory, { recursive: true, force: true });
  }
}

async function save(input) {
  const endpoint = requireUrl(input.uploadEndpoint, "generated-result upload endpoint");
  const configuredOrigin = process.env.DIDDY_PUBLIC_ORIGIN && requireUrl(process.env.DIDDY_PUBLIC_ORIGIN, "configured DIDdy public origin");
  if (
    (endpoint.protocol !== "https:" && !isLocalTest(endpoint))
    || endpoint.pathname !== "/api/mcp-furry-result-upload"
    || (!isLocalTest(endpoint) && (!configuredOrigin || endpoint.origin !== configuredOrigin.origin))
  ) throw new Error("Invalid generated-result upload endpoint.");
  if (!input.uploadCapability || !input.alterId || !input.filename || !CONTENT_TYPES.has(input.contentType)) throw new Error("Invalid private keeper request.");
  const info = await stat(input.path);
  if (!info.isFile() || info.size > MAX_BYTES) throw new Error("Result image must be a file of 5 MB or less.");
  const bytes = await (await import("node:fs/promises")).readFile(input.path);
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: input.contentType }), input.filename);
  form.append("alterId", input.alterId);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${input.uploadCapability}` },
    body: form,
    redirect: "error",
  });
  if (!response.ok) throw new Error("Private gallery save failed.");
  const receipt = await response.json().catch(() => null);
  if (!receipt?.stored || typeof receipt.imageId !== "string") throw new Error("Private gallery save did not return a persisted image ID.");
  process.stdout.write(`${JSON.stringify({ stored: true, imageId: receipt.imageId, replayed: receipt.replayed === true, profilePictureChanged: false })}\n`);
}

export async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const input = JSON.parse(await readOneLine());
  if (input.action === "materialize") return materialize(input);
  if (input.action === "materialize-scene") return materializePreparedScene(input);
  if (input.action === "cleanup" && isBridgeDirectory(input.directory)) {
    await rm(input.directory, { recursive: true, force: true });
    process.stdout.write('{"cleaned":true}\n');
    return;
  }
  if (input.action === "save") return save(input);
  throw new Error("Invalid private bridge request.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(() => {
    process.stderr.write("DIDdy bridge failed.\n");
    process.exitCode = 1;
  });
}
