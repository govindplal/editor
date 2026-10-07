#!/usr/bin/env bash
# Paste this into the cloud environment's Setup script (environment menu → Edit → Setup script).
# It runs once, finishes in ~2-3 min, and the environment snapshot caches everything it writes,
# so later sessions start with the transcription models, the python env, ffmpeg and node on disk.
set -euo pipefail
M=$HOME/.cache/editkit/models; V=$HOME/.cache/editkit/venv; mkdir -p "$M"
R=https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models
for n in sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8 sherpa-onnx-whisper-large-v3; do
  ( [ -d "$M/$n" ] || curl -sSLf --retry 3 "$R/$n.tar.bz2" | tar -xj -C "$M" ) &
done
( command -v uv >/dev/null || pip install -q uv; uv venv -q --allow-existing "$V" && VIRTUAL_ENV=$V uv pip install -q sherpa-onnx soundfile numpy ) &
( command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y -qq ffmpeg; } ) &
wait
# HyperFrames headless Chrome for snapshots/renders (skills stay per-session via the repo's SessionStart hook)
command -v node >/dev/null && (cd /tmp && npx --yes hyperframes browser ensure) || true
echo "editkit cloud setup done"
