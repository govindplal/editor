"""Local word-timed transcription: NVIDIA Parakeet (English, word times) via sherpa-onnx,
plus optional Whisper (multilingual translate / cross-check) per segment.
Models come from GitHub releases (huggingface.co is blocked in this environment).

usage: transcribe.py <audio16k.wav> <out_dir> [--lang ml] [--check] [--wmodel large-v3|medium]
writes: words.json  [[word, start, end], ...]
        transcript.txt  "s-e | parakeet text" (+ "  ~ whisper text" lines)
"""
import json, os, subprocess, sys, tarfile
import numpy as np, soundfile as sf, sherpa_onnx

MODELS = os.path.expanduser(os.environ.get("EDITKIT_MODELS", "~/.cache/editkit/models"))
REL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
PARAKEET = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8"


def ensure(name):
    d = os.path.join(MODELS, name)
    if os.path.isdir(d) and os.listdir(d):
        return d
    os.makedirs(MODELS, exist_ok=True)
    tar = d + ".tar.bz2"
    print(f"[transcribe] downloading {name} ...", file=sys.stderr)
    subprocess.run(["curl", "-sSLf", "-o", tar, REL + name + ".tar.bz2"], check=True)
    with tarfile.open(tar) as t:
        t.extractall(MODELS)
    os.remove(tar)
    return d


def chunks(a, sr, target=30.0, lo=24.0, hi=36.0):
    """Split at the quietest 50 ms frame near every `target` seconds."""
    hop = int(sr * 0.05)
    rms = np.sqrt(np.convolve(a.astype(np.float64) ** 2, np.ones(hop) / hop, "same"))[::hop]
    cuts, start = [0], 0.0
    total = len(a) / sr
    while total - start > hi:
        i0, i1 = int((start + lo) / 0.05), int((start + hi) / 0.05)
        cut = (i0 + int(np.argmin(rms[i0:i1]))) * 0.05
        cuts.append(cut)
        start = cut
    cuts.append(total)
    return list(zip(cuts[:-1], cuts[1:]))


def parakeet_words(a, sr):
    m = ensure(PARAKEET)
    r = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{m}/encoder.int8.onnx", decoder=f"{m}/decoder.int8.onnx", joiner=f"{m}/joiner.int8.onnx",
        tokens=f"{m}/tokens.txt", model_type="nemo_transducer", num_threads=os.cpu_count() or 4)
    words = []
    for s0, s1 in chunks(a, sr):
        st = r.create_stream()
        st.accept_waveform(sr, a[int(s0 * sr):int(s1 * sr)])
        r.decode_stream(st)
        res = st.result
        toks, ts = list(res.tokens), list(res.timestamps)
        durs = list(getattr(res, "durations", []) or [])
        cur = []
        for i, (t, x) in enumerate(zip(toks, ts)):
            if t.startswith(("▁", " ")) or not cur:
                cur.append([t.replace("▁", "").strip(), s0 + x, [i]])
            else:
                cur[-1][0] += t
                cur[-1][2].append(i)
        for k, (w, s, idx) in enumerate(cur):
            last = idx[-1]
            e = s0 + ts[last] + (durs[last] if durs and durs[last] > 0 else 0.08)
            nxt = cur[k + 1][1] if k + 1 < len(cur) else s1
            e = min(max(e, s + 0.08), nxt)
            if w:
                words.append([w, round(s, 3), round(e, 3)])
    return words


def segments(words, gap=0.7, maxlen=12.0):
    segs, cur = [], []
    for w in words:
        if cur and (w[1] - cur[-1][2] > gap or w[2] - cur[0][1] > maxlen or
                    (cur[-1][0][-1:] in ".?!" and w[1] - cur[0][1] > 1.5)):
            segs.append(cur)
            cur = []
        cur.append(w)
    if cur:
        segs.append(cur)
    return segs


def whisper_alt(a, sr, segs, lang, wmodel):
    name = {"large-v3": "sherpa-onnx-whisper-large-v3", "medium": "sherpa-onnx-whisper-medium"}[wmodel]
    m = ensure(name)
    pre = os.path.join(m, wmodel + "-")
    enc = pre + "encoder.int8.onnx"
    dec = pre + "decoder.int8.onnx" if os.path.exists(pre + "decoder.int8.onnx") else pre + "decoder.onnx"
    task = "translate" if lang and lang != "en" else "transcribe"
    r = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=enc, decoder=dec, tokens=pre + "tokens.txt",
                                                   language=lang or "en", task=task, num_threads=os.cpu_count() or 4)
    out = []
    for sg in segs:
        s0, s1 = max(0, sg[0][1] - 0.25), sg[-1][2] + 0.25
        st = r.create_stream()
        st.accept_waveform(sr, a[int(s0 * sr):int(s1 * sr)])
        r.decode_stream(st)
        out.append(st.result.text.strip())
    return out


def main():
    args = sys.argv[1:]
    wav, out = args[0], args[1]
    lang = args[args.index("--lang") + 1] if "--lang" in args else None
    wmodel = args[args.index("--wmodel") + 1] if "--wmodel" in args else "large-v3"
    a, sr = sf.read(wav, dtype="float32")
    words = parakeet_words(a, sr)
    json.dump(words, open(os.path.join(out, "words.json"), "w"), separators=(",", ":"))
    segs = segments(words)
    alts = whisper_alt(a, sr, segs, lang, wmodel) if (lang or "--check" in args) else None
    with open(os.path.join(out, "transcript.txt"), "w") as f:
        for i, sg in enumerate(segs):
            f.write(f"{sg[0][1]:.2f}-{sg[-1][2]:.2f} | {' '.join(w[0] for w in sg)}\n")
            if alts:
                f.write(f"  ~ {alts[i]}\n")
    print(f"[transcribe] {len(words)} words, {len(segs)} segments" + (f", whisper {wmodel} {lang or 'en'}" if alts else ""))


if __name__ == "__main__":
    main()
