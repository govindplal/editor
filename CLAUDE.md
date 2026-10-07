# editor — video editing repo

Every video request (caption, edit, restyle, revise; shorts, podcasts, YouTube) → use the **video-edit** skill
(`.claude/skills/video-edit/SKILL.md`). It drives `editkit/`: scripts do transcription, shot detection, rendering
and audio; per video you only write `runs/<key>/edit.json` (reference: `editkit/SPEC.md`, styles: `editkit/STYLES.md`).

Token rules
- Don't read toolkit source (`editkit/lib`, `editkit/py`), open-edit/hyperframes docs, `words.json` or generated HTML
  unless debugging a failure. Don't re-read files you just wrote.
- One contact sheet and one stills sheet per video; view more only to fix a visible problem.
- Long-running steps (ingest of long videos, full renders) go in the background; wait for the notification, never poll.
- Never open, read, probe or list anything under `videos/` (old edits, .mp4s, sources) unless the user names that
  video for a revision; then use `editkit/bin/restore <key>`. A new video never needs a look at an old one.
- Skip `videos/govind-motion/` entirely (its own CLAUDE.md/AGENTS.md are large) unless asked about that piece.
- Keep replies to the user short: deliverable, what was added, doubts, anything not delivered.

Defaults: original audio is never altered (unless the user asks for cuts); captions on for the whole video;
deliverables are committed under `videos/<key>/` on the session branch.
Session start installs node, ffmpeg, HyperFrames (skills, Chrome, whisper-cpp) and the editkit env automatically
(`.claude/setup-editkit.sh`; set `EDITKIT_HYPERFRAMES=0` to skip HyperFrames). `videos/govind-motion/` is a HyperFrames project.
