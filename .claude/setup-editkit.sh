#!/usr/bin/env bash
# Session start: make editkit ready without blocking the session.
# Set EDITKIT_HYPERFRAMES=1 in the environment to also install HyperFrames (adds ~20 skills to every prompt).
set -uo pipefail
ROOT=${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}
command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y -qq ffmpeg >/dev/null; }
mkdir -p "$HOME/.cache/editkit"
# python env + Parakeet model prefetch, in the background (ingest waits on the same lock if it gets there first)
nohup bash -c '
  . "'"$ROOT"'/editkit/bin/_common.sh"
  ensure_venv
  ( flock 8; "$VENV/bin/python" -I -c "import sys; sys.path.insert(0, \"'"$ROOT"'/editkit/py\"); import transcribe; transcribe.ensure(transcribe.PARAKEET)" ) 8>"$HOME/.cache/editkit/models.lock"
' >"$HOME/.cache/editkit/setup.log" 2>&1 &
[ "${EDITKIT_HYPERFRAMES:-0}" = 1 ] && bash "$ROOT/.claude/setup-hyperframes.sh"
echo "editkit: video toolkit ready — use the video-edit skill (.claude/skills/video-edit/SKILL.md)."
