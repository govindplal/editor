// sound.mjs — synthesised SFX on the edit's own event timeline (no sample library, nothing to license).
// Synth adapted from buildwithhanif/claude-animation-skill scripts/sound.mjs (MIT, (c) 2026 Hanif).
//
//   node editkit/lib/sound.mjs <run dir> <duration>   -> <run>/out/sfx.wav (48k stereo), prints the cue count
//
// Cues come from edit.json "sound": {"auto": true} derives them from graphics + camera events, "sfx" adds
// explicit [t, name, vol?] cues, "skip": ["flash", ...] silences an event kind, "vol" scales everything.
// Each cue lands ~0.03 s BEFORE its visual: late sound reads as broken, slightly early reads as synced.
import fs from "node:fs";

const SR = 48000;
const R = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647 * 2 - 1; })();
function tone(dur, f) { const n = Math.round(dur * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = f(i / SR, i / n); return o; }
const env = (u, a = .01, r = .9) => Math.min(1, u / a) * Math.pow(1 - u, r * 4);
function bandNoise(dur, fLo, fHi, shape) { let lp = 0, hp = 0, prev = 0; return tone(dur, (t, u) => { const w = R(); const f = fLo + (fHi - fLo) * (shape ? shape(u) : u);
  const a = Math.min(1, 2 * Math.PI * f / SR); lp += a * (w - lp); hp = lp - prev; prev = lp; return hp * 3 * env(u, .05, .6); }); }
export const SFX = {
  pop: (d = .14) => tone(d, (t, u) => Math.sin(2 * Math.PI * (900 - 600 * u) * t) * env(u, .005, 1.2) * .8),
  tick: (d = .03) => tone(d, (t, u) => Math.sin(2 * Math.PI * 2600 * t) * (1 - u) * .6),
  thump: (d = .28) => { let ph = 0; return tone(d, (t) => { ph += 2 * Math.PI * (50 + 90 * Math.exp(-t * 30)) / SR; return Math.sin(ph) * Math.exp(-t * 12) * .9; }); },
  crack: (d = .18) => tone(d, (t) => R() * Math.exp(-t * 40) * .8 + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 25) * .4),
  whoosh: (d = .5) => bandNoise(d, 300, 2400, (u) => Math.sin(u * Math.PI)),
  whip: (d = .3) => bandNoise(d, 800, 5000, (u) => u),
  riser: (d = 1.2) => bandNoise(d, 200, 3000, (u) => u * u),
  sparkle: (d = .9) => tone(d, (t) => [2093, 2637, 3136, 4186].reduce((s, f, k) => s + (t > k * .08 ? Math.sin(2 * Math.PI * f * t) * Math.exp(-(t - k * .08) * 6) : 0), 0) * .22),
  boing: (d = .5) => tone(d, (t, u) => Math.sin(2 * Math.PI * (220 + 60 * Math.sin(t * 40) * (1 - u)) * t) * env(u, .01, .8) * .6),
  click: (d = .05) => tone(d, (t) => (Math.sin(2 * Math.PI * 3400 * t) * .5 + R() * .5) * Math.exp(-t * 180) * .9),
  chime: (d = 1.2) => tone(d, (t) => [1047, 1319, 1568, 2093].reduce((s, f, k) => s + (t > k * .07 ? Math.sin(2 * Math.PI * f * t) * Math.exp(-(t - k * .07) * 3.5) : 0), 0) * .2),
  buzz: (d = .6) => { let ph = 0; return tone(d, (t) => { ph += (215 + 18 * Math.sin(t * 38)) / SR; return (2 * (ph % 1) - 1) * .3 * Math.min(1, t / .08, (d - t) / .2) * (.7 + .3 * Math.sin(t * 90)); }); },
};

// event kind -> [sfx, vol, dur?]. Quiet on purpose: SFX sit under the voice, never on top of it.
const AUTO = {
  title: ["whoosh", .30, .4], stamp: ["pop", .45], lower: ["whoosh", .22, .35], quote: ["whoosh", .22, .4],
  icon: ["pop", .30], icons: ["pop", .26], list: ["pop", .30], count: ["riser", .16], vs: ["crack", .30],
  split: ["whoosh", .25, .35], bars: ["tick", .35], flag: ["whoosh", .22], buddy: ["boing", .30],
  burst: ["crack", .30], marks: ["pop", .26], chapter: ["whoosh", .32, .5],
  cta: ["click", .55], image: ["pop", .28],
  punch: ["thump", .32], whip: ["whip", .30, .3], flash: ["whoosh", .18, .3], glitch: ["buzz", .14, .3], shake: ["thump", .28],
};

