#!/usr/bin/env bash
# HyperFrames setup for a Linux cloud environment (runs as root). Idempotent; fast when already installed.
set -euo pipefail

# Node.js 22+ and FFmpeg
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v ffmpeg >/dev/null || { apt-get update && apt-get install -y ffmpeg; }

# HyperFrames skills + Chrome Headless Shell (foreground: skills must exist when the session starts)
cd /tmp
# EDITKIT_HF_SKILLS=0 skips the ~20 HyperFrames skills (their descriptions cost prompt tokens every turn);
# the CLI, Chrome and editkit/HYPERFRAMES.md are enough for the repo flow.
[ "${EDITKIT_HF_SKILLS:-1}" = 0 ] || [ -d "$HOME/.claude/skills/hyperframes" ] || npx --yes hyperframes skills
npx --yes hyperframes browser ensure

# whisper-cpp (built from source, provides whisper-cli) — slow, so it builds in the background
if ! command -v whisper-cli >/dev/null; then
  nohup bash -c '
    set -e
    apt-get install -y cmake g++ make git
    W=$(mktemp -d)
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp "$W/src"
    cmake -S "$W/src" -B "$W/src/build" -DCMAKE_BUILD_TYPE=Release
    cmake --build "$W/src/build" -j"$(nproc)" --config Release
    cmake --install "$W/src/build"
    ldconfig
    rm -rf "$W"
  ' >"$HOME/.cache/editkit/whisper-build.log" 2>&1 &
fi
