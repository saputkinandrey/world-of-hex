#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEX_WIKI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WIKI_DIR="${HEX_WIKI_ROOT}/wiki"
HOST="127.0.0.1"
PORT="4567"

# shellcheck source=./_env.sh
source "${SCRIPT_DIR}/_env.sh"

cd "${HEX_WIKI_ROOT}"
ensure_ruby_bin_path
configure_bundle_path

if [ ! -d "${WIKI_DIR}" ]; then
  echo "[FAIL] wiki directory not found at ${WIKI_DIR}"
  exit 1
fi

BUNDLE_CMD="$(resolve_bundle_cmd)" || {
  echo "[FAIL] bundle not found."
  echo "Run: npm run wiki:setup"
  exit 1
}

if ! "${BUNDLE_CMD}" check >/dev/null 2>&1; then
  echo "[FAIL] bundle dependencies are not installed."
  echo "Run: npm run wiki:setup"
  exit 1
fi

echo "Hex Wiki read-only mode:"
echo "http://${HOST}:${PORT}"
echo
echo "To share via ngrok, run:"
echo "./scripts/start_ngrok.sh"
echo

exec "${BUNDLE_CMD}" exec gollum "${WIKI_DIR}" --host "${HOST}" --port "${PORT}" --h1-title --no-edit