export function cues(edit, shots = []) {
  const S = edit.sound || {}, skip = new Set(S.skip || []), out = [];
  const add = (kind, t, k = 0) => { const a = AUTO[kind]; if (!a || !a[1] || skip.has(kind) || !(t >= 0)) return;
    out.push({ t: t - .03, sfx: a[0], vol: a[1], dur: a[2], pitch: .92 + ((k * 37 + Math.round(t * 10)) % 7) * .045 }); };
  if (S.auto) {
    for (const g of edit.graphics || []) {
      if (g.type === "list" && Array.isArray(g.at)) g.at.forEach((t, k) => add("list", t, k));
      else if (g.type === "list" && g.items) g.items.forEach((_, k) => add("list", g.t + k * (g.gap ?? .6), k));
      else if (g.type === "icons" && g.items) g.items.forEach((_, k) => add("icons", g.t + k * .12, k));
      else add(g.type, g.t);
    }
    const c = edit.camera || {};
    for (const p of c.punch || []) add("punch", p[0]);
    for (const p of c.whip || []) add("whip", p[0]);
    for (const p of c.glitch || []) add("glitch", p[0]);
    for (const p of c.shake || []) add("shake", p[0]);
    const fl = c.flash === "cuts" ? shots : (c.flash || []);
    fl.forEach((t, k) => add("flash", typeof t === "number" ? t : t?.t, k));
  }
  for (const [t, sfx, vol] of S.sfx || []) out.push({ t: t - .03, sfx, vol: vol ?? .35 });
  // two cues within 80 ms read as one mushy hit: keep the louder
  out.sort((a, b) => a.t - b.t);
  return out.filter((c, i) => !(out[i + 1] && out[i + 1].t - c.t < .08 && out[i + 1].vol >= c.vol));
}

function writeWav(file, L, Rr) {
  const n = L.length, b = Buffer.alloc(44 + n * 4); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 4, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.round(Math.tanh(L[i]) * 32000), 44 + i * 4); b.writeInt16LE(Math.round(Math.tanh(Rr[i]) * 32000), 46 + i * 4); } fs.writeFileSync(file, b);
}

export function render(list, dur, gain = 1) {
  const n = Math.round(dur * SR), L = new Float32Array(n), Rr = new Float32Array(n);
  for (const c of list) { let s = (SFX[c.sfx] || SFX.pop)(c.dur), v = (c.vol ?? .35) * gain, i0 = Math.round(c.t * SR);
    if (c.pitch && c.pitch !== 1) { const q = new Float32Array(Math.floor(s.length / c.pitch)); for (let i = 0; i < q.length; i++) q[i] = s[Math.floor(i * c.pitch)]; s = q; }
    for (let i = 0; i < s.length && i0 + i < n; i++) if (i0 + i >= 0) { L[i0 + i] += s[i] * v; Rr[i0 + i] += s[i] * v; } }
  return [L, Rr];
}

if (process.argv[1] && process.argv[1].endsWith("sound.mjs")) {
  const [, , run, durS] = process.argv;
  const edit = JSON.parse(fs.readFileSync(`${run}/edit.json`, "utf8"));
  let shots = []; try { shots = JSON.parse(fs.readFileSync(`${run}/shots.json`, "utf8")); } catch {}
  shots = (Array.isArray(shots) ? shots : []).map((s) => (Array.isArray(s) ? s[0] : s)).filter((t) => t > .2);  // [[start,end],...] -> cut times
  const list = cues(edit, shots), [L, Rr] = render(list, parseFloat(durS), edit.sound?.vol ?? 1);
  fs.mkdirSync(`${run}/out`, { recursive: true }); writeWav(`${run}/out/sfx.wav`, L, Rr);
  console.log(list.length);
}
