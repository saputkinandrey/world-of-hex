#!/usr/bin/env bash
set -euo pipefail
cd "/mnt/c/Users/Андрей/Desktop/world-of-hex/hex-wiki/wiki"
git add -A
export GIT_AUTHOR_NAME="Hex Wiki Setup"
export GIT_AUTHOR_EMAIL="hex-wiki@example.local"
export GIT_COMMITTER_NAME="Hex Wiki Setup"
export GIT_COMMITTER_EMAIL="hex-wiki@example.local"
git commit -m "Add Hex Rules and Artifactorika GURPS modules"
git log -1 --oneline
git status --short
