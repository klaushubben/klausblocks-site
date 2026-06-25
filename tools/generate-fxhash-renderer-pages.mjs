#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PROJECT = "projects/pure-phase";

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const projectDir = path.resolve(rootDir, args.project ?? DEFAULT_PROJECT);
const tokensPath = path.resolve(projectDir, "tokens.json");
const tokensPayload = JSON.parse(await readFile(tokensPath, "utf8"));
const rendererDir = path.resolve(projectDir, "renderer");
const tokenDir = path.resolve(rendererDir, "tokens");
const projectSlug = path.basename(projectDir);
const rendererPreset = getRendererPreset(projectSlug, tokensPayload.project.fxhash.name);

await mkdir(tokenDir, { recursive: true });

for (const token of tokensPayload.tokens) {
  const filename = `${String(token.iteration).padStart(3, "0")}.html`;
  const html = renderTokenHtml(token);
  await writeFile(path.resolve(tokenDir, filename), html);
}

const manifest = {
  project: tokensPayload.project,
  generatedAt: new Date().toISOString(),
  assets: Object.fromEntries(rendererPreset.assets.map((asset) => [asset.name, asset.path])),
  tokens: tokensPayload.tokens.map((token) => ({
    id: token.id,
    iteration: token.iteration,
    hash: token.hash,
    localRenderer: `renderer/tokens/${String(token.iteration).padStart(3, "0")}.html`,
  })),
};

await writeFile(path.resolve(projectDir, "renderers.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${tokensPayload.project.fxhash.name}: generated ${tokensPayload.tokens.length} renderer pages`);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") {
      parsed.project = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function renderTokenHtml(token) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(token.name)} / ${escapeHtml(rendererPreset.title)}</title>
    <script id="fxhash-snippet">
      let alphabet = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
      var fxhash = "${token.hash}";
      let b58dec = (str) => str.split("").reduce((p, c, i) => p + alphabet.indexOf(c) * Math.pow(alphabet.length, str.length - i - 1), 0);
      let fxhashTrunc = fxhash.slice(2);
      let regex = new RegExp(".{" + ((fxhash.length / 4) | 0) + "}", "g");
      let hashes = fxhashTrunc.match(regex).map((h) => b58dec(h));
      let sfc32 = (a, b, c, d) => {
        return () => {
          a |= 0; b |= 0; c |= 0; d |= 0;
          var t = ((a + b) | 0) + d | 0;
          d = d + 1 | 0;
          a = b ^ (b >>> 9);
          b = c + (c << 3) | 0;
          c = (c << 21) | (c >>> 11);
          c = c + t | 0;
          return (t >>> 0) / 4294967296;
        };
      };
      var fxrand = sfc32(...hashes);
    </script>
    <link rel="stylesheet" href="../assets/style.css" />
    ${rendererPreset.headScripts.map((scriptPath) => `<script src="${scriptPath}"></script>`).join("\n    ")}
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    ${rendererPreset.bodyHtml}
    <script defer src="../assets/bundle.js"></script>
  </body>
</html>
`;
}

function getRendererPreset(projectSlug, fallbackTitle) {
  if (projectSlug === "sea-of-sin") {
    return {
      title: "Sea of Sin",
      assets: [
        { name: "bundle", path: "assets/bundle.js" },
        { name: "style", path: "assets/style.css" },
        { name: "p5", path: "assets/p5.min.js" },
      ],
      headScripts: ["../assets/p5.min.js"],
      bodyHtml: '<div id="seaofsin"></div>',
    };
  }

  return {
    title: fallbackTitle,
    assets: [
      { name: "bundle", path: "assets/bundle.js" },
      { name: "style", path: "assets/style.css" },
    ],
    headScripts: [],
    bodyHtml: "",
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
