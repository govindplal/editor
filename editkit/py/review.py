"""Build a review page (timeline player + timestamped notes) from a HyperFrames composition.

usage: python3 review.py <hf_project_dir> <out_dir> --key <key> [--title T] [--round N] [--video <file for filmstrip/wave>]

Reads <hf_project_dir>/index.html:
  - <style> blocks without the `data-page` attribute  -> composition CSS (fonts inlined as data URIs)
  - the body markup minus scripts                      -> composition DOM (assets keep their relative paths)
  - inline <script> blocks (not type=application/json) -> run after GSAP, register window.__timelines[id]
  - optional <script type="application/json" id="edit-data"> with {"lanes": [...]} for the timeline
Writes <out_dir>/index.html and copies every referenced asset (src="assets/...") next to it, plus a
filmstrip and waveform for the Footage / Audio lanes. Publish <out_dir>/index.html as an Artifact with
`files` for the assets and capabilities {db:{}, comments:{}}; notes land in the `notes` collection.
"""
import argparse, base64, html, json, os, re, shutil, subprocess

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def tc(x):
    m = int(x // 60)
    return f"{m:02d}:{x - m * 60:05.2f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("hf"); ap.add_argument("out")
    ap.add_argument("--key", required=True); ap.add_argument("--title", default=None)
    ap.add_argument("--heading", default=None); ap.add_argument("--round", type=int, default=1)
    ap.add_argument("--video", default=None)
    a = ap.parse_args()
    src = open(os.path.join(a.hf, "index.html"), encoding="utf-8").read()
    os.makedirs(os.path.join(a.out, "assets"), exist_ok=True)

    head = src.split("<body", 1)[0]
    body = re.search(r"<body[^>]*>(.*)</body>", src, re.S).group(1)

    css = []
    for attrs, txt in re.findall(r"<style([^>]*)>(.*?)</style>", head, re.S):
        if "data-page" in attrs:
            continue
        css.append(txt)
    css = "\n".join(css)

    def inline_font(m):
        rel = m.group(2)
        p = os.path.join(a.hf, rel)
        if not os.path.exists(p):
            return m.group(0)
        b64 = base64.b64encode(open(p, "rb").read()).decode()
        return f"url(data:font/woff2;base64,{b64})"
    css = re.sub(r"url\((['\"]?)([^)'\"]+\.woff2)\1\)", inline_font, css)

    scripts, data = [], None
    for attrs, txt in re.findall(r"<script([^>]*)>(.*?)</script>", body, re.S):
        if "src=" in attrs:
            continue
        if "application/json" in attrs:
            if 'id="edit-data"' in attrs:
                data = json.loads(txt)
            scripts.append(f"<script{attrs}>{txt}</script>")
            continue
        scripts.append(f"<script>{txt}</script>")
    dom = re.sub(r"<script[^>]*>.*?</script>", "", body, flags=re.S)
    dom = re.sub(r"<!--.*?-->", "", dom, flags=re.S).strip()

    m = re.search(r'data-composition-id="([^"]+)"', dom)
    W = int(re.search(r'data-width="(\d+)"', dom).group(1)); H = int(re.search(r'data-height="(\d+)"', dom).group(1))
    DUR = float(re.search(r'data-duration="([\d.]+)"', dom).group(1))
    data = data or {}
    fps = data.get("fps", 25)

    # assets referenced by the DOM
    for rel in sorted(set(re.findall(r'(?:src|poster)="(assets/[^"]+)"', dom))):
        dst = os.path.join(a.out, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
        s = os.path.join(a.hf, rel)
        if os.path.exists(s) and (not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(s)):
            shutil.copy(s, dst)

    lanes = list(data.get("lanes", []))
    strip_md = lambda x: re.sub(r"\s+", " ", re.sub(r"[*^]|\{\w+\}", "", x)).strip()
    unsure = []
    if data.get("captions"):
        items = []
        for c in data["captions"]:
            it = {"s": c["s"], "e": c["e"], "label": strip_md(c["text"]), "unsure": bool(c.get("unsure"))}
            items.append(it)
            if it["unsure"]:
                unsure.append({"t": c["s"], "text": it["label"]})
        lanes.append({"name": "Captions", "kind": "cap", "items": items})
    unsure += [{"t": c["t"], "text": c["text"]} for c in data.get("checks", [])]
    unsure.sort(key=lambda u: u["t"])
    if data.get("camera"):
        items = [{"s": k[0], "e": k[1], "label": f"zoom {k[2]:.2f}\u2192{k[3]:.2f}"} for k in data["camera"] if abs(k[3] - k[2]) > 0.001]
        for t, amp, d in data.get("shake", []):
            items.append({"s": t, "e": t + d, "label": "shake"})
        lanes.append({"name": "Camera", "kind": "cam", "items": items})
    if data.get("grade"):
        g = data["grade"]
        items = [{"s": g[i][0], "e": g[i + 1][0] if i + 1 < len(g) else None, "label": g[i][1]} for i in range(len(g))]
        lanes.append({"name": "Grade", "kind": "grade", "items": items})
    # DOM clips grouped into graphics lanes by data-track-name (fallback "Graphics")
    groups = {}
    for tag in re.finditer(r"<[a-z]+\b([^>]*\bdata-start=\"[^\"]+\"[^>]*)>", dom):
        at = tag.group(1)
        if "data-composition-id" in at or "data-review-skip" in at:
            continue
        g = lambda k: (re.search(k + r'="([^"]*)"', at) or [None, None])[1]
        s = float(g("data-start")); d = g("data-duration"); e = s + float(d) if d else DUR
        name = g("data-track-name") or "Graphics"
        label = html.unescape(g("data-label") or g("id") or "")
        groups.setdefault(name, []).append({"s": s, "e": e, "label": label})
    for name, items in groups.items():
        lanes.append({"name": name, "kind": "gfx", "items": items})

    video = a.video
    if video and os.path.exists(video):
        n = max(1, int(round(DUR * 2)))
        strip = os.path.join(a.out, "assets", "review-strip.jpg"); wave = os.path.join(a.out, "assets", "review-wave.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", f"fps=2,scale=-2:72,tile={n}x1", "-frames:v", "1", "-q:v", "6", strip], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-filter_complex", "aformat=channel_layouts=mono,showwavespic=s=2400x90:colors=#cfc9b8:scale=sqrt", "-frames:v", "1", wave], check=True)
        cuts = [c for c in data.get("cuts", []) if 0 < c < DUR]
        lanes.append({"name": "Footage", "kind": "film", "strip": "assets/review-strip.jpg", "tiles": n, "tilesPerImage": n, "cuts": cuts})
        lanes.append({"name": "Audio", "kind": "wave", "image": "assets/review-wave.png", "title": "Original audio, untouched"})


    for ln in lanes:
        for it in ln.get("items", []):
            if it.get("e") is None:
                it["e"] = DUR
    order = data.get("laneOrder") or ["Captions", "Graphics", "B-roll", "Camera", "Grade", "Footage", "Audio"]
    lanes.sort(key=lambda l: order.index(l["name"]) if l["name"] in order else len(order))
    title = a.title or a.key
    meta = {"title": a.heading or title, "key": a.key, "round": a.round, "roundLabel": f"Round {a.round}", "fps": fps, "lanes": lanes, "unsure": unsure}
    page = open(os.path.join(KIT, "review", "player.html"), encoding="utf-8").read()
    rep = {
        "{{TITLE}}": html.escape(title), "{{HEADING}}": html.escape(a.heading or title),
        "{{ROUND_LABEL}}": f"Cut v{a.round} · Round {a.round}", "{{W}}": str(W), "{{H}}": str(H), "{{FPS}}": str(fps),
        "{{DUR_LABEL}}": f"{DUR:.1f} s", "{{DUR_TC}}": tc(DUR), "{{COMP_CSS}}": css, "{{COMP_DOM}}": dom,
        "{{META}}": json.dumps(meta).replace("</", "<\\/"), "{{COMP_SCRIPTS}}": "\n".join(scripts),
    }
    for k, v in rep.items():
        page = page.replace(k, v)
    open(os.path.join(a.out, "index.html"), "w", encoding="utf-8").write(page)
    files = sorted(os.path.relpath(os.path.join(dp, f), a.out) for dp, _, fs in os.walk(os.path.join(a.out, "assets")) for f in fs)
    print(json.dumps({"page": os.path.join(a.out, "index.html"), "files": files, "lanes": [l["name"] for l in lanes]}))


if __name__ == "__main__":
    main()
