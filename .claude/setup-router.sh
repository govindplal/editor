#!/usr/bin/env bash
# Session start: make sure the model-router plugin (model-router/, listed in .claude-plugin/marketplace.json) is installed.
# Project settings only declare it; a cloud session does not fetch the marketplace by itself.
command -v claude >/dev/null || exit 0
ROOT=${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}
cd "$ROOT" || exit 0
claude plugin list 2>/dev/null | grep -q 'model-router@editor' && exit 0
claude plugin marketplace add govindplal/editor >/dev/null 2>&1 || claude plugin marketplace add "$ROOT" >/dev/null 2>&1
claude plugin install model-router@editor --scope project >/dev/null 2>&1 \
  && echo "model-router: installed (active from the next session start or /reload-plugins)" \
  || echo "model-router: install failed; run: claude plugin install model-router@editor"
exit 0
