#!/usr/bin/env bash
set -euo pipefail

PORT="4567"

echo "WARNING:"
echo "Only share read-only Gollum mode unless you intentionally want remote users to edit the wiki."
echo "Recommended:"
echo "./scripts/start_readonly.sh"
echo "./scripts/start_ngrok.sh"
echo

if ! command -v ngrok >/dev/null 2>&1; then
  echo "[FAIL] ngrok not found."
  echo
  echo "Install ngrok and authenticate it, then run:"
  echo "  ngrok http ${PORT}"
  echo
  echo "Docs: https://ngrok.com/download"
  exit 1
fi

exec ngrok http "${PORT}"
