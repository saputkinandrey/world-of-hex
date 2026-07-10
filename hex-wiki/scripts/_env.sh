#!/usr/bin/env bash

# Shared environment helpers for Hex Wiki scripts.

ensure_ruby_bin_path() {
  if ! command -v ruby >/dev/null 2>&1; then
    return 0
  fi

  local user_bin
  local gem_bin

  user_bin="$(ruby -r rubygems -e 'print File.join(Gem.user_dir, "bin")' 2>/dev/null || true)"
  gem_bin="$(ruby -r rubygems -e 'print Gem.bindir' 2>/dev/null || true)"

  if [ -n "${user_bin}" ] && [ -d "${user_bin}" ]; then
    case ":${PATH}:" in
      *":${user_bin}:"*) ;;
      *) PATH="${user_bin}:${PATH}" ;;
    esac
  fi

  if [ -n "${gem_bin}" ] && [ -d "${gem_bin}" ]; then
    case ":${PATH}:" in
      *":${gem_bin}:"*) ;;
      *) PATH="${gem_bin}:${PATH}" ;;
    esac
  fi

  export PATH
  hash -r 2>/dev/null || true
}

resolve_bundle_cmd() {
  ensure_ruby_bin_path

  if command -v bundle >/dev/null 2>&1; then
    command -v bundle
    return 0
  fi

  return 1
}

# Install gems on the Linux filesystem, not under /mnt/c.
# NTFS mounts are world-writable and break Bundler security checks / native builds.
hex_wiki_gem_home() {
  local cache_root="${XDG_CACHE_HOME:-${HOME}/.cache}"
  printf '%s\n' "${cache_root}/hex-wiki/bundle"
}

configure_bundle_path() {
  local gem_home
  gem_home="$(hex_wiki_gem_home)"
  mkdir -p "${gem_home}"
  chmod 755 "${gem_home}" 2>/dev/null || true

  # Bundler env vars (do not reuse these names for shell command paths).
  export BUNDLE_PATH="${gem_home}"
  export BUNDLE_BIN="${gem_home}/bin"
}
