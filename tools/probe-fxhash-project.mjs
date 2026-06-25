#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CONFIG = "data/projects/sea-of-sin/scrape-config.json";

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const configPath = path.resolve(rootDir, args.config ?? DEFAULT_CONFIG);
const config = JSON.parse(await readFile(configPath, "utf8"));
const endpoint = config.fxhash?.endpoint ?? "https://api.fxhash.xyz/graphql";
const projectId = config.fxhash?.projectId;

if (!projectId) {
  throw new Error(`Missing fxhash.projectId in ${path.relative(rootDir, configPath)}.`);
}

const candidateQueries = [
  {
    name: "generativeToken",
    query: /* GraphQL */ `
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
    `,
    variables: { id: Number(projectId) },
  },
  {
    name: "generativeTokensById",
    query: /* GraphQL */ `
      query Project($id: Float!) {
        generativeTokens(filters: { id_eq: $id }, take: 1) {
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
    `,
    variables: { id: Number(projectId) },
  },
  {
    name: "generativeTokensBySlug",
    query: /* GraphQL */ `
      query Project($slug: String!) {
        generativeTokens(filters: { slug_eq: $slug }, take: 1) {
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
    `,
    variables: { slug: config.fxhash?.slug ?? config.project?.slug },
  },
];

for (const candidate of candidateQueries) {
  const result = await graphql(endpoint, candidate.query, candidate.variables);
  if (!result.errors?.length) {
    console.log(JSON.stringify({ candidate: candidate.name, data: result.data }, null, 2));
    process.exit(0);
  }

  console.error(`${candidate.name} failed: ${result.errors.map((error) => error.message).join("; ")}`);
}

process.exitCode = 1;

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

  return response.json();
}
