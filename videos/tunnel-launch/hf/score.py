"""Tunnel launch video: original soundtrack, synthesised from scratch on the picture's timeline.
120 BPM (beat = 0.5 s, bar = 2 s), F major. Music + SFX locked to the composition's beats.
usage: python3 score.py out.wav
"""
import sys
import numpy as np

SR = 48000
DUR = 32.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)
VERB = np.zeros(N)  # mono reverb send


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(SR * d)) / SR


def place(sig, t, g=1.0, pan=0.0, verb=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    s = sig[: N - i] * g
    L[i : i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
    R[i : i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414
    if verb:
        VERB[i : i + len(s)] += s * verb


def band(x, lo, hi, soft=0.15):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + np.exp(-(np.log(f + 1) - np.log(lo)) / soft))
    if hi:
        m *= 1 / (1 + np.exp((np.log(f + 1) - np.log(hi)) / soft))
    return np.fft.irfft(X * m, len(x))


def env(t, a=0.003, k=6.0):
    return np.minimum(1, t / a) * np.exp(-t * k)


# ---------- instruments ----------
def marimba(m, d=0.9, bright=1.0):
    f, t = mtof(m), tt(d)
    s = np.sin(2 * np.pi * f * t) * env(t, 0.002, 6.5)
    s += 0.32 * bright * np.sin(2 * np.pi * 3.93 * f * t) * env(t, 0.001, 30)
    s += 0.10 * bright * np.sin(2 * np.pi * 9.2 * f * t) * env(t, 0.0005, 70)
    return s


def bell(m, d=1.6):
    f, t = mtof(m), tt(d)
    s = 0
    for r, a, k in [(1, 1, 3.2), (2.0, 0.45, 5), (2.76, 0.3, 7), (5.4, 0.15, 12)]:
        s = s + a * np.sin(2 * np.pi * f * r * t) * env(t, 0.002, k)
    return s * 0.6


def bass(m, d=0.22):
    f, t = mtof(m), tt(d + 0.06)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    e = np.minimum(1, t / 0.004) * np.where(t < d, np.exp(-t * 3), np.exp(-d * 3) * np.exp(-(t - d) * 60))
    return np.tanh(1.6 * s * e) * 0.8


def pad(ms, d):
    t = tt(d + 0.5)
    s = 0
    for m in ms:
        for c in (-6, 0, 6):
            f = mtof(m) * 2 ** (c / 1200)
            s = s + np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    e = np.minimum(1, t / 0.35) * np.where(t < d, 1, np.exp(-(t - d) * 8))
    return s * e / (len(ms) * 3)


def kick(g=1.0):
    t = tt(0.45)
    f = 44 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env(t, 0.001, 7.5)
    s[: int(0.004 * SR)] += rng.uniform(-0.3, 0.3, int(0.004 * SR))
    return np.tanh(1.4 * s) * g


def clap():
    t = tt(0.28)
    n = band(rng.uniform(-1, 1, len(t)), 900, 3200)
    e = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        e += (t >= o) * np.exp(-np.maximum(0, t - o) * (95 if o < 0.02 else 16))
    return n * e * 0.9


def hat(d=0.06, k=70):
    t = tt(d)
    return band(rng.uniform(-1, 1, len(t)), 7000, None) * env(t, 0.0005, k) * 0.5


def crash(d=2.2):
    t = tt(d)
    return band(rng.uniform(-1, 1, len(t)), 3500, None) * env(t, 0.002, 2.2) * 0.4


def tom(m=45):
    t = tt(0.5)
    f = mtof(m) * (1 + 0.6 * np.exp(-t * 25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.002, 7)


# ---------- sfx ----------
def whoosh(d=0.5, lo=300, hi=5000):
    t = tt(d)
    n = band(rng.uniform(-1, 1, len(t)), lo, hi, 0.3)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2.2
    return n * e * 0.55


def riser(d=1.5):
    t = tt(d)
    lowp = band(rng.uniform(-1, 1, len(t)), 200, 1500, 0.3)
    highp = band(rng.uniform(-1, 1, len(t)), 2500, 9000, 0.3)
    x = t / d
    sw = np.sin(2 * np.pi * np.cumsum(200 + 900 * x**2) / SR) * 0.15
    return (lowp * (1 - x) + highp * x + sw) * x**1.6 * 0.6


def pop(f0=1100, f1=320, d=0.09):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.001, 30) * 0.8


def whoop(f0=380, f1=980, d=0.16):
    t = tt(d)
    f = f0 + (f1 - f0) * (t / d) ** 0.7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.5


def click(f=3200, d=0.012):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) * 0.6 + rng.uniform(-0.4, 0.4, len(t))) * env(t, 0.0003, 380)


