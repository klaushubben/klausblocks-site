#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
node tools/scrape-fxhash-project.mjs --config data/projects/sea-of-sin/scrape-config.json
