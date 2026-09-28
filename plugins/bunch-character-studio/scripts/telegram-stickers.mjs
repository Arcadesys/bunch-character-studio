#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const API_ROOT = "https://api.telegram.org";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const out = { command };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith("--")) fail(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = rest[i + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for --${key}`);
    out[key] = value;
    i += 1;
  }
  return out;
}

function usage() {
  return `Telegram static sticker publisher

Usage:
  node scripts/telegram-stickers.mjs validate --input manifest.json
  node scripts/telegram-stickers.mjs create --user-id 123456789 --name my_pack_by_bot --title "My Pack" --input manifest.json

Environment:
  TELEGRAM_BOT_TOKEN   Bot token created through BotFather. Required for create.

Manifest:
  {"stickers":[{"id":"yes","path":"/abs/yes.png","emoji":"👍"}]}
`;
}

async function loadManifest(file) {
  const raw = await fs.readFile(file, "utf8");
  const manifest = JSON.parse(raw);
  if (!manifest || !Array.isArray(manifest.stickers) || manifest.stickers.length < 1) {
    fail("Manifest must contain a non-empty stickers array.");
  }
  for (const [index, sticker] of manifest.stickers.entries()) {
    if (!sticker?.path || !sticker?.emoji) {
      fail(`Sticker ${index + 1} must include path and emoji.`);
    }
    const stat = await fs.stat(sticker.path).catch(() => null);
    if (!stat?.isFile()) fail(`Sticker file not found: ${sticker.path}`);
    const ext = path.extname(sticker.path).toLowerCase();
    if (![".png", ".webp"].includes(ext)) {
      fail(`Static stickers must be .png or .webp: ${sticker.path}`);
    }
  }
  return manifest;
}

async function telegramJson(token, method, body) {
  const response = await fetch(`${API_ROOT}/bot${token}/${method}`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`${method} failed: ${data.description || "unknown Telegram error"}`);
  }
  return data.result;
}

async function uploadStickerFile(token, userId, stickerPath) {
  const bytes = await fs.readFile(stickerPath);
  const ext = path.extname(stickerPath).toLowerCase();
  const type = ext === ".webp" ? "image/webp" : "image/png";
  const form = new FormData();
  form.set("user_id", String(userId));
  form.set("sticker_format", "static");
  form.set("sticker", new Blob([bytes], {type}), path.basename(stickerPath));

  const response = await fetch(`${API_ROOT}/bot${token}/uploadStickerFile`, {
    method: "POST",
    body: form,
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`uploadStickerFile failed for ${stickerPath}: ${data.description || "unknown Telegram error"}`);
  }
  return data.result.file_id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === "help" || args.command === "--help") {
    console.log(usage());
    return;
  }
  if (!args.input) fail("--input is required.");

  const manifest = await loadManifest(args.input);

  if (args.command === "validate") {
    console.log(`Validated ${manifest.stickers.length} sticker file(s).`);
    return;
  }

  if (args.command !== "create") fail(`Unknown command: ${args.command}`);
  if (!args["user-id"] || !args.name || !args.title) {
    fail("create requires --user-id, --name, --title, and --input.");
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) fail("TELEGRAM_BOT_TOKEN is required in the environment.");

  const inputStickers = [];
  for (const sticker of manifest.stickers) {
    const fileId = await uploadStickerFile(token, args["user-id"], sticker.path);
    inputStickers.push({
      sticker: fileId,
      format: "static",
      emoji_list: [sticker.emoji],
    });
  }

  await telegramJson(token, "createNewStickerSet", {
    user_id: Number(args["user-id"]),
    name: args.name,
    title: args.title,
    stickers: inputStickers,
    sticker_type: "regular",
  });

  console.log(`https://t.me/addstickers/${args.name}`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