def bonk():
    t = tt(0.6)
    thud = np.sin(2 * np.pi * np.cumsum(70 + 200 * np.exp(-t * 28)) / SR) * env(t, 0.001, 11)
    boing = np.sin(2 * np.pi * np.cumsum(260 + 70 * np.sin(2 * np.pi * 13 * t) * np.exp(-t * 3)) / SR) * env(t, 0.004, 5.5)
    hit = band(rng.uniform(-1, 1, len(t)), 500, 3000) * env(t, 0.0005, 60)
    return thud * 0.9 + boing * 0.38 + hit * 0.4


def beep(f=1760, d=0.09):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)) * np.minimum(1, t / 0.003) * np.minimum(1, (d - t) / 0.01) * 0.35


def lock():
    return np.concatenate([click(1800, 0.02), np.zeros(int(0.045 * SR)), click(1200, 0.03)]) * 1.2


def sub(d=0.9):
    t = tt(d)
    return np.sin(2 * np.pi * np.cumsum(36 + 40 * np.exp(-t * 8)) / SR) * env(t, 0.004, 3.5)


# ---------- harmony ----------
CH = {"F": [65, 69, 72], "C": [64, 67, 72], "Dm": [62, 65, 69], "Bb": [62, 65, 70]}
ROOT = {"F": 41, "C": 36, "Dm": 38, "Bb": 34}
PROG = ["F", "C", "Dm", "Bb"]
MEL = {  # one bar of eighths per chord (None = rest)
    "F": [77, None, 72, 74, None, 72, 69, None],
    "C": [76, None, 72, 67, None, 72, 74, 76],
    "Dm": [74, None, 69, 72, None, 74, 77, None],
    "Bb": [74, 72, None, 70, None, 69, 72, None],
}
MEL2 = {
    "F": [81, None, 77, 79, None, 77, 72, 74],
    "C": [79, None, 76, 72, None, 76, 79, None],
    "Dm": [77, None, 74, 77, None, 81, 79, 77],
    "Bb": [79, 77, None, 74, None, 72, 74, None],
}
B = 0.5  # beat


def groove_bar(t0, ch, mel=None, drums=True, bassline=True, light=False, mg=0.34):
    if drums:
        for b in ((0, 2) if light else (0, 1.5, 2)):
            place(kick(), t0 + b * B, 0.95)
        for b in (1, 3):
            place(clap(), t0 + b * B, 0.42, 0.05, 0.25)
        for i in range(8):
            place(hat(), t0 + i * B / 2, 0.16 if i % 2 else 0.09, 0.35)
    if bassline:
        r = ROOT[ch]
        for b, o in ((0, 0), (0.75, 12), (1.5, 0), (2, 7), (3, 0), (3.5, 12)):
            place(bass(r + o + 12), t0 + b * B, 0.5)
    place(pad(CH[ch], 2.0), t0, 0.14, 0, 0.5)
    if mel:
        for i, m in enumerate(mel[ch]):
            if m:
                place(marimba(m), t0 + i * B / 2, mg, 0.25 * (1 if i % 2 else -1), 0.3)


