#!/usr/bin/env bash
# HyperFrames setup for a Linux cloud environment (runs as root).
set -euo pipefail

# Node.js 22+ and FFmpeg
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v ffmpeg >/dev/null || { apt-get update && apt-get install -y ffmpeg; }

# whisper-cpp (built from source, provides whisper-cli)
if ! command -v whisper-cli >/dev/null; then
  apt-get install -y cmake g++ make git
  W=$(mktemp -d)
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp "$W/src"
  cmake -S "$W/src" -B "$W/src/build" -DCMAKE_BUILD_TYPE=Release
  cmake --build "$W/src/build" -j"$(nproc)" --config Release
  cmake --install "$W/src/build"
  ldconfig
  rm -rf "$W"
fi

# HyperFrames skills + Chrome Headless Shell
cd /tmp
npx --yes hyperframes skills
npx --yes hyperframes browser ensure
npx --yes hyperframes doctor || true
