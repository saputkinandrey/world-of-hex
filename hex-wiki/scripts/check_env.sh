#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEX_WIKI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WIKI_DIR="${HEX_WIKI_ROOT}/wiki"

# shellcheck source=./_env.sh
source "${SCRIPT_DIR}/_env.sh"

cd "${HEX_WIKI_ROOT}"
ensure_ruby_bin_path
configure_bundle_path

WARNINGS=0

print_ok() {
  echo "[OK] $1"
}

print_warn() {
  echo "[WARN] $1"
  WARNINGS=$((WARNINGS + 1))
}

print_fail() {
  echo "[FAIL] $1"
}

if command -v ruby >/dev/null 2>&1; then
  print_ok "ruby found: $(ruby --version)"
else
  print_fail "ruby not found"
fi

if command -v git >/dev/null 2>&1; then
  print_ok "git found: $(git --version)"
else
  print_fail "git not found"
fi

if BUNDLE_CMD="$(resolve_bundle_cmd)"; then
  print_ok "bundle found: $("${BUNDLE_CMD}" --version)"
else
  print_fail "bundle not found"
fi

if [ -d "${WIKI_DIR}" ]; then
  print_ok "wiki directory found"
else
  print_fail "wiki directory not found at ${WIKI_DIR}"
fi

if [ -f "${HEX_WIKI_ROOT}/Gemfile" ]; then
  if BUNDLE_CMD="$(resolve_bundle_cmd)" && "${BUNDLE_CMD}" check >/dev/null 2>&1; then
    if "${BUNDLE_CMD}" exec gollum --version >/dev/null 2>&1; then
      print_ok "gollum available via bundle"
    else
      print_fail "gollum not available via bundle"
      echo "Run: npm run wiki:setup"
    fi
  else
    print_fail "bundle dependencies are not installed"
    echo "Run: npm run wiki:setup"
  fi
else
  print_fail "Gemfile not found in ${HEX_WIKI_ROOT}"
fi

if [ -d "${WIKI_DIR}/.git" ]; then
  print_ok "wiki is a git repository"
else
  print_warn "wiki is not a git repository"
  echo "Run: cd hex-wiki/wiki && git init"
fi

if [ "${WARNINGS}" -gt 0 ]; then
  echo
  echo "Environment check completed with warnings."
  exit 0
fi

echo
echo "Environment check completed successfully."