# ---- 0-4 s: hook (sparse; bubble bonks the wall at 2.0) ----
for i, m in enumerate([77, None, 72, 74, None, 72, 69, None]):
    if m:
        place(marimba(m), i * B / 2, 0.3, -0.2, 0.35)
place(pad(CH["F"], 2.0), 0, 0.08, 0, 0.5)
place(kick(0.7), 0)
place(whoop(), 1.47, 0.45, -0.3)
place(bonk(), 1.97, 0.9, 0.35, 0.15)
for t, m in ((2.5, 69), (3.0, 68), (3.5, 67)):  # wah-wah-wah
    place(marimba(m, 1.2, 0.6), t, 0.3, 0.2, 0.4)
place(pad([62, 65, 68], 2.0), 2.0, 0.07, 0, 0.5)
place(click(2400), 2.97, 0.35, 0.4)
place(click(2400), 3.47, 0.35, 0.4)

# ---- 4-8 s: reveal (tunnel loops draw = a 7-note gliss), build into the drop ----
for i, m in enumerate([77, 79, 81, 84, 86, 89, 91]):
    place(marimba(m, 1.0), 4.0 + i * 0.07, 0.26, -0.5 + i / 6, 0.45)
place(bell(89), 4.5, 0.22, 0.2, 0.5)
place(pad(CH["F"], 2.0), 4.0, 0.16, 0, 0.5)
place(pad([62, 65, 70], 1.0), 6.0, 0.16, 0, 0.5)
place(pad([64, 67, 70], 1.0), 7.0, 0.18, 0, 0.5)
place(kick(), 4.0)
place(kick(), 5.0, 0.8)
place(kick(), 6.0, 0.8)
place(bass(41), 4.0, 0.45)
place(bass(46), 6.0, 0.45)
place(bass(48), 7.0, 0.45)
for i in range(4):
    place(hat(), 6.0 + i * B / 2, 0.08 + i * 0.01, 0.35)
for i in range(8):
    place(clap(), 7.0 + i * B / 4, 0.1 + i * 0.03, 0.05, 0.2)
for i, m in enumerate([72, 74, 76, 79]):
    place(marimba(m), 6.0 + i * 0.25, 0.22, 0.2, 0.3)
place(pop(1000, 500, 0.07), 5.97, 0.3, 0.1)
place(whoop(420, 1300, 0.22), 6.47, 0.4, -0.1)
place(riser(1.45), 6.5, 0.55, 0, 0.2)

# ---- 8-24 s: product demo, full groove ----
for k in range(8):
    ch = PROG[k % 4]
    groove_bar(8.0 + 2 * k, ch, MEL if k < 4 else MEL2, mg=0.26)
place(crash(), 8.0, 0.55, 0, 0.3)
place(whoosh(0.5, 400, 6000), 7.72, 0.5)
place(whoosh(0.45), 8.85, 0.25, -0.4)
place(beep(), 9.97, 0.6, 0.3)
place(bell(81, 1.0), 10.1, 0.25, 0.3, 0.4)
place(bell(86, 1.0), 10.22, 0.25, 0.3, 0.4)
place(whoosh(0.4), 11.8, 0.35)
for i in range(18):
    place(click(2600 + 300 * (i % 3), 0.008), 12.3 + i * 0.045, 0.12, -0.1)
place(click(2000, 0.015), 13.47, 0.5, -0.1)
place(lock(), 13.77, 0.5, -0.1)
place(whoosh(0.5, 500, 7000), 14.0, 0.45, 0.2)
place(whoosh(0.95, 250, 3000), 15.0, 0.4, 0.0, 0.2)
place(pop(), 15.97, 0.55, 0.3, 0.2)
place(bell(84, 1.4), 16.77, 0.3, 0.3, 0.5)
place(bell(91, 1.4), 16.87, 0.18, 0.3, 0.5)
place(whoosh(0.4, 300, 3000), 17.3, 0.25, 0.4)
place(click(1500, 0.02), 17.97, 0.45, 0.4)
place(click(1700, 0.02), 18.12, 0.45, 0.4)
place(pop(900, 400, 0.07), 18.27, 0.35, 0.4)
place(whoosh(0.45, 300, 4000), 19.85, 0.3)
place(click(2000, 0.015), 20.44, 0.5, -0.4)
place(whoosh(0.45, 500, 7000), 20.5, 0.4, -0.1)
place(pop(), 21.12, 0.45, 0.2)
place(whoosh(0.45, 500, 7000), 21.0, 0.35, -0.1)
place(pop(1300, 380), 21.62, 0.45, 0.2)
place(click(2000, 0.015), 22.42, 0.45, 0.3)
place(whoosh(0.4, 300, 4000), 22.47, 0.3, 0.3)

