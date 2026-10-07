# shared helpers for editkit/bin/*
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
KIT=$ROOT/editkit
VENV=${EDITKIT_VENV:-$HOME/.cache/editkit/venv}
OE="npx --yes @veedstudio/openedit-cli"
die() { echo "error: $*" >&2; exit 1; }
ensure_venv() {  # also run in the background at session start (.claude/setup-editkit.sh); the lock serialises them
  mkdir -p "$HOME/.cache/editkit"
  (
    flock 9
    [ -x "$VENV/bin/python" ] && "$VENV/bin/python" -c "import sherpa_onnx, soundfile" 2>/dev/null && exit 0
    command -v uv >/dev/null || pip install -q uv >&2
    echo "[editkit] creating python env (sherpa-onnx)..." >&2
    uv venv -q --allow-existing "$VENV" && VIRTUAL_ENV=$VENV uv pip install -q sherpa-onnx soundfile numpy >&2
  ) 9>"$HOME/.cache/editkit/venv.lock"
}
meta() { python3 -c "import json,sys;print(json.load(open('$1'))['$2'])"; }
