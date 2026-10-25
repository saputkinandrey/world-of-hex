#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd "$(dirname "$0")" && pwd)"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONUTF8=1
"$task_root/../anatomy-benchmark-v1.0.0/cache/wsl-densepose/.venv/bin/python" "$task_root/cli.py" "$1"