# ---- 24-28 s: "sealed" breakdown (ink), then three stamps ----
place(sub(), 23.97, 0.8)
place(crash(1.6), 24.0, 0.25, 0, 0.4)
for k, ch in enumerate(["Dm", "Bb"]):
    t0 = 24.0 + 2 * k
    place(pad(CH[ch], 2.0), t0, 0.3, 0, 0.6)
    place(bass(ROOT[ch] + 12, 1.6), t0, 0.5)
    place(kick(0.6), t0)
    for i in range(4):
        place(hat(0.05, 90), t0 + 0.25 + i * B, 0.1, 0.35)
    for i, m in enumerate(MEL[ch]):
        if m and i % 2 == 0:
            place(marimba(m + 12, 1.0, 0.7), t0 + i * B / 2, 0.3, 0.3 * (1 if i % 4 else -1), 0.55)
place(lock(), 24.52, 0.55, -0.4, 0.2)
place(lock(), 25.55, 0.45, 0.4, 0.2)
for i, m in enumerate([96, 98, 101]):
    place(bell(m, 0.8), 24.05 + i * 0.12, 0.08, 0.5 - 0.4 * i, 0.6)
for t in (26.0, 26.5, 27.0):
    place(kick(), t - 0.03, 1.0)
    place(tom(43), t - 0.03, 0.55)
    place(clap(), t - 0.03, 0.35, 0, 0.3)
for i in range(4):
    place(tom(52 - 3 * i), 27.5 + i * B / 4, 0.4, -0.3 + 0.2 * i)

# ---- 28-32 s: end card; final hit, light groove, tag, ring out ----
place(crash(2.6), 28.0, 0.6, 0, 0.4)
place(whoosh(0.5, 400, 6000), 27.75, 0.4)
groove_bar(28.0, "F", MEL2, light=True, mg=0.24)
place(pad(CH["Bb"], 1.0), 30.0, 0.16, 0, 0.6)
place(pad([65, 69, 72, 77], 1.6), 30.5, 0.2, 0, 0.7)
place(kick(), 30.0)
place(bass(46), 30.0, 0.45)
place(bass(41, 1.2), 30.5, 0.5)
place(pop(1200, 500, 0.08), 29.47, 0.4, 0.4)
for t, m in ((30.0, 72), (30.25, 74), (30.5, 77)):
    place(marimba(m, 1.6), t, 0.36, 0.1, 0.5)
place(bell(89, 1.5), 30.5, 0.2, 0.2, 0.6)

# ---------- reverb (synthetic room), master ----------
ir_t = tt(1.4)
ir = rng.uniform(-1, 1, len(ir_t)) * np.exp(-ir_t * 4.2)
ir = band(ir, 200, 7000)
ir /= np.sqrt(np.sum(ir**2))
M = 1 << int(np.ceil(np.log2(N + len(ir))))
wet = np.fft.irfft(np.fft.rfft(VERB, M) * np.fft.rfft(ir, M), M)[:N] * 0.5
wetR = np.roll(wet, int(0.011 * SR))
L += wet
R += wetR
mix = np.stack([L, R], 1)
fade = np.ones(N)
fn = int(0.8 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.75) * 0.82
pcm = (mix * 32767).astype("<i2")

import wave

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1], f"{DUR}s")
