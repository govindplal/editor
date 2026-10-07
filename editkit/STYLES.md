# Styles (50)

Pick by id in `edit.json` → `"style": "<id>"`. Tweak any field with `"styleOverrides"` (same shape as `styles.json`),
e.g. brand colours: `{"c": ["#000", "#fff", "#F5EC2A", "#3A1E4D", "#E2231A"]}` = [bg, ink, accent1, accent2, accent3].
Only open `styles.json` to add/change a style; this table is enough to choose.

| # | Style | id | Fonts (display / body) | Accents | Texture fx |
|---|---|---|---|---|---|
| 1 | Swiss style | `swiss` | Inter / Inter | #E30613 #111111 #f2f2f2 | grid-light |
| 2 | Kinetic type | `kinetic` | Anton / Montserrat | #F5EC2A #3A1E4D #E2231A | — |
| 3 | Pop art | `popart` | Bangers / Montserrat | #FF2E63 #00B4F0 #FFE600 | halftone |
| 4 | Flat 2D | `flat2d` | Poppins / Poppins | #FF6B4A #3DC1D3 #FFC93C | — |
| 5 | Clay 3D | `clay3d` | Fredoka / Fredoka | #FF8FAB #7BD3EA #FFD166 | — |
| 6 | Glassmorphism | `glass` | Outfit / Outfit | #7CF6FF #B78CFF #FFFFFF | aurora-soft |
| 7 | Y2K chrome | `y2kchrome` | Syne / Syne | #C0C7D1 #FF4FD8 #4FD8FF | sparkles |
| 8 | Synthwave | `synthwave` | Audiowide / Exo 2 | #FF2A6D #05D9E8 #F9C80E | scanlines, horizon |
| 9 | Risograph | `riso` | Space Grotesk / Space Grotesk | #FF4F7B #1E2B6F #FFD23F | grain, paper-tint |
| 10 | Paper collage | `collage` | Permanent Marker / Courier Prime | #E63946 #457B9D #F4A261 | grain |
| 11 | Glitch | `glitch` | Rubik Glitch / Space Mono | #00FFF0 #FF0055 #FFFFFF | scanlines, noise |
| 12 | Particles | `particles` | Exo 2 / Exo 2 | #7DF9FF #A78BFA #FFFFFF | particles |
| 13 | Neobrutalism | `neobrutal` | Archivo Black / Space Grotesk | #FF6B6B #4ECDC4 #FFE66D | — |
| 14 | Bauhaus | `bauhaus` | Josefin Sans / Josefin Sans | #D7263D #1B4BB5 #F4C20D | shapes-bauhaus |
| 15 | Memphis | `memphis` | Righteous / Poppins | #FF5FA2 #22C1C3 #FFD23F | shapes-memphis |
| 16 | Vaporwave | `vaporwave` | Monoton / VT323 | #FF71CE #01CDFE #B967FF | scanlines, vapor-tint |
| 17 | Pixel art | `pixel` | Press Start 2P / Press Start 2P | #FFD800 #3CB4FF #FF4D4D | pixel-grid |
| 18 | Isometric | `isometric` | Rubik / Rubik | #6366F1 #22D3EE #F59E0B | iso-grid |
| 19 | Low poly | `lowpoly` | Teko / Rubik | #F97316 #14B8A6 #EAB308 | lowpoly |
| 20 | ASCII art | `ascii` | IBM Plex Mono / IBM Plex Mono | #33FF66 #FFFFFF #33FF66 | scanlines, ascii-rain |
| 21 | Frutiger Aero | `aero` | Nunito / Nunito | #2EC4F1 #7ED957 #FFFFFF | bubbles |
| 22 | Op art | `opart` | Bebas Neue / Inter | #000000 #FFFFFF #000000 | op-rings |
| 23 | Cel shading | `cel` | Luckiest Guy / Nunito | #FF7A00 #2E86FF #FFD400 | speedlines-soft |
| 24 | Art Deco | `artdeco` | Limelight / Poiret One | #D4AF37 #1F4E5F #F5E6C8 | deco-frame |
| 25 | Neumorphism | `neumorph` | Nunito / Nunito | #6C63FF #3D4852 #E0E5EC | — |
| 26 | Stained glass | `stainedglass` | Cinzel / Cinzel | #C62828 #1565C0 #F9A825 | light-rays |
| 27 | Film noir | `noir` | Playfair Display / Special Elite | #FFFFFF #8A8A8A #C00000 | grain, vignette, blinds |
| 28 | Aurora gradient | `aurora` | Sora / Sora | #5EEAD4 #A78BFA #F472B6 | aurora |
| 29 | Blueprint | `blueprint` | Architects Daughter / Share Tech Mono | #FFFFFF #9EC9FF #FFE066 | grid-blue |
| 30 | Graffiti | `graffiti` | Sedgwick Ave Display / Permanent Marker | #39FF14 #FF2079 #FFD300 | grain |
| 31 | Split-flap | `splitflap` | Roboto Mono / Roboto Mono | #FFC400 #2A2A2A #F5F5F5 | — |
| 32 | Watercolor | `watercolor` | Caveat / Lora | #E07A5F #81B29A #F2CC8F | paper-tint, grain |
| 33 | Sci-fi HUD | `hud` | Orbitron / Rajdhani | #00E5FF #FF3D00 #00E5FF | hud-frame, scanlines |
| 34 | Origami | `origami` | Quicksand / Quicksand | #EF8354 #4F5D75 #BFC0C0 | — |
| 35 | Manga | `manga` | Bangers / Kosugi Maru | #000000 #FF2D55 #FFFFFF | speedlines-soft, halftone |
| 36 | Psychedelic | `psychedelic` | Shrikhand / Poppins | #FF3CAC #2B86C5 #F9D423 | swirl |
| 37 | Infographic | `infographic` | Barlow Condensed / Barlow | #2563EB #F97316 #10B981 | — |
| 38 | Woodcut | `woodcut` | IM Fell English SC / IM Fell English | #9B2915 #1B1410 #C9A227 | grain, hatch |
| 39 | Neon sign | `neon` | Tilt Neon / Tilt Neon | #FF2BD6 #2BFFF0 #FFE45C | brick-dark |
| 40 | Mid-century | `midcentury` | DM Serif Display / Josefin Sans | #E07A3F #3E8E7E #E9B949 | atomic, grain |
| 41 | Topographic | `topo` | Space Grotesk / Space Grotesk | #D9480F #2F6B4F #C8B88A | contours |
| 42 | Cross-stitch | `crossstitch` | Silkscreen / Silkscreen | #D1495B #00798C #EDAE49 | aida |
| 43 | Skeuomorphism | `skeuo` | Roboto Slab / Roboto | #3A7BD5 #B5651D #FFFFFF | — |
| 44 | Tilt-shift | `tiltshift` | Montserrat / Montserrat | #FFB703 #219EBC #FB8500 | tiltshift |
| 45 | Pencil sketch | `sketch` | Patrick Hand / Patrick Hand | #2B2B2B #E63946 #2B2B2B | paper-tint, grain |
| 46 | Art Nouveau | `nouveau` | Italiana / Cormorant Garamond | #B5838D #6D8B74 #C9A227 | vines |
| 47 | Bento grid | `bento` | Inter / Inter | #A3E635 #60A5FA #F472B6 | — |
| 48 | Grunge | `grunge` | Rubik Dirt / Special Elite | #B23A48 #8C7A5B #EDE6DA | grain, dust, vignette |
| 49 | Surrealism | `surreal` | DM Serif Display / Lora | #3E6990 #E4B363 #C1666B | clouds |
| 50 | Line art | `lineart` | Josefin Sans / Josefin Sans | #111111 #FF5A5F #111111 | line-doodles |

Defaults when the user names no style: talking-head shorts → `kinetic`; YouTube / long-form → `infographic`;
calm or premium → `glass` or `swiss`. Use the user's last style (see `videos/<key>/edit.json`) for a series.
Heavy footage filters (`noir`, `opart`, `manga`, `woodcut`) restyle the picture itself; others only add overlays.
