#!/usr/bin/env bash
# One bounded CPU build attempt in the existing WSL2. No apt/system installs.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")" && pwd)"
task_dir="$repo_dir/cache/wsl-densepose"
mkdir -p "$task_dir"
cd "$task_dir"
if [ ! -x uv-x86_64-unknown-linux-gnu/uv ]; then
  curl --fail --location --retry 1 -o uv.tar.gz https://github.com/astral-sh/uv/releases/download/0.5.29/uv-x86_64-unknown-linux-gnu.tar.gz
  tar -xzf uv.tar.gz
fi
uv_bin="$task_dir/uv-x86_64-unknown-linux-gnu/uv"
export UV_CACHE_DIR="$task_dir/cache"
export UV_PYTHON_INSTALL_DIR="$task_dir/python"
export MAX_JOBS=1
export CXXFLAGS=-g0
if [ ! -x .venv/bin/python ]; then
  "$uv_bin" venv --python 3.12.9 .venv
fi
"$uv_bin" pip install --python .venv/bin/python 'torch==2.8.0+cpu' 'torchvision==0.23.0+cpu' --index-url https://download.pytorch.org/whl/cpu
"$uv_bin" pip install --python .venv/bin/python 'setuptools==78.1.0' wheel 'numpy==2.2.6' pillow psutil
if [ ! -d detectron2 ]; then
  revision=b0fe2f0a5bb6496f65246ef35687a386a9f19202
  printf '%s\n' "$revision" > "$repo_dir/densepose/source-revision.txt"
  curl --fail --location -o detectron2.tar.gz "https://codeload.github.com/facebookresearch/detectron2/tar.gz/$revision"
  mkdir detectron2
  tar -xzf detectron2.tar.gz --strip-components=1 -C detectron2
fi
timeout 420 "$uv_bin" pip install --python .venv/bin/python --no-build-isolation ./detectron2
# DensePose's setup.py pins Detectron2 via a Git URL; installing it together
# with the local checkout creates a URL conflict. Reuse the installed checkout.
"$uv_bin" pip install --python .venv/bin/python 'av>=8.0.3' 'opencv-python-headless>=4.5.3.56' 'scipy>=1.5.4'
"$uv_bin" pip install --python .venv/bin/python --no-build-isolation --no-deps ./detectron2/projects/DensePose
"$uv_bin" pip freeze --python .venv/bin/python > "$repo_dir/densepose/requirements-wsl-lock.txt"
.venv/bin/python -c 'import torch,detectron2,densepose; print(torch.__version__,detectron2.__version__,"DENSEPOSE_IMPORT_SUCCESS")'
