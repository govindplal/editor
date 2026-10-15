# model-router

A Claude Code mod that routes each prompt to a reasoning effort by task type and risk, following the Model Routing Playbook.

## Use

    claude --plugin-dir ./model-router

Works in the Claude Code CLI and the Code tab of the Desktop app. Not in claude.ai chat.

## What it does

- Classifies every prompt with plain rules: quick (low), build (medium), deep (high), risky (xhigh).
- Applies the effort to each request of the main conversation through `turn.step`.
- Bumps effort one level after a failed check (tests, tsc, eslint, pytest...), and a second failure may switch to a bigger model, but only while the context is under 25% of the window (a model switch re-reads the whole context at full price).
- Sends small search/list/summarize subagent jobs to `haiku`. A subagent starts with a fresh context, so there is no prompt cache to lose.
- Prefix a prompt with `!low`, `!medium`, `!high`, `!xhigh` or `!max` to force a level.

## Commands

`/route` status · `/route off` · `/route on` · `/route quiet` · `/route verbose` · `/route stats` (steps and cache-hit rate per route) · `/route reset`

## Permissions

It makes five mods API calls and nothing else: `$.command.register`, `$.session.usage`, `$.store.get`, `$.store.set`, `$.ui.log`. No files, network, processes or model calls. Check with `claude plugin validate ./model-router`.

## Tune it

Edit `hooks/route.js`: the keyword rules, `MODELS`, and `CACHE_SAFE_PERCENT`. Re-test with `claude plugin test`.
