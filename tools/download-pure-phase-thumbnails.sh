#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
node tools/download-thumbnails.mjs --config data/projects/pure-phase/scrape-config.json
