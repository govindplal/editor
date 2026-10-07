# Craft — what separates a good edit from the default one

Distilled from the Opus-5.5 motion-video wave (Movez's 12-step course, the PDoom / ClaudeAnimationBase / claude-animation
repos, Hooklab's spec prompt, the awesome-opus-5-5-videos and awesome-ai-motion datasets) and rewritten for **editing
footage a creator already shot**: the performance, voice and story exist; our job is direction, rhythm and dressing.
Read once per session before the first edit.json. "The prompt is 10% of the video, the harness is 90%."

## 1. Plan the beats before writing edit.json (2 minutes, in your head or a scratch note)
Without a plan you get the default edit: centred text, everything fading in, a graphic every N seconds regardless
of what's said. Before writing, answer:
- **Logline**: what is this video in one line, and what's the payoff? Every overlay is checked against it.
- **Hook (0–2 s)**: what the viewer sees on frame 0. Frame 0 is never empty: a `title`/`stamp` of the hook line,
  a punch-in, or captions already up. Shorts live or die here.
- **Beats**: the 4–10 moments that matter (claim, number, turn, punchline, reveal, CTA). Each beat gets **one**
  treatment with an end state the viewer could point at ("₹40 lakh counts up next to her", not "add energy").
  Shorts: a visual payoff every **3–5 s**; long-form: every 20–40 s at real section changes.
- **Timing source = the transcript**: a graphic starts on the *start time of the word that names the thing*,
  not on a stopwatch. Key beat sits mid-graphic, not at its end where the next cut eats it.
- **Escalation**: save the biggest treatment (shake + flash + stamp) for the biggest moment. If everything is
  loud, nothing is.

## 2. Reference ladder (name a look > feed a frame > describe a vibe)
- User named a style or creator look ("like Hormozi", "Ali Abdaal style") → map it to a STYLES.md id +
  `styleOverrides` + density. Naming beats describing.
- User gave a reel/frame/link they like → `editkit/bin/reference <file> <name>`: prints cuts/min, median shot,
  first-cut time and makes one sheet. Take **pace, caption treatment, type, palette, density**; never the
  subject or their branding. Write down 3–5 concrete takeaways ("caption 3 words, yellow keyword, centre",
  "punch-in every ~4 s", "no graphics in first 3 s") and apply them.
- Repeat creator/brand → their bible in `editkit/brands/` (§7). Their own past edits are the best reference.
- Nothing given → STYLES.md defaults, but still vary the graphic mix from the last video (§6).

## 3. Motion rules (all graphics/camera already follow these; apply them when choosing times)
- **Snap, then hold.** A change in 1–3 frames then a hold reads intentional; a 0.5 s ease reads like a slideshow.
- **Stagger** grouped items 0.05–0.14 s (list items, icons) — never all at once, never all in phase.
- **Anticipation and overshoot** belong to playful pieces (stamps, buddy); none on serious type.
- **One thing moves at a time.** A punch-in and a new graphic on the same frame fight; offset by ≥0.3 s or pick one.
- **Camera moves mean something**: push = intensity rising, punch = punchline/emphasis, whip = "meanwhile / next
  point", shake = impact, flash = hard cut on a beat. Don't decorate every cut.
- **A cut must add information.** If a graphic repeats what the caption already says in the same words, drop one.
- Keep overlays out of the face (portrait faces sit in the top ~45%); captions never under a graphic.

## 4. Effect discipline (per video, pick a lane)
- **Premium / calm / founder / finance** → one accent colour, one clean sans, masked reveals, no shake/glitch/RGB
  split/flash spam/neon. Hooklab's banned list: shockwave rings, particle bursts, RGB split, camera shake, lens
  flares, neon glows, grid floors, flashing backgrounds, bouncy easing.
- **Entertainment / reaction / gaming** → stamps, buddy, burst, shake, flashes on beats are all fair game.
- Never mix the two lanes in one video.

## 5. Sound (opt-in — only when the user asks for SFX / music / "make it punchy")
Default stays: original audio untouched. When asked, `"sound": {"auto": true}` in edit.json adds synthesised
SFX on the edit's own events (whoosh on titles, pop on stamps/list items, thump on punches, whip on whips),
~0.03 s *before* each visual (late reads as broken, early reads as synced). Voice stays at unity; SFX sit under it.
- Music bed: user-supplied file in the run folder → `"music": "bed.mp3"` (auto-ducked under speech, faded in/out).
  `editkit/bin/beats <key>` gives BPM, beats, downbeats and the drop → put punches/flashes/graphic hits on
  downbeats, the biggest beat on the drop. A music-only reel: run `beats` on the source itself.
- Licensing: only use music the user owns or provides. Never invent a track source.
- Less is more: one SFX per beat, not per word. `"skip": ["flash"]` silences a kind; `"vol": 0.7` turns all down.

## 6. Anti-sameness ("brief contagion")
Hundreds of identical prompts made hundreds of identical videos. For each new video vary at least two of:
graphic types used, caption mode/position, camera language, accent colour, hook treatment. A series keeps its
style and bible but still varies the beats' treatments.

## 7. Critique loop (look at your own frames — the habit that separates good from "a bit mid")
On the stills sheet score each 1–10, write the **3 worst problems**, fix them, re-check only the fixed moments
(`--stills` with those times). Stop when every score ≥ 8, or after 2 extra rounds (say what's left).
| criterion | 8+ means |
|---|---|
| Hook | frame 0–2 s has something worth stopping for |
| Readability | every caption/graphic legible at phone size, inside safe zones, nothing clipped |
| Face clear | no overlay on eyes/mouth; subject still the star |
| Relevance | every graphic shows something actually said, at the word it's said |
| Rhythm | payoffs every 3–5 s (shorts), no dead stretch, no pile-ups |
| Taste | one lane (§4), one accent, nothing cheap-looking |
After the full render: `editkit/bin/qa <key> --cover <t>` checks the **encoded master** (duration, size, audio,
loudness) and makes a 12-frame sheet of it — view it once before sending; a render that exits 0 proves nothing.

## 8. Facts and honesty
Only illustrate what is said. Numbers in `count`/`bars`/`vs` must be the speaker's numbers — never invent figures,
dates, names or claims. If the transcript is unclear on a number, leave it out and say so in the reply.

## 9. Formats
One timeline, many formats: reframe, never just crop a 16:9 render to 9:16 (faces end up cut, text off-frame).
editkit renders at the source's own aspect; for a 16:9 → 9:16 cut-down, reframe first (hyperframes `media-use`
reframe, or `talking-head-recut` on a 9:16 canvas), then ingest the reframed file. Say which route you used.

## 10. Bigger asks that aren't a plain edit
- "Turn my talking head into an explainer" (speaker in a corner PiP, main view = drawn B-roll of what's said,
  voice/captions/length unchanged) → hyperframes `talking-head-recut` skill.
- Fully generated motion pieces (intro stings, logo reveals, showreels from scratch) → hyperframes
  `motion-graphics` / `general-video`. Bring the result back as an `image`/clip only if editkit can't.
