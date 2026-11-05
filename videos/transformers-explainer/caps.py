import json, re, sys
run = sys.argv[1]
w = json.load(open(f"{run}/words.json"))
fix = {"matt,": "mat.", "Mat": "Mat,", "know": "know?", "Roof": "Roof,", "it": None, "transformer?": "Transformer.", "transformer.": "Transformer.", "9,": "nine.", "1.": "one.", "the.": "\"the\"."}
KEY = {"mat", "tokens", "id", "number", "numbers", "meaning", "stamp", "attention", "query", "key", "value", "parallel",
       "grammar", "position", "layer", "hundred", "transformer", "62%", "cat", "dog", "car"}
words = []
for i, (t, s, e) in enumerate(w):
    t = fix.get(t, t) or t
    if i == 10: t = "it:"
    if t == "it" and i > 0 and w[i-1][0] == "9,": t = "It"
    if i == 1: t = "\"" + t
    if i == 5: t = t + "...\""
    words.append([t, s, e])
clauses, cur = [], []
for i, x in enumerate(words):
    cur.append(x)
    nxt = words[i + 1] if i + 1 < len(words) else None
    if re.search(r"[.,?!:…”]$", x[0]) or not nxt or (nxt[1] - x[2]) > 0.3:
        clauses.append(cur); cur = []
caps = []
for c in clauses:  # merge tiny clauses forward, split long ones evenly
    if caps and len(c) <= 2 and len(caps[-1]) + len(c) <= 6 and not re.search(r"[.?!:”]$", caps[-1][-1][0]):
        caps[-1] += c; continue
    n = -(-len(c) // 6)
    k = -(-len(c) // n)
    caps += [c[j:j + k] for j in range(0, len(c), k)]
j = 0
while j < len(caps) - 1:
    if len(caps[j]) == 1 and not re.search(r"[.?!”]$", caps[j][0][0]) and len(caps[j + 1]) <= 6:
        caps[j] += caps.pop(j + 1)
    j += 1
out = []
for k, c in enumerate(caps):
    s = c[0][1]; nxt = caps[k + 1][0][1] if k + 1 < len(caps) else 90.0
    e = min(nxt, c[-1][2] + 0.7)
    out.append({"s": round(s, 2), "e": round(e, 2), "w": [[t, round(st, 2), 1 if re.sub(r"[^\w%]", "", t).lower() in KEY else 0] for t, st, _ in c]})
html = open(f"{run}/hf/index.html").read()
html = re.sub(r'(<script type="application/json" id="caps-data">).*?(</script>)', lambda m: m.group(1) + json.dumps(out, ensure_ascii=False) + m.group(2), html, flags=re.S)
open(f"{run}/hf/index.html", "w").write(html)
for c in out: print(c["s"], " ".join(t for t, *_ in c["w"]))
