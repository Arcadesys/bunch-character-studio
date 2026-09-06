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
import { mkdtemp, chmod, rm, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

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
    "Actions: materialize, cleanup, save.",
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

async function materialize(input) {
  if (!Array.isArray(input.referenceMedia) || input.referenceMedia.length < 1 || input.referenceMedia.length > 12) throw new Error("Choose one to twelve selected private references.");
  // The metadata already contains every secured DIDdy URL. Derive its common
  // origin here rather than requiring a model-visible configuration value.
  const origin = requireUrl(input.referenceMedia[0]?.src, "private reference URL");
  if (origin.protocol !== "https:" && !isLocalTest(origin)) throw new Error("DIDdy public origin must use HTTPS.");
  if (input.publicOrigin && requireUrl(input.publicOrigin, "DIDdy public origin").origin !== origin.origin) throw new Error("Private reference origin did not match its DIDdy handoff.");

  const directory = await mkdtemp(join(tmpdir(), "diddy-furry-"));
  await chmod(directory, 0o700);
  try {
    const paths = [];
    for (const [index, reference] of input.referenceMedia.entries()) {
      if (reference?.role !== "character_reference") throw new Error("Unsupported private reference role.");
      const source = requireUrl(reference.src, "private reference URL");
      if (source.origin !== origin.origin || !source.pathname.startsWith("/api/system/images/inline/") || !source.searchParams.has("cap")) {
        throw new Error("Private reference is not an authorized DIDdy image handoff.");
      }
      const extension = CONTENT_TYPES.get(reference.contentType);
      if (!extension) throw new Error("Unsupported private reference content type.");
      const path = join(directory, `reference-${index + 1}${extension}`);
      const copied = await copyReference(source, path);
      if (copied.contentType !== reference.contentType) throw new Error("Private reference content type did not match its handoff.");
      paths.push(path);
    }
    process.stdout.write(`${JSON.stringify({ paths, directory })}\n`);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
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
  process.stdout.write('{"stored":true,"profilePictureChanged":false}\n');
}

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const input = JSON.parse(await readOneLine());
  if (input.action === "materialize") return materialize(input);
  if (input.action === "cleanup" && isBridgeDirectory(input.directory)) {
    await rm(input.directory, { recursive: true, force: true });
    process.stdout.write('{"cleaned":true}\n');
    return;
  }
  if (input.action === "save") return save(input);
  throw new Error("Invalid private bridge request.");
}

void main().catch((error) => {
  process.stderr.write(`DIDdy bridge failed: ${error instanceof Error ? error.message : "unknown"}\n`);
  process.exitCode = 1;
});
