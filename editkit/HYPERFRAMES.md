# HyperFrames edit + review room: the default way every video is made here

The user first briefs the edit in **one shared room** (an Artifact timeline player): they play the raw upload and
comment on the moments that need work, and **nothing is edited until they press Done**. Afterwards they review every cut
in the same room (the Artifact is named **Brief Room**), leave timestamped notes, and only the cut they **Finalize** is rendered. Commands live in `editkit/bin/`. Start from
`editkit/hf/template.html` (via `hfnew`) and `editkit/hf/snippets/` (stickman gag, b-roll card).

## Flow (per video)
0. **Brief room (before any edit)**: after ingest (step 1) and any `asr` fixes, run `editkit/bin/brief <key> --heading "<Show · Guest · Brief>"`.
   It writes `runs/<key>/brief/index.html` + `assets/` (proxy video in ≤13.5 MB parts, filmstrip, waveform; speech and shot
   cuts from the ingest). Publish exactly like the review room (§5 below: shared URL, `capabilities {"db":{},"comments":{}}`,
   `files` = every printed asset, previous video's assets removed with `null`). Then **stop and wait**: do not plan beats,
   scaffold (`hfnew`) or render. The user plays the video, comments at a timecode or an in/out range (drag on the Comments
   lane, or I / O keys), adds general comments (style, tone, music), and presses **Done**. Their comments arrive as an artifact
   comment headed "Edit brief for <key> ..." and are stored in `notes` with `round == 0` (`ArtifactData query notes where
   key == <key>, round == 0`; range comments carry `end`, general ones `general: true`). Zero comments means they left it
   to you. Then go on with steps 2-4, treating every comment as a requirement (timed to its moment/range, plus the
   usual CRAFT.md quality elsewhere), and publish the first cut as round 1 (step 5). Reply in the brief's thread and resolve it.
   Test locally with `--webm` (headless Chromium can't play H.264).
1. **Ingest**: `editkit/bin/ingest <file> <key> [--lang ml]`. Run it in the background; Whisper is prefetched at
   session start. Read `transcript.txt` and the sheet. Where the speech is mixed-language or unclear, or a line is
   missing, run `editkit/bin/asr <key> 7.0:8.6,16.1:18.2 --lang ml` (short spans; background it). Compare
   `translate` with `transcribe-en`. `transcribe-en` catches names, e.g. "Pullikaran Bijoy Nambiaram" → Bejoy Nambiar.
   Never guess silently: an uncertain caption gets `"unsure": true`, and a stretch you can't caption goes in `checks`.
2. **Scaffold**: `editkit/bin/hfnew <key> --title "<Show · Guest>"`. This creates `runs/<key>/hf/index.html` from
   `editkit/hf/template.html`, which already has the grade, camera, shake, captions, b-roll card and line-art
   classes, the fonts (Bricolage Grotesque / Instrument Serif / Martian Mono) and GSAP.
3. **Plan the beats** (CRAFT.md §1). Write down the logline and the hook, then one treatment per moment, timed to the
   word. Every treatment comes from this list:
   - **Grade** per shot (looks in `edit-data.looks`, snapped on `cuts`): a memory/flashback look for nostalgia, glow
     for laughs and payoffs, neutral on logo/outro cards (`end`).
   - **Camera**: an opening pull-back, punch-ins on punchlines, a double punch with shake on a comic beat, slow
     pushes through long takes. Relax the camera before a graphic that needs room.
   - **Captions** for every spoken line: left-aligned, never centred. Key words go in `*serif accent*` or `^accent^`.
     Use the `seam` position on split screens. Use `plates` (a dark backing) over busy or bright shots.
   - **Hero type**: the line becomes the graphic (`"hero": "<clip id>"`), carrying every spoken word.
   - **B-roll**: whenever someone or something specific is named (a person, film, place, team, product), show it.
     See the B-roll section below.
   - **Animated illustrations**: whenever the story is visual, funny or physical ("they threw me out", "I ran",
     "it crashed"), act it out as a short line-art scene: stickman, door, ball, map pin, clapperboard, dumbbell.
     Start from `editkit/hf/snippets/` and invent new ones in the same style. At most one gag every ~8 s; save the
     biggest for the biggest beat.
   - The end card: a CTA such as "Full episode on YouTube".
4. **Build**: fill `edit-data` and add one `.clip` per graphic with `data-track-name` (Graphics | B-roll) and a
   `data-label`. Run `npx hyperframes lint` (0 errors), then `npx hyperframes snapshot --at t1,t2,...` (8–14 moments).
   Critique against CRAFT.md §7: is any face covered, any caption under a graphic, anything clipped at the edge? Fix
   the worst problems and re-snapshot only those moments.
5. **Review room** (the first thing the user sees; never a rendered MP4):
   - `editkit/bin/review <key> --round N --heading "<Show · Guest · what>"`
   - Publish **to the shared room URL**: `https://claude.ai/artifact/8X495UNS4JvcNDt2dDWfM7`.
     - From a new session: `Artifact read` it first, then `Artifact publish` with `url` = the room,
       `file_path` = `runs/<key>/review/index.html`, `files` = every printed asset, and `capabilities`
       `{"db":{}, "comments":{}}`.
     - Remove the previous video's assets with `null` (list them with `Artifact list scope:"files"`).
     - Same session: republish the same file path.
   - Publishing registers this session's watch, so when the user presses **Done**, their notes arrive as an artifact
     comment ("Review notes for <key>, Round N ..."). Confirm the watch with `ArtifactComments watch`.
   - If the room ever can't be reused (it was deleted or the user wants separate rooms), publish a new artifact and
     update the URL in this file and in CLAUDE.md.
6. **Iterate**: the room is shared, so every watching session is woken by every video's Done. Act only on notes
   headed "Review notes for <your key>"; leave other keys' threads to their sessions (no reply). Once your video's
   master is committed, stop watching the room (`ArtifactComments watch` with `on: false`). Read the notes; `ArtifactData query notes where key == <key>, round == N` has the same list. Change
   **only** what the notes ask for. Rebuild with `--round N+1`, republish, then reply in the comment thread and resolve
   it. A Done with 0 notes is not approval: ask whether to finalize. The loop ends only when the user presses **Finalize** (a
   comment headed "FINALIZE <key> ..."); the room's `review/<key>` doc then has `status == "finalized"`.
7. **Final** (on the Finalize message only): `editkit/bin/hfrender <key>` (background, ~7 min per minute of video). It renders the picture and
   stream-copies the source audio, so the audio stays bit-identical. Check it with
   `ffmpeg -i X -map 0:a -c copy -f md5 -` on the source and on the output, then `editkit/bin/qa <key> --cover <t>`.
   Commit `videos/<key>/` (master MP4 + hf project + source) on the session branch. **Don't upload the MP4 to the
   chat and don't make a compressed copy** unless the user asks (`--share` makes a <30 MiB copy). Tell the user the
   repo path.

## B-roll from the internet
- **Find**: Firecrawl search `"<name> site:commons.wikimedia.org"`. Prefer Wikimedia Commons (CC licences). Read the
  licence and author with Firecrawl scrape (rawHtml) of
  `commons.wikimedia.org/w/api.php?action=query&titles=File:<f>&prop=imageinfo&iiprop=url|size|extmetadata&format=json`.
- **Fetch**: this container can't reach wikimedia.org directly. Firecrawl scrape the `File:` page with
  `formats:["screenshot"]` and viewport 1400×1000; the screenshot URL on storage.googleapis.com *is* downloadable.
  Crop the photo out with ffmpeg (`crop=w:h:x:y,scale=640:-2:flags=lanczos`) into `runs/<key>/hf/assets/broll/`,
  and look at the crop before using it.
- **Treat**: use the `.bcard` duotone print (snippet `broll-card.html`). Every card carries
  `Photo: <author> · <licence>`. Place it so it covers neither the speaker's face nor the captions; check with a
  snapshot at the card's widest moment.
- **Ask the user first** when the identity is ambiguous (common name, ASR unsure), when the only photo is
  politically, brand- or event-loaded (crop to the face, and tell the user), or when no free-licence photo exists.
  Never use a photo you can't credit.

## Gotchas
- The local Playwright Chromium can't play H.264 and cdnjs is blocked here. To test a review page, wrap it, swap in
  a WebM copy and route GSAP to `editkit/lib/gsap.min.js`.
- Don't `pkill -f` with a pattern that also appears in your own command line; it kills your shell.
- The composition `<video>` stays `muted`: the render's audio comes only from `hfrender`'s stream copy.
- Strips that slide in from off-frame should use `x: -1200`, not `xPercent: -110`: the percentage leaves a sliver at
  the frame edge.
