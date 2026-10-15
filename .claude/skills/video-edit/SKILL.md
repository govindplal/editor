---
name: video-edit
description: Edit an uploaded video in this repo (brief room first: the user comments on the raw video, edits start only on Done) — captions, zooms/punch-ins, grading, b-roll, animated illustrations, motion graphics — as a HyperFrames composition reviewed in the Brief Room (timestamped notes) before the final render; editkit for quick jobs. Use for any request to caption, edit, style, restyle or revise a video (shorts, podcasts, YouTube, long-form). Cheapest path; prefer it over open-edit/hyperframes docs.
---

# video-edit (editkit)

Everything heavy is scripted. Your job per video: read a short transcript, write one small `edit.json`, check one
stills sheet, render. **Do not** read `editkit/lib/*`, `editkit/py/*`, the open-edit or hyperframes skill docs,
`words.json`, or `index.html` unless something is broken. Never print large files.

Files: `editkit/SPEC.md` (edit.json reference) and `editkit/CRAFT.md` (beats, hook, motion, effect lanes, sound,
critique rubric) — read both once per session before the first edit.json · `editkit/STYLES.md` (50 styles — read
only when choosing; `grep -i <name>` is enough) · `editkit/brands/<name>.md` (creator/brand bible, if one exists).

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
3. **Look**: brand bible if the creator has one (`ls editkit/brands`) → else the style/creator look the user named
   → else a reference they gave (`editkit/bin/reference <file> <name>`, view its sheet once, note 3–5 takeaways)
   → else STYLES.md defaults. Don't ask unless the user wants to choose.
4. **Plan the beats** (CRAFT.md §1): logline, hook on frame 0–2, the 4–10 moments that matter with one
   treatment each, timed to the word that names them; pick the effect lane (§4). Vary from the last video (§6).
5. **Write** `runs/<key>/edit.json` (SPEC.md). Keep it tight; only illustrate what is actually said.
   Sound only if asked (`"sound"`; music beats via `editkit/bin/beats <key>`).
6. **Critique**: `editkit/bin/render <key> --stills t1,t2,...` (8–12 moments: frame ~0.3, every beat, densest
   spots), view `runs/<key>/qa/stills.jpg`, score it on the CRAFT.md §7 rubric, fix the 3 worst problems,
   re-check only those times. Stop at all ≥ 8 or after 2 extra rounds.
7. **Render**: `editkit/bin/render <key>` (background if the video is over ~1 min). It muxes the **original audio
   untouched** (unless `"sound"` is set: then voice at unity + SFX/music under it), makes a ≤29 MB preview if needed, and publishes to `videos/<key>/`
   (edit.json, transcript, meta; the mp4 if <95 MB; the source if <50 MB).
8. **QA the master**: `editkit/bin/qa <key> --cover <hook time>` (duration/size/audio/loudness of the encoded
   file + `qa/master.jpg`, 12 frames — view once; + `videos/<key>/cover.jpg` thumbnail). Fix any PROBLEM line.
9. **Deliver**: SendUserFile the path the render prints after `send-to-user:`. Commit `videos/<key>/` and push.
   Tell the user in a few lines: what was added, any caption lines you were unsure of, anything not delivered.
   If they stated a lasting preference, update/create their `editkit/brands/<name>.md` and merge it to main.

## Default flow: HyperFrames + review room (every new video, unless the user asks for a quick editkit edit)
Read `editkit/HYPERFRAMES.md` once per session and follow it:
ingest → `editkit/bin/asr` for unclear spans → **`editkit/bin/brief <key>` and publish the brief room, then STOP: no edit,
no plan, no render until the user's comments arrive with Done** → `editkit/bin/hfnew <key>` → plan beats (grade, camera, captions for
everything, hero type, **b-roll from the internet whenever someone or something is named**, **animated line-art
illustrations for visual or funny moments**, end CTA) → build + snapshot critique → `editkit/bin/review` and publish to
the **Brief Room** → apply only the user's notes, round by round, until the user presses **Finalize** (a Done with 0 notes is not
approval) → `editkit/bin/hfrender <key>` → commit the master MP4 to `videos/<key>/`. Don't upload it to the chat and don't make a
compressed copy unless asked. Ask the user when a name, photo or caption is doubtful.
The editkit `edit.json` path below stays for quick caption-only jobs or when the user asks for it.

## Revising a past video
Same session: edit `runs/<key>/edit.json`, then `editkit/bin/render <key> --from a --to b` (only that span
re-renders). New session: `editkit/bin/restore <key>` first (needs the source in `videos/<key>/` or a re-upload).
Restyle = change `"style"` (full re-render).

## Other asks
- **Cut / shorten / remove dead air** (only when asked — it changes audio): follow
  `.claude/skills/open-edit/CUT.md` (speech-probe → apply-edl → retime-transcript), then ingest the cut with
  `--no-transcribe` and copy the retimed words into `runs/<key>/words.json`.
- **"Like this reel" / reference given**: `editkit/bin/reference` (step 3); copy pace/type/palette, never the
  subject or their branding.
- **SFX / music / "make it punchy"**: `"sound": {"auto": true}` (+ `"music"` for a bed the user supplied);
  `editkit/bin/beats <key>` → put punches, flashes and big graphics on downbeats, the biggest one on the drop.
- **Talking head → explainer with drawn B-roll + speaker PiP**, or 16:9 → 9:16 reframes: CRAFT.md §9–10.
- **YouTube link**: downloads are usually blocked by the network policy; ask for the file instead of trying.
- **New style / component**: add a line to `editkit/styles.json` (+ row in STYLES.md) or a component in
  `editkit/lib/runtime.js` (`C.<type>`) and document it in SPEC.md, so it's reusable.

## Gotchas
- Session start installs ffmpeg, HyperFrames and the editkit env on its own; nothing to set up by hand.
- Hugging Face is blocked here; transcription models come from GitHub (handled by the scripts, cached in
  `~/.cache/editkit`). First ingest in a session downloads ~0.7 GB (+1.7 GB with whisper): slow, not broken.
- `runs/` is scratch (gitignored); `videos/<key>/` is the durable record.
- Effort: new edits deserve high effort; small revisions and re-renders don't.
- Render speed ≈ 4–5 frames/s; 10 min at 30 fps ≈ 1 h. Background it.
