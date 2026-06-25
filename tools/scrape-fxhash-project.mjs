#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CONFIG = "data/projects/sea-of-sin/scrape-config.json";
const PROJECT_QUERY = /* GraphQL */ `
  query Project($id: Float!) {
    generativeToken(id: $id) {
      id
      slug
      name
      supply
      author {
        id
        name
      }
    }
  }
`;

const TOKENS_QUERY = /* GraphQL */ `
  query Tokens($filters: ObjktFilter, $sort: ObjktsSortInput, $take: Int, $skip: Int) {
    objkts(filters: $filters, sort: $sort, take: $take, skip: $skip) {
      id
      onChainId
      name
      slug
      iteration
      generationHash
      inputBytes
      displayUri
      thumbnailUri
      metadataUri
      metadata
      features
      createdAt
      assignedAt
      gentkContractAddress
      owner {
        id
        name
      }
      minter {
        id
        name
      }
      captureMedia {
        cid
        mimeType
        width
        height
        placeholder
        processed
      }
    }
  }
`;

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const configPath = path.resolve(rootDir, args.config ?? DEFAULT_CONFIG);
const config = JSON.parse(await readFile(configPath, "utf8"));
const projectDir = path.dirname(configPath);
const outPath = path.resolve(projectDir, "tokens.json");
const statePath = path.resolve(projectDir, "scrape-state.json");

const endpoint = config.fxhash?.endpoint ?? "https://api.fxhash.xyz/graphql";
const projectId = Number(config.fxhash?.projectId);
const pageSize = clamp(Number(config.scrape?.pageSize ?? 50), 1, 50);
const delayMs = Math.max(Number(config.scrape?.delayMs ?? 1500), 500);

if (!Number.isFinite(projectId)) {
  throw new Error(`Missing numeric fxhash.projectId in ${path.relative(rootDir, configPath)}.`);
}

await mkdir(projectDir, { recursive: true });

const project = await fetchProject();
const tokens = [];
let requestCount = 1;

for (let skip = 0; ; skip += pageSize) {
  const data = await graphql(endpoint, TOKENS_QUERY, {
    filters: { issuer_in: [projectId], assigned_eq: true },
    sort: { iteration: "ASC" },
    take: pageSize,
    skip,
  });
  requestCount += 1;

  const page = data.objkts ?? [];
  tokens.push(...page.map(normalizeToken));

  await writeState({
    status: "running",
    updatedAt: new Date().toISOString(),
    requestCount,
    fetchedCount: tokens.length,
    skip,
  });

  if (page.length < pageSize) {
    break;
  }

  await sleep(delayMs);
}

tokens.sort((a, b) => a.iteration - b.iteration);

const payload = {
  project: {
    ...config.project,
    fxhash: project,
  },
  scrapedAt: new Date().toISOString(),
  source: {
    service: "fxhash",
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

const expectedCount = Number(config.project?.expectedCount ?? project.supply ?? 0);
const countMessage =
  expectedCount > 0 && expectedCount !== tokens.length
    ? ` fetched ${tokens.length}; expected ${expectedCount}`
    : ` fetched ${tokens.length}`;

console.log(`${project.name} scrape complete:${countMessage}`);
console.log(path.relative(rootDir, outPath));

async function fetchProject() {
  const data = await graphql(endpoint, PROJECT_QUERY, { id: projectId });
  const nextProject = data.generativeToken;

  if (!nextProject) {
    throw new Error(`fxhash project ${projectId} was not found.`);
  }

  return nextProject;
}

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

async function graphql(url, query, variables) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`fxhash request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`fxhash GraphQL error: ${JSON.stringify(payload.errors)}`);
  }

  return payload.data;
}

function normalizeToken(token) {
  const metadata = token.metadata ?? {};

  return {
    id: token.id,
    onChainId: token.onChainId,
    name: token.name,
    slug: token.slug,
    iteration: token.iteration,
    hash: token.generationHash,
    inputBytes: token.inputBytes,
    artifactUri: metadata.artifactUri ?? null,
    displayUri: token.displayUri ?? metadata.displayUri ?? null,
    thumbnailUri: token.thumbnailUri ?? metadata.thumbnailUri ?? null,
    metadataUri: token.metadataUri,
    features: token.features ?? [],
    attributes: metadata.attributes ?? [],
    tags: metadata.tags ?? [],
    authenticityHash: metadata.authenticityHash ?? null,
    createdAt: token.createdAt,
    assignedAt: token.assignedAt,
    gentkContractAddress: token.gentkContractAddress,
    owner: normalizeUser(token.owner),
    minter: normalizeUser(token.minter),
    captureMedia: token.captureMedia
      ? {
          cid: token.captureMedia.cid,
          uri: `ipfs://${token.captureMedia.cid}`,
          mimeType: token.captureMedia.mimeType,
          width: token.captureMedia.width,
          height: token.captureMedia.height,
          placeholder: token.captureMedia.placeholder,
          processed: token.captureMedia.processed,
        }
      : null,
    fxhashUrl: `https://www.fxhash.xyz/gentk/${token.id}`,
    objktUrl: `https://objkt.com/tokens/${token.gentkContractAddress}/${token.onChainId}`,
  };
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    address: user.id,
    name: user.name,
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
