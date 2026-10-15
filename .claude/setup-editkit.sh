#!/usr/bin/env bash
# Session start: make editkit ready without blocking the session.
# Installs everything this repo needs: node, ffmpeg, HyperFrames (+skills, Chrome, whisper-cpp), editkit python env + models.
# Set EDITKIT_HYPERFRAMES=0 in the environment to skip HyperFrames (saves ~20 skills worth of prompt tokens).
set -uo pipefail
ROOT=${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}
command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y -qq ffmpeg >/dev/null; }
mkdir -p "$HOME/.cache/editkit"
# python env + Parakeet and Whisper model prefetch, in the background (ingest waits on the same lock if it gets there first)
nohup bash -c '
  . "'"$ROOT"'/editkit/bin/_common.sh"
  ensure_venv
  ( flock 8; "$VENV/bin/python" -I -c "import sys; sys.path.insert(0, \"'"$ROOT"'/editkit/py\"); import transcribe; transcribe.ensure(transcribe.PARAKEET)" ) 8>"$HOME/.cache/editkit/models.lock"
  # Whisper large-v3 (~1 GB, needed for non-English speech / --check): fetched now so ingest never waits on it.
  # Containers start empty, so this runs every session; EDITKIT_WHISPER=0 skips it.
  [ "${EDITKIT_WHISPER:-1}" = 0 ] || "$VENV/bin/python" -I -c "import sys; sys.path.insert(0, \"'"$ROOT"'/editkit/py\"); import transcribe; transcribe.ensure(\"sherpa-onnx-whisper-large-v3\")"
' >"$HOME/.cache/editkit/setup.log" 2>&1 &
[ "${EDITKIT_HYPERFRAMES:-1}" = 0 ] || bash "$ROOT/.claude/setup-hyperframes.sh"
echo "editkit: video toolkit ready — use the video-edit skill (.claude/skills/video-edit/SKILL.md)."
