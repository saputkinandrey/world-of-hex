#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")" && pwd)"
export PYTHONDONTWRITEBYTECODE=1
"$repo_dir/cache/wsl-densepose/.venv/bin/python" "$repo_dir/bench.py" densepose
