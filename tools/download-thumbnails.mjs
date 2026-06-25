#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CONFIG = "data/projects/sea-of-sin/scrape-config.json";

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const configPath = path.resolve(rootDir, args.config ?? DEFAULT_CONFIG);
const config = JSON.parse(await readFile(configPath, "utf8"));
const projectDir = path.dirname(configPath);
const tokensPath = path.resolve(projectDir, "tokens.json");
const thumbsDir = path.resolve(projectDir, "thumbs");
const manifestPath = path.resolve(projectDir, "thumbnails.json");
const tokensPayload = JSON.parse(await readFile(tokensPath, "utf8"));

const gateway = config.scrape?.mediaGateway ?? "https://ipfs.io/ipfs/";
const delayMs = Math.max(Number(config.scrape?.thumbnailDelayMs ?? config.scrape?.delayMs ?? 1500), 250);

await mkdir(thumbsDir, { recursive: true });

const manifest = [];
let downloaded = 0;
let skipped = 0;

for (const token of tokensPayload.tokens) {
  const sourceUri = token.thumbnailUri ?? token.captureMedia?.uri ?? token.displayUri;
  if (!sourceUri) {
    manifest.push({ id: token.id, iteration: token.iteration, status: "missing-source" });
    continue;
  }

  const url = resolveUri(sourceUri, gateway);
  const basename = `${String(token.iteration).padStart(3, "0")}-${token.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const existing = await findExisting(thumbsDir, basename);

  if (existing && !args.force) {
    skipped += 1;
    manifest.push({
      id: token.id,
      iteration: token.iteration,
      sourceUri,
      localPath: path.posix.join("thumbs", existing),
      status: "skipped",
    });
    continue;
  }

  const response = await fetch(url);
  if (!response.ok) {
    manifest.push({
      id: token.id,
      iteration: token.iteration,
      sourceUri,
      url,
      status: "failed",
      error: `${response.status} ${response.statusText}`,
    });
    await sleep(delayMs);
    continue;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const extension = extensionFromContentType(contentType) ?? extensionFromUri(sourceUri) ?? ".bin";
  const filename = `${basename}${extension}`;
  const destination = path.resolve(thumbsDir, filename);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, bytes);
  downloaded += 1;

  manifest.push({
    id: token.id,
    iteration: token.iteration,
    sourceUri,
    url,
    contentType,
    bytes: bytes.length,
    localPath: path.posix.join("thumbs", filename),
    status: "downloaded",
  });

  await sleep(delayMs);
}

const output = {
  project: tokensPayload.project,
  generatedAt: new Date().toISOString(),
  gateway,
  downloaded,
  skipped,
  total: tokensPayload.tokens.length,
  thumbnails: manifest,
};

await writeJsonAtomic(manifestPath, output);
console.log(`${tokensPayload.project.fxhash.name} thumbnails: downloaded ${downloaded}, skipped ${skipped}, total ${tokensPayload.tokens.length}`);
console.log(path.relative(rootDir, manifestPath));

function parseArgs(argv) {
  const parsed = { force: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") {
      parsed.config = argv[index + 1];
      index += 1;
    } else if (arg === "--force") {
      parsed.force = true;
    }
  }

  return parsed;
}

function resolveUri(uri, mediaGateway) {
  if (uri.startsWith("ipfs://")) {
    return `${mediaGateway.replace(/\/?$/, "/")}${uri.slice("ipfs://".length)}`;
  }

  return uri;
}

async function findExisting(directory, basename) {
  try {
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(directory);
    return files.find((file) => file.startsWith(`${basename}.`)) ?? null;
  } catch {
    return null;
  }
}

function extensionFromContentType(contentType) {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const map = new Map([
    ["image/avif", ".avif"],
    ["image/gif", ".gif"],
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/svg+xml", ".svg"],
    ["image/webp", ".webp"],
  ]);

  return map.get(type) ?? null;
}

function extensionFromUri(uri) {
  const cleanUri = uri.split("?")[0];
  const extension = path.extname(cleanUri);
  return extension || null;
}

async function writeJsonAtomic(destination, value) {
  const tmpPath = `${destination}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tmpPath, destination);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
