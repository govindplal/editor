# edit.json — the whole edit, in one small file

`runs/<key>/edit.json` is the only file you write per video. `editkit/bin/render` builds the page from it.
All times are seconds on the source timeline. Everything is optional except `style`.

```jsonc
{
  "style": "kinetic",                 // id from STYLES.md
  "styleOverrides": {"c": ["#111014","#fff","#F5EC2A","#3A1E4D","#E2231A"]},  // optional, deep-merged
  "end": 31.2,                        // overlays (fx, chrome) stop here, e.g. before a logo outro
  "face": [0.5, 0.3],                 // subject's face centre as frame fractions (zoom origin, burst/marks)
  "titleColor": "#fff",

  "captions": {
    "mode": "highlight",              // highlight | karaoke (past words stay coloured) | reveal (word by word) | plain
    "off": false,
    "pos": 0.585,                     // caption centre, fraction of height (default .585 portrait, .84 landscape)
    "size": 1.0,                      // multiplier
    "maxWords": 4, "maxChars": 22,    // per line (defaults: portrait 4/22, landscape 7/40)
    "replace": {"Flaflu": "Fla-Flu!", "um": ""},   // per-word fixes on the auto transcript ("" drops the word)
    "emph": ["derby"],                // always-emphasised words (numbers are automatic)
    "patch": [[6.6, 7.55, "*Renowned?*"], [25.0, 26.3, "*Fla-Flu!* *Fla-Flu!*"]],
                                      // replace everything spoken in [s,e] with this text; *word* = emphasis.
                                      // Timing: matched to transcript words, the rest interpolated.
                                      // Use for mistranscriptions and for translating non-English speech.
    "lines": [[0.3, 3.4, "..."]]      // instead of auto: fully manual caption lines (same syntax as patch)
  },

  "camera": {                         // footage moves; auto per-shot push/pull is on by default
    "auto": true, "push": 0.08,       // push amount per shot (default .08 portrait, .045 landscape)
    "keys":  [[t0, t1, s0, s1]],      // explicit zoom from scale s0 to s1 over [t0,t1] (overrides auto)
    "punch": [[t, 1.25, 0.6]],        // quick punch-in to scale x1.25, held 0.6 s, eases back
    "shake": [[t, 16, 0.4]],          // amplitude px, duration
    "flash": [t, ...] | "cuts",       // white flash frames; "cuts" = on every detected cut
    "whip":  [[t, 1]],                // whip-blur transition at t (dir 1 / -1)
    "glitch":[[t, 0.3]]               // RGB-split glitch burst
  },

  "chrome": {"pills": ["Show · EP 02", "Topic"], "progress": true, "pillsAt": 0.1, "pillsUntil": 30.9},

  "graphics": [ {"t": 4.0, "end": 6.6, "type": "vs", "zone": "lower", "scale": 1, ...props} ],

  "sound": {                          // OPT-IN (only when the user asks for SFX/music); omit = audio untouched
    "auto": true,                     // synth SFX on the edit's events, 0.03 s early: title/chapter whoosh,
                                      // stamp/icon/list item pop, punch/shake thump, whip whip, cta click,
                                      // buddy boing, burst/vs crack, count riser, flash whoosh, glitch buzz
    "sfx": [[12.4, "chime", 0.3]],    // extra cues [t, name, vol]: pop tick thump crack whoosh whip riser
                                      // sparkle boing click chime buzz
    "skip": ["flash"],                // silence an auto kind
    "vol": 1.0,                       // scales all SFX
    "music": "bed.mp3",               // file in runs/<key>/ (user-supplied, licensed); looped, faded, ducked under voice
    "musicVol": 0.12, "musicAt": 0    // bed level (≈ -18 dB) and start time
  }
}
```

## Graphics (`type` + props). Common: `t`, `end` (or `dur`, default 2.5), `zone`, `scale`

| type | props | use for |
|---|---|---|
| `title` | `text` (`*word*` = accent), `sub`, `size`, `stagger` | kinetic headline / hook |
| `stamp` | `text`, `rot`, `size` | sticker / reaction word ("WAIT, WHAT?!") |
| `lower` | `name`, `role` | lower third (speaker intro) |
| `icon` | `icon`, `label`, `size` | one pictogram |
| `icons` | `items: ["globe", {"icon":"users","label":"Fans"}]`, `size` | row of pictograms |
| `count` | `to`, `from`, `prefix`, `suffix`, `label`, `dur`, `decimals`, `locale` ("en-IN") | number count-up |
| `vs` | `a`, `b`, `ca`, `cb` (colours) | rivalry / comparison |
| `split` | `a`, `b`, `ca`, `cb`, `ia`, `ib` (icons), `tag` | two sides (Europe / Asia, before / after) |
| `list` | `title`, `items`, `at: [times]` or `gap`, `icon` | points revealed as they're said |
| `quote` | `text`, `by`, `size` | pull quote |
| `bars` | `items: [["A", 180], ...]`, `prefix`, `suffix` | mini bar chart |
| `flag` | `stripes: [colours]`, `vertical`, `emblem` wheel/dot/star, `emblemColor`, `label` | country |
| `buddy` | `kind` ball/blob/bot/star, `face`, `say` | mascot reaction (default zone `corner`) |
| `burst` | `say`, `color`, `r` | shock lines around the face |
| `marks` | `char` "?" / "!" | marks floating around the face |
| `annot` | `shape` circle/box/arrow, `rect: [x,y,w,h]` or `from`/`to` [x,y] fractions, `label`, `labelAt` | point at something in frame |
| `chapter` | `num`, `text`, `size` | section card (long-form) |
| `cta` | `text`, `done` | subscribe button with cursor click |
| `image` | `src` (file in the run folder), `w`, `round` | logo / photo |

**icons**: question exclaim trophy crown pin globe heart star fire bulb check cross clock money chart up down mic ball
warning eye brain rocket users play bell thumb book phone camera home sparkle target lock music plane calendar flag

**buddy faces**: wow shock think happy laugh sad angry cool love wink

**zones**: portrait — `lower` (default) `upper`/`top` `center` `left` `right` `corner` `cornerL` `full`;
landscape — `right` (default) `left` `lower` `upper` `center` `corner` `cornerL` `full`; or `[x, y, w, h]` fractions.
Keep faces clear: portrait faces sit in the top ~45%, so graphics go `lower`; landscape talking heads → `left`/`right`.

## Density that reads well
- Shorts (≤90 s): a graphic or reaction every 2–5 s, punch-ins on punchlines, flashes on 3–6 key cuts, buddy 2–4×.
- Long-form: captions + a graphic every 20–40 s at real beats, `chapter` per section, `lower` for each new speaker,
  `cta` once, gentler camera (`push` .03–.045, few punches).
- Only illustrate what is said. Don't add facts the speakers didn't state.
- Timing, hook, effect lanes, sound and the critique rubric: `editkit/CRAFT.md`.

## Helper scripts
`editkit/bin/reference <file|dir> <name>` pacing + sheet of a reference reel/frames · `editkit/bin/beats <key> [file]`
BPM/beats/downbeats/drop → `runs/<key>/beats.json` (±30 ms, slightly early) · `editkit/bin/qa <key> [--cover t]`
checks the encoded master + 12-frame sheet + cover · `editkit/bin/styleboard <key> <t> [ids|all]` one moment in many styles.
