#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEX_WIKI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WIKI_DIR="${HEX_WIKI_ROOT}/wiki"

# shellcheck source=./_env.sh
source "${SCRIPT_DIR}/_env.sh"

cd "${HEX_WIKI_ROOT}"

echo "Setting up Hex Wiki environment in WSL..."

if ! command -v apt-get >/dev/null 2>&1; then
  echo "[FAIL] apt-get not found. This script is intended for WSL Ubuntu."
  exit 1
fi

APT_PACKAGES=(
  ruby-full \
  build-essential \
  git \
  cmake \
  pkg-config \
  libgit2-dev \
  libjitterentropy3-dev \
  libssl-dev \
  libyaml-dev \
  libxml2-dev \
  libxslt1-dev \
  libzstd-dev \
  zlib1g-dev
)

MISSING_APT_PACKAGES=()
for package_name in "${APT_PACKAGES[@]}"; do
  if ! dpkg-query -W -f='${Status}' "${package_name}" 2>/dev/null | grep -q "install ok installed"; then
    MISSING_APT_PACKAGES+=("${package_name}")
  fi
done

if [ "${#MISSING_APT_PACKAGES[@]}" -gt 0 ]; then
  echo "Installing missing apt packages: ${MISSING_APT_PACKAGES[*]}"
  sudo apt-get update
  sudo apt-get install -y "${MISSING_APT_PACKAGES[@]}"
else
  echo "All required apt packages are already installed. Skipping sudo apt-get."
fi

ensure_ruby_bin_path

if ! resolve_bundle_cmd >/dev/null; then
  echo "Installing Bundler into the user gem path..."
  gem install --user-install bundler
  ensure_ruby_bin_path
fi

BUNDLE_CMD="$(resolve_bundle_cmd)" || {
  echo "[FAIL] bundle executable not found after installation."
  echo "Expected user gem bin on PATH, for example:"
  echo "  export PATH=\"\$(ruby -r rubygems -e 'print File.join(Gem.user_dir, \\\"bin\\\")'):\$PATH\""
  exit 1
}

configure_bundle_path

# Drop any previous NTFS-local vendor path config; it breaks Bundler on /mnt/c.
if [ -f "${HEX_WIKI_ROOT}/.bundle/config" ]; then
  "${BUNDLE_CMD}" config unset --local path >/dev/null 2>&1 || true
fi

if [ -d "${HEX_WIKI_ROOT}/vendor/bundle" ]; then
  echo "Removing broken NTFS vendor/bundle from a previous setup attempt..."
  rm -rf "${HEX_WIKI_ROOT}/vendor/bundle"
fi

echo "Using bundle executable: ${BUNDLE_CMD}"
echo "Installing gems into ${BUNDLE_PATH} (Linux filesystem, no root required)..."
"${BUNDLE_CMD}" install

ensure_wiki_structure() {
  mkdir -p \
    "${WIKI_DIR}/canon/magic" \
    "${WIKI_DIR}/canon/factions" \
    "${WIKI_DIR}/canon/geography" \
    "${WIKI_DIR}/rules/gurps" \
    "${WIKI_DIR}/sources/legacy-confluence" \
    "${WIKI_DIR}/meta" \
    "${WIKI_DIR}/assets/images" \
    "${WIKI_DIR}/assets/maps" \
    "${WIKI_DIR}/assets/pdf"
}

ensure_wiki_structure

if [ ! -d "${WIKI_DIR}/.git" ]; then
  echo "Initializing git repository in wiki/..."
  git -C "${WIKI_DIR}" init -b main
fi

if ! git -C "${WIKI_DIR}" rev-parse --verify HEAD >/dev/null 2>&1; then
  if [ -n "$(find "${WIKI_DIR}" -mindepth 1 -maxdepth 1 ! -name '.git' -print -quit)" ]; then
    echo "Creating initial wiki commit..."
    git -C "${WIKI_DIR}" add .
    GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-Hex Wiki Setup}" \
      GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-hex-wiki@example.local}" \
      GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-Hex Wiki Setup}" \
      GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-hex-wiki@example.local}" \
      git -C "${WIKI_DIR}" commit -m "Initial Hex wiki"
  fi
elif [ -n "$(git -C "${WIKI_DIR}" status --porcelain)" ]; then
  echo "Wiki repository has uncommitted changes. Skipping automatic commit."
fi

echo
echo "Hex Wiki setup completed."
echo "Gems path: ${BUNDLE_PATH}"
echo "Next steps:"
echo "  npm run wiki:check"
echo "  npm run wiki:dev"
