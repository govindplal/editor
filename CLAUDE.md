# editor — video editing repo

Every video request (caption, edit, restyle, revise; shorts, podcasts, YouTube) → use the **video-edit** skill
(`.claude/skills/video-edit/SKILL.md`). Default flow for a new video: **HyperFrames composition + shared review room**
(`editkit/HYPERFRAMES.md`); the quick editkit `edit.json` path (`editkit/SPEC.md`, `CRAFT.md`, `STYLES.md`,
creator bibles in `editkit/brands/`) is for small caption-only jobs or when asked.

How the user works (every video, every session)
- First output is **always the review room**, never an MP4: https://claude.ai/artifact/8X495UNS4JvcNDt2dDWfM7
  (one shared timeline player; republish it for each new video/round, see `editkit/HYPERFRAMES.md` §5). The user plays
  it, types timestamped notes (playback pauses, resumes on send) and presses Done; the notes arrive as an artifact
  comment. Change **only** what the notes ask, republish as the next round, reply in the thread and resolve it.
- A round with 0 notes = approved → render the final master (`editkit/bin/hfrender <key>`, original audio
  stream-copied) and commit it to `videos/<key>/`. Don't upload it to the chat and don't make compressed copies unless
  the user asks.
- Be a senior editor: plan every beat; grade, camera moves, captions for the whole video (never centred, no generic
  fonts or gradients); add **b-roll from the internet** whenever a person/place/thing is named, and **animated
  line-art illustrations** (stickman gags etc.) where the story is visual or funny. Verify with the user whenever a
  name, photo, licence or caption is doubtful; mark unsure captions in the review room.

Token rules
- Don't read toolkit source (`editkit/lib`, `editkit/py`), open-edit/hyperframes docs, `words.json` or generated HTML
  unless debugging a failure. Don't re-read files you just wrote.
- One contact sheet, one stills sheet and one master sheet per video; re-check only the moments you fixed
  (critique loop, max 2 extra rounds).
- Long-running steps (ingest of long videos, full renders) go in the background; wait for the notification, never poll.
- Never open, read, probe or list anything under `videos/` (old edits, .mp4s, sources) unless the user names that
  video for a revision; then use `editkit/bin/restore <key>`. A new video never needs a look at an old one.
- Skip `videos/govind-motion/` entirely (its own CLAUDE.md/AGENTS.md are large) unless asked about that piece.
- Keep replies to the user short: deliverable, what was added, doubts, anything not delivered.

Defaults: original audio is never altered (unless the user asks for cuts, SFX or music); captions on for the whole video;
deliverables are committed under `videos/<key>/` on the session branch.
Session start installs node, ffmpeg, HyperFrames (skills, Chrome, whisper-cpp) and the editkit env automatically
(`.claude/setup-editkit.sh`; set `EDITKIT_HYPERFRAMES=0` to skip HyperFrames, `EDITKIT_HF_SKILLS=0` to skip only the
HyperFrames skill list). The cloud environment's setup script should be `.claude/cloud-setup.sh` (cached snapshot:
transcription models, python env, ffmpeg, Chrome), so sessions don't re-download Whisper. `videos/govind-motion/` is a HyperFrames project.

Branches and global changes
- Each session works only on its own session branch (the one it was given; never reuse another session's branch, and if
  that branch's PR is already merged, restart it from `origin/main`). Never read, check out or compare other branches:
  `main` is the only source of truth.
- Anything that should outlive the session (a new or changed skill, rule, style, graphic component, script, or edit to
  `CLAUDE.md`/`editkit/`/`.claude/`) must be made global before the session ends: commit it, push the session branch,
  open a PR into `main` and merge it. The user has given standing permission for these merges; ask only if the merge
  conflicts or CI fails. Say so in the final reply ("merged to main: ...").
- Finished videos and `videos/<key>/` records stay on the session branch unless the user asks for them on `main`.

