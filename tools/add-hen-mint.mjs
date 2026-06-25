#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));

if (!args.operationPath) {
  throw new Error("Usage: node tools/add-hen-mint.mjs --operation-path /path/to/tzkt-operation.json");
}

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const datasetPath = path.resolve(rootDir, "data/projects/hen/mints.json");
const op = JSON.parse(await readFile(args.operationPath, "utf8"))[0];
const metadataUri = Buffer.from(op.parameter.value.metadata, "hex").toString("utf8");
const metadata = args.metadataPath ? JSON.parse(await readFile(args.metadataPath, "utf8")) : null;

await mkdir(path.dirname(datasetPath), { recursive: true });

const dataset = await readDataset(datasetPath);
const token = {
  platform: "hic et nunc",
  migrationContext: "HeN data later surfaced through OBJKT after hic et nunc went offline.",
  minterContract: op.target.address,
  minterContractAlias: op.target.alias,
  tokenContract: op.storage.objkt,
  henObjktId: op.storage.objkt_id,
  name: metadata?.name ?? null,
  description: metadata?.description ?? null,
  tags: metadata?.tags ?? [],
  creators: metadata?.creators ?? [op.sender.address],
  supply: Number(op.parameter.value.amount),
  royalties: Number(op.parameter.value.royalties),
  mintedAt: op.timestamp,
  operationHash: op.hash,
  operationCounter: op.counter,
  tzktUrl: `https://tzkt.io/${op.hash}/${op.counter}`,
  metadataUri,
  artifactUri: metadata?.artifactUri ?? null,
  thumbnailUri: metadata?.thumbnailUri ?? null,
  formats: metadata?.formats ?? [],
};

const index = dataset.tokens.findIndex((item) => item.operationHash === token.operationHash && item.operationCounter === token.operationCounter);
if (index >= 0) {
  dataset.tokens[index] = token;
} else {
  dataset.tokens.push(token);
}

dataset.tokens.sort((a, b) => a.mintedAt.localeCompare(b.mintedAt));
await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`);

console.log(`${token.henObjktId}: ${token.name ?? metadataUri}`);

async function readDataset(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return {
      project: {
        name: "hic et nunc",
        artist: "klaus",
        chain: "tezos",
        platform: "hic et nunc",
        archiveStatus: "in progress",
        notes: "Original HeN mints archived from TzKT operation data and IPFS metadata. OBJKT later became the practical browsing surface after HeN disappeared.",
      },
      tokens: [],
    };
  }
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--operation-path") {
      parsed.operationPath = argv[index + 1];
      index += 1;
    } else if (arg === "--metadata-path") {
      parsed.metadataPath = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}
