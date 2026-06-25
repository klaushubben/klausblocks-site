#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
node tools/download-thumbnails.mjs --config data/projects/sea-of-sin/scrape-config.json
