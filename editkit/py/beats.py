"""beats.py <audio|video> [out.json] — tempo, beat grid, downbeats and the drop of a music track (numpy only).

Prints a short summary; writes {"bpm", "beats", "downbeats", "drop", "bars"} so cuts, punches and graphic
hits can sit on the music. Calibrated to the actual onsets (not a fixed grid from t=0)."""
import json, subprocess, sys
import numpy as np

SR, HOP, WIN = 22050, 512, 2048
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else None
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
if len(x) < SR * 2: sys.exit("audio too short")

# spectral-flux onset envelope
n = 1 + (len(x) - WIN) // HOP
frames = np.lib.stride_tricks.as_strided(x, (n, WIN), (x.strides[0] * HOP, x.strides[0]))
mag = np.log1p(10 * np.abs(np.fft.rfft(frames * np.hanning(WIN), axis=1)))
flux = np.maximum(0, np.diff(mag, axis=0)).sum(1)
flux = np.concatenate([[0], flux]); flux -= np.convolve(flux, np.ones(16) / 16, "same"); flux = np.maximum(flux, 0)
fps = SR / HOP

# tempo by autocorrelation, 70–180 BPM, mild preference for ~120
ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
lags = np.arange(len(ac)); bpm_l = 60 * fps / np.maximum(lags, 1)
ok = (bpm_l >= 70) & (bpm_l <= 180)
score = ac * np.exp(-0.5 * (np.log2(np.maximum(bpm_l, 1) / 120) / 0.9) ** 2)
lag = int(lags[ok][np.argmax(score[ok])])
# refine lag with parabolic interpolation
if 1 <= lag < len(ac) - 1:
    a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]; d = (a - c) / (2 * (a - 2 * b + c) + 1e-9); period = lag + d
else: period = lag
bpm = 60 * fps / period

# phase: the offset whose comb hits the most onset energy (kick band weighted: beats sit on kicks, not hats)
low = mag[:, :int(150 * WIN / SR)].sum(1); low = np.concatenate([[0], np.diff(low)]).clip(0)
on = flux / (flux.max() + 1e-9) + 2 * low / (low.max() + 1e-9)
phases = np.arange(int(period))
comb = [on[np.round(np.arange(p, len(flux) - 1, period)).astype(int)].sum() for p in phases]
ph = phases[int(np.argmax(comb))]
grid = np.arange(ph, len(flux), period)
# snap each grid beat to the strongest onset within ±3 hops (~70 ms) so tempo drift doesn't accumulate
bf = [int(g) - 3 + int(np.argmax(on[max(0, int(g) - 3):int(g) + 4])) if on[max(0, int(g) - 3):int(g) + 4].max() > .15 else int(round(g)) for g in grid]
beats = (np.array(bf) * HOP + WIN / 2) / SR   # frame index -> window centre time
# downbeat: of the 4 possible bar phases, the one with the most low-end energy
bi = np.round(beats * fps).astype(int).clip(0, len(low) - 1)
db_off = int(np.argmax([low[bi[k::4]].sum() for k in range(4)]))
downbeats = beats[db_off::4]
# drop: the biggest jump in short-term energy, on a downbeat
rms = np.sqrt((frames ** 2).mean(1)); sec = np.convolve(rms, np.ones(int(fps)) / int(fps), "same")
jump = np.array([sec[min(len(sec) - 1, int((t + 1) * fps))] - sec[max(0, int((t - 1) * fps))] for t in downbeats])
drop = float(downbeats[int(np.argmax(jump))]) if len(downbeats) else None

res = {"bpm": round(float(bpm), 2), "beats": [round(float(t), 3) for t in beats],
       "downbeats": [round(float(t), 3) for t in downbeats], "drop": round(drop, 3) if drop is not None else None,
       "bars": round(float(period * 4 / fps), 3)}
if out: json.dump(res, open(out, "w"))
print(f"[beats] {res['bpm']} BPM · bar {res['bars']} s · {len(beats)} beats · first downbeats "
      f"{res['downbeats'][:6]} · drop ≈ {res['drop']}" + (f" -> {out}" if out else ""))
