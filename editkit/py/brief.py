"""Build the brief room: the raw upload on a frame.io-style timeline where the user leaves timecoded comments
BEFORE any edit exists. Nothing is edited until they press Done.

usage: python3 brief.py <run_dir> <out_dir> --key K [--heading H] [--title T] [--webm]

Reads runs/<key>/{meta.json, shots.json, transcript.txt} (from `editkit/bin/ingest`) and writes
<out_dir>/index.html plus assets/: a browsable proxy of the video (≤ ~13.5 MB parts so it fits an Artifact), a
filmstrip and a waveform. Prints {"page", "files"} for the Artifact publish.
"""
import argparse, html, json, math, os, re, subprocess

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PART_BYTES = float(os.environ.get("EDITKIT_PART_BYTES", 13.5e6))  # one proxy part stays under the 15 MB per-file limit
TOTAL_BYTES = 55e6       # one publish carries at most 64 MB
AUDIO_BPS = 64000
MAX_VIDEO_BPS = 700000
MIN_VIDEO_BPS = 120000


def tc(x):
    m = int(x // 60)
    return f"{m:02d}:{x - m * 60:05.2f}"


def sh(cmd):
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run"); ap.add_argument("out")
    ap.add_argument("--key", required=True); ap.add_argument("--title", default=None); ap.add_argument("--heading", default=None)
    ap.add_argument("--webm", action="store_true", help="VP9/Opus proxy (for testing in a browser without H.264)")
    a = ap.parse_args()
    meta = json.load(open(os.path.join(a.run, "meta.json")))
    src = os.path.join(a.run, meta["source"])
    W, H, DUR = meta["w"], meta["h"], float(meta["duration"])
    fps = meta["fps"]; fps = round(eval(fps)) if isinstance(fps, str) else fps
    assets = os.path.join(a.out, "assets"); os.makedirs(assets, exist_ok=True)

    # proxy parts: the shorter side is 540 px; bitrate is sized so the whole thing fits one publish
    total_bps = min(MAX_VIDEO_BPS + AUDIO_BPS, TOTAL_BYTES * 8 / DUR)
    vb = max(MIN_VIDEO_BPS, int(total_bps - AUDIO_BPS))
    n = max(1, math.ceil(DUR * (vb + AUDIO_BPS) / 8 / PART_BYTES))
    plen = DUR / n
    scale = "scale=-2:540" if W >= H else "scale=540:-2"
    has_audio = bool(meta.get("audio"))
    parts = []
    for i in range(n):
        ext = "webm" if a.webm else "mp4"
        name = f"assets/proxy-{i + 1}.{ext}"
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{i * plen:.3f}", "-t", f"{plen:.3f}", "-i", src, "-vf", scale + ",format=yuv420p"]
        if a.webm:
            cmd += ["-c:v", "libvpx-vp9", "-b:v", str(vb), "-deadline", "realtime", "-cpu-used", "8"]
            cmd += ["-c:a", "libopus", "-b:a", "48k"] if has_audio else ["-an"]
        else:
            cmd += ["-c:v", "libx264", "-preset", "veryfast", "-b:v", str(vb), "-maxrate", str(int(vb * 1.3)), "-bufsize", str(vb * 2), "-movflags", "+faststart"]
            cmd += ["-c:a", "aac", "-b:a", "64k", "-ac", "2"] if has_audio else ["-an"]
        sh(cmd + [os.path.join(a.out, name)])
        parts.append({"src": name, "start": round(i * plen, 3), "dur": round(plen, 3)})

    # filmstrip (≤ 400 tiles so the JPEG stays narrow) and waveform
    step = max(0.5, DUR / 400); tiles = max(1, int(math.ceil(DUR / step)))
    sh(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"fps=1/{step:.4f},scale=-2:72,tile={tiles}x1", "-frames:v", "1", "-q:v", "6", os.path.join(assets, "strip.jpg")])
    if has_audio:
        sh(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", "aformat=channel_layouts=mono,showwavespic=s=2400x90:colors=#cfc9b8:scale=sqrt", "-frames:v", "1", os.path.join(assets, "wave.png")])

    shots = json.load(open(os.path.join(a.run, "shots.json"))) if os.path.exists(os.path.join(a.run, "shots.json")) else []
    cuts = [s[0] for s in shots[1:] if 0 < s[0] < DUR]
    lines = []
    tpath = os.path.join(a.run, "transcript.txt")
    if os.path.exists(tpath):
        for ln in open(tpath, encoding="utf-8"):
            m = re.match(r"^\s*([\d.]+)-([\d.]+) \| (.*)$", ln.rstrip("\n"))
            if m:
                lines.append({"s": float(m.group(1)), "e": float(m.group(2)), "text": m.group(3)})
            elif ln.lstrip().startswith("~") and lines:
                lines[-1]["alt"] = ln.lstrip()[1:].strip()

    title = a.title or "Brief Room"
    heading = a.heading or a.key
    page = open(os.path.join(KIT, "review", "brief.html"), encoding="utf-8").read()
    bm = {"key": a.key, "title": heading, "w": W, "h": H, "fps": fps, "dur": DUR, "parts": parts, "round": 0,
          "strip": {"src": "assets/strip.jpg", "tiles": tiles}, "wave": "assets/wave.png" if has_audio else None,
          "cuts": cuts, "lines": lines}
    rep = {"{{TITLE}}": html.escape(title), "{{HEADING}}": html.escape(heading), "{{DUR_LABEL}}": f"{DUR:.1f} s",
           "{{W}}": str(W), "{{H}}": str(H), "{{FPS}}": str(fps), "{{DUR_TC}}": tc(DUR),
           "{{META}}": json.dumps(bm).replace("</", "<\\/")}
    for k, v in rep.items():
        page = page.replace(k, v)
    open(os.path.join(a.out, "index.html"), "w", encoding="utf-8").write(page)
    files = sorted(os.path.relpath(os.path.join(dp, f), a.out) for dp, _, fs in os.walk(assets) for f in fs)
    print(json.dumps({"page": os.path.join(a.out, "index.html"), "files": files, "parts": n, "video_kbps": vb // 1000}))


if __name__ == "__main__":
    main()
