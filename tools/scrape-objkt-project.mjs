#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CONFIG = "data/projects/sea-of-sin/scrape-config.json";

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const configPath = path.resolve(rootDir, args.config ?? DEFAULT_CONFIG);
const config = JSON.parse(await readFile(configPath, "utf8"));
const projectDir = path.dirname(configPath);
const outPath = path.resolve(projectDir, "tokens.json");
const statePath = path.resolve(projectDir, "scrape-state.json");

const pageSize = clamp(Number(config.scrape?.pageSize ?? 100), 1, 500);
const delayMs = Math.max(Number(config.scrape?.delayMs ?? 1500), 500);
const endpoint = config.objkt?.endpoint ?? "https://data.objkt.com/v3/graphql";

validateConfig(config);
await mkdir(projectDir, { recursive: true });

const tokens = [];
let cursorPk = "0";
let requestCount = 0;

for (;;) {
  const where = buildWhere(config.objkt, cursorPk);
  const data = await graphql(endpoint, TOKEN_QUERY, { where, limit: pageSize });
  requestCount += 1;

  const page = data?.token ?? [];
  tokens.push(...page.map(normalizeToken));

  await writeState({
    status: "running",
    updatedAt: new Date().toISOString(),
    requestCount,
    fetchedCount: tokens.length,
    cursorPk,
  });

  if (page.length < pageSize) {
    break;
  }

  cursorPk = String(page.at(-1).pk);
  await sleep(delayMs);
}

tokens.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));

const payload = {
  project: config.project,
  scrapedAt: new Date().toISOString(),
  source: {
    service: "objkt",
    endpoint,
    pageSize,
    delayMs,
  },
  tokens,
};

await writeJsonAtomic(outPath, payload);
await writeState({
  status: "complete",
  updatedAt: payload.scrapedAt,
  requestCount,
  fetchedCount: tokens.length,
  output: path.relative(rootDir, outPath),
});

const expectedCount = Number(config.project?.expectedCount ?? 0);
const countMessage =
  expectedCount > 0 && expectedCount !== tokens.length
    ? ` fetched ${tokens.length}; expected ${expectedCount}`
    : ` fetched ${tokens.length}`;

console.log(`Sea of Sin scrape complete:${countMessage}`);
console.log(path.relative(rootDir, outPath));

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") {
      parsed.config = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function validateConfig(nextConfig) {
  if (!nextConfig.objkt?.faContract) {
    throw new Error(
      `Missing objkt.faContract in ${path.relative(rootDir, configPath)}. Add the Tezos FA2 contract before running.`,
    );
  }
}

function buildWhere(objktConfig, cursorPkValue) {
  const and = [
    { pk: { _gt: cursorPkValue } },
    { fa_contract: { _eq: objktConfig.faContract } },
  ];

  if (objktConfig.tokenIdMin) {
    and.push({ token_id: { _gte: String(objktConfig.tokenIdMin) } });
  }

  if (objktConfig.tokenIdMax) {
    and.push({ token_id: { _lte: String(objktConfig.tokenIdMax) } });
  }

  if (objktConfig.nameIlike) {
    and.push({ name: { _ilike: objktConfig.nameIlike } });
  }

  return { _and: and };
}

async function graphql(url, query, variables) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`objkt request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`objkt GraphQL error: ${JSON.stringify(payload.errors)}`);
  }

  return payload.data;
}

function normalizeToken(token) {
  return {
    pk: token.pk,
    tokenId: token.token_id,
    name: token.name,
    description: token.description,
    timestamp: token.timestamp,
    faContract: token.fa_contract,
    artifactUri: token.artifact_uri,
    displayUri: token.display_uri,
    thumbnailUri: token.thumbnail_uri,
    metadataUri: token.metadata,
    mime: token.mime,
    supply: token.supply,
    attributes: token.attributes ?? [],
    extra: token.extra ?? null,
    objktUrl: `https://objkt.com/tokens/${token.fa_contract}/${token.token_id}`,
  };
}

async function writeState(state) {
  await writeJsonAtomic(statePath, state);
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const TOKEN_QUERY = /* GraphQL */ `
  query ProjectTokens($where: token_bool_exp!, $limit: Int!) {
    token(where: $where, order_by: { pk: asc }, limit: $limit) {
      pk
      fa_contract
      token_id
      name
      description
      timestamp
      artifact_uri
      display_uri
      thumbnail_uri
      metadata
      mime
      supply
      attributes
      extra
    }
  }
`;
