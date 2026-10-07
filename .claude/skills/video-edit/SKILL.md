---
name: video-edit
description: Edit an uploaded video in this repo — captions, zooms/punch-ins, cuts, flashes, motion graphics, mascots, 50 named styles — using the editkit toolkit. Use for any request to caption, edit, style, restyle or revise a video (shorts, podcasts, YouTube, long-form). Cheapest path; prefer it over open-edit/hyperframes docs.
---

# video-edit (editkit)

Everything heavy is scripted. Your job per video: read a short transcript, write one small `edit.json`, check one
stills sheet, render. **Do not** read `editkit/lib/*`, `editkit/py/*`, the open-edit or hyperframes skill docs,
`words.json`, or `index.html` unless something is broken. Never print large files.

Files: `editkit/SPEC.md` (edit.json reference — read once per session before writing one) ·
`editkit/STYLES.md` (50 styles — read only when choosing a style; `grep -i <name> editkit/STYLES.md` is enough).

## New video
1. **Ingest** (copies source, meta, shot cuts, local transcript, contact sheet):
   `editkit/bin/ingest <upload path> <key> [--lang <code>]`
   - `--lang ml|hi|ta|...` when speech isn't (only) English: adds a Whisper translation line under each segment.
   - English-only and accuracy matters: `--check` (Whisper cross-check). Long videos: add `--wmodel medium`.
   - Over ~3 min: run it with `run_in_background` and wait for the notification. Never poll.
2. **Read** `runs/<key>/transcript.txt` (for long ones, only the parts you need with `sed -n`) and view
   `runs/<key>/sheet.png` once (one still per shot, mids listed in the ingest output).
   Transcript line: `s-e | parakeet text`; `  ~ whisper text` below it. Parakeet has the word timings; where the
   two disagree, or speech is non-English, trust the whisper/meaning and fix it with `captions.replace`/`patch`.
3. **Style**: the one the user named; else STYLES.md defaults. Don't ask unless the user wants to choose.
4. **Write** `runs/<key>/edit.json` (SPEC.md). Keep it tight; only illustrate what is actually said.
5. **Check** once: `editkit/bin/render <key> --stills t1,t2,...` (8–12 moments at graphics/captions), view
   `runs/<key>/qa/stills.jpg`, fix edit.json, re-check only if something was clearly wrong.
6. **Render**: `editkit/bin/render <key>` (background if the video is over ~1 min). It muxes the **original audio
   untouched**, makes a ≤29 MB preview if needed, and publishes to `videos/<key>/`
   (edit.json, transcript, meta; the mp4 if <95 MB; the source if <50 MB).
7. **Deliver**: SendUserFile the path the render prints after `send-to-user:`. Commit `videos/<key>/` and push.
   Tell the user in a few lines: what was added, any caption lines you were unsure of, anything not delivered.

## Revising a past video
Same session: edit `runs/<key>/edit.json`, then `editkit/bin/render <key> --from a --to b` (only that span
re-renders). New session: `editkit/bin/restore <key>` first (needs the source in `videos/<key>/` or a re-upload).
Restyle = change `"style"` (full re-render).

## Other asks
- **Cut / shorten / remove dead air** (only when asked — it changes audio): follow
  `.claude/skills/open-edit/CUT.md` (speech-probe → apply-edl → retime-transcript), then ingest the cut with
  `--no-transcribe` and copy the retimed words into `runs/<key>/words.json`.
- **YouTube link**: downloads are usually blocked by the network policy; ask for the file instead of trying.
- **New style / component**: add a line to `editkit/styles.json` (+ row in STYLES.md) or a component in
  `editkit/lib/runtime.js` (`C.<type>`) and document it in SPEC.md, so it's reusable.

## Gotchas
- Hugging Face is blocked here; transcription models come from GitHub (handled by the scripts, cached in
  `~/.cache/editkit`). First ingest in a session downloads ~0.7 GB (+1.7 GB with whisper): slow, not broken.
- `runs/` is scratch (gitignored); `videos/<key>/` is the durable record.
- Render speed ≈ 4–5 frames/s; 10 min at 30 fps ≈ 1 h. Background it.
