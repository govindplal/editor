"""Build runs/<key>/index.html from runs/<key>/edit.json (+ meta.json, words.json, shots.json).
usage: build.py <run_dir>
"""
import json, os, re, shutil, subprocess, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_CACHE = os.path.expanduser("~/.cache/editkit/fonts")


def load(p, default=None):
    return json.load(open(p)) if os.path.exists(p) else default


def merge(a, b):
    out = dict(a)
    for k, v in (b or {}).items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


# ---------------- captions ----------------
def group(words, maxw, maxc, gap=0.45, hold=1.2):
    """words: [[text, s, e, em]] -> lines [{s, e, w:[[text, s, e, em]]}]"""
    lines, cur = [], []
    for w in words:
        n = len(" ".join(x[0] for x in cur + [w]))
        if cur and (len(cur) >= maxw or n > maxc or w[1] - cur[-1][2] > gap or cur[-1][0][-1:] in ".?!,;:"):
            lines.append(cur)
            cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    out = []
    for i, ln in enumerate(lines):
        nxt = lines[i + 1][0][1] if i + 1 < len(lines) else ln[-1][2] + 0.6
        last = ln[-1][2]
        e = nxt if nxt - last < hold else max(last + 0.4, ln[0][1] + 0.5)
        out.append({"s": round(ln[0][1], 3), "e": round(e, 3), "w": [[x[0], round(x[1], 3), round(x[2], 3), x[3]] for x in ln]})
    return out


def timed_text(text, s, e, tw):
    """Place a corrected text over [s, e]: match tokens to transcript words in the window, interpolate the rest."""
    toks = text.split()
    win = [w for w in tw if w[1] >= s - 0.15 and w[1] < e]
    times = [None] * len(toks)
    j = 0
    for i, t in enumerate(toks):
        for k in range(j, len(win)):
            if norm(t.strip("*")) and norm(t.strip("*")) == norm(win[k][0]):
                times[i] = (win[k][1], win[k][2])
                j = k + 1
                break
    # interpolate unmatched starts between anchors
    if toks and times[0] is None:
        times[0] = (s, None)
    anchors = [(i, t[0]) for i, t in enumerate(times) if t] + [(len(toks), e)]
    out = []
    for a in range(len(anchors) - 1):
        (i0, t0), (i1, t1) = anchors[a], anchors[a + 1]
        for i in range(i0 + 1, i1):
            times[i] = (t0 + (t1 - t0) * (i - i0) / (i1 - i0), None)
    for i, t in enumerate(toks):
        st = times[i][0]
        en = times[i][1] or (times[i + 1][0] if i + 1 < len(toks) else e)
        em = t.startswith("*")
        out.append([t.replace("*", ""), round(st, 3), round(max(en, st + 0.05), 3), 1 if em else 0])
    return out


def build_lines(cfg, words, portrait):
    cap = cfg.get("captions", {})
    maxw = cap.get("maxWords", 4 if portrait else 7)
    maxc = cap.get("maxChars", 22 if portrait else 40)
    rep = cap.get("replace", {})
    emph = {norm(x) for x in cap.get("emph", [])}
    patches = [(p[0], p[1], p[2]) for p in cap.get("patch", [])]
    if "lines" in cap:  # full manual
        patches, words = [(p[0], p[1], p[2]) for p in cap["lines"]], []
    auto = []
    for w, s, e in words:
        if any(ps - 0.05 <= s < pe for ps, pe, _ in patches):
            continue
        t = rep.get(w, w)
        if t == "":
            continue
        em = 1 if (re.search(r"\d", t) or norm(t) in emph) else 0
        auto.append([t, s, e, em])
    lines = group(auto, maxw, maxc)
    for ps, pe, txt in patches:
        tw = timed_text(txt, ps, pe, words or [])
        lines += group(tw, maxw, maxc, gap=99)
    lines.sort(key=lambda l: l["s"])
    for i in range(len(lines) - 1):  # no overlaps
        lines[i]["e"] = min(lines[i]["e"], lines[i + 1]["s"])
    return lines


# ---------------- fonts ----------------
def fetch_font(family):
    slug = re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-")
    d = os.path.join(FONT_CACHE, slug)
    if os.path.exists(os.path.join(d, "fonts.css")):
        return slug, d
    for spec in (f"{family}:wght@400;700;800;900", f"{family}:wght@400;700", family):
        r = subprocess.run(["npx", "--yes", "@veedstudio/openedit-cli", "fonts", spec, "--out", d], capture_output=True, text=True)
        if r.returncode == 0:
            return slug, d
    print(f"[build] WARNING font not found: {family}", file=sys.stderr)
    return None, None


def main():
    run = os.path.abspath(sys.argv[1])
    cfg = load(os.path.join(run, "edit.json"))
    meta = load(os.path.join(run, "meta.json"))
    words = load(os.path.join(run, "words.json"), [])
    shots = load(os.path.join(run, "shots.json"), [])
    styles = load(os.path.join(KIT, "styles.json"))
    sname = os.environ.get("EDITKIT_STYLE") or cfg.get("style", "kinetic")
    if sname not in styles:
        sys.exit(f"[build] unknown style '{sname}' — see editkit/STYLES.md")
    theme = merge(styles[sname], cfg.get("styleOverrides", {}))
    W, H = meta["w"], meta["h"]
    lines = build_lines(cfg, words, H > W)

    assets = os.path.join(run, "assets")
    os.makedirs(os.path.join(assets, "fonts"), exist_ok=True)
    links = []
    for fam in dict.fromkeys([theme["fd"], theme["fb"]]):
        slug, d = fetch_font(fam)
        if slug:
            dst = os.path.join(assets, "fonts", slug)
            shutil.copytree(d, dst, dirs_exist_ok=True)
            links.append(f'<link rel="stylesheet" href="assets/fonts/{slug}/fonts.css">')
    for f in ("runtime.js", "runtime.css", "gsap.min.js"):
        shutil.copy(os.path.join(KIT, "lib", f), os.path.join(assets, f))

    edit = {
        "W": W, "H": H, "dur": meta["duration"], "theme": theme, "shots": shots, "lines": lines,
        "cap": cfg.get("captions", {}), "camera": cfg.get("camera", {}), "chrome": cfg.get("chrome", {}),
        "graphics": cfg.get("graphics", []), "end": cfg.get("end"), "face": cfg.get("face"),
        "titleColor": cfg.get("titleColor"),
    }
    src = cfg.get("source", meta.get("source", "source.mp4"))
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{os.path.basename(run)}</title>
{chr(10).join(links)}
<link rel="stylesheet" href="assets/runtime.css">
</head><body>
<div id="stage"><div id="cam"><video src="{src}" muted playsinline preload="auto"></video></div><div id="ov"></div><div id="flash"></div></div>
<script src="assets/gsap.min.js"></script>
<script>window.EDIT = {json.dumps(edit, separators=(",", ":"))};</script>
<script src="assets/runtime.js"></script>
</body></html>
"""
    open(os.path.join(run, "index.html"), "w").write(html)
    print(f"[build] {os.path.basename(run)}: style={sname} lines={len(lines)} graphics={len(edit['graphics'])} shots={len(shots)}")


if __name__ == "__main__":
    main()
