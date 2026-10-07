/* editkit runtime: builds the overlay from window.EDIT (written by editkit/bin/build).
 * Captions, camera, flashes and fx are pure functions of t (window.__seek); graphics use one GSAP timeline. */
(function () {
  const E = window.EDIT, T = E.theme;
  const W = E.W, H = E.H, U = Math.min(W, H) / 1080, OW = W / U, OH = H / U, PORT = H > W;
  const $ = (s, r) => (r || document).querySelector(s);
  const mk = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeOutBack = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const lum = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };

  // ---------- stage + theme ----------
  const stage = $('#stage');
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  const [bg, ink, a1, a2, a3] = T.c;
  const ink2 = lum(ink) < 0.5 ? ink : '#111111';
  const cap = T.cap, sw = cap.stroke || 0;
  const stk = sw ? [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]].map(([x, y]) => `${(x * sw).toFixed(1)}px ${(y * sw).toFixed(1)}px 0 ${ink2}`).join(',') : '0 0 3px rgba(0,0,0,.55)';
  const vars = { '--bg': bg, '--ink': ink, '--ink2': ink2, '--a1': a1, '--a2': a2, '--a3': a3, '--fd': `'${T.fd}', sans-serif`, '--fb': `'${T.fb}', sans-serif`,
    '--fc': `'${cap.font === 'd' ? T.fd : T.fb}', sans-serif`, '--cw': cap.w || 800, '--case': cap.case === 'u' ? 'uppercase' : 'none', '--rad': (T.card.radius || 0) + 'px',
    '--bw': (T.card.border || 0) + 'px', '--capc': E.cap.color || '#ffffff', '--onc': lum(a1) > 0.6 ? '#111111' : '#ffffff', '--tc': E.titleColor || '#ffffff', '--stk': stk };
  for (const k in vars) stage.style.setProperty(k, vars[k]);
  Object.assign(stage.dataset, { fill: T.card.fill, shadow: T.card.shadow, hl: cap.hl, cshadow: cap.shadow });
  const EASE = { back: 'back.out(2)', snap: 'expo.out', soft: 'power2.out', steps: 'steps(4)', elastic: 'elastic.out(1,0.55)', bounce: 'bounce.out', flicker: 'steps(5)' }[T.ease] || 'back.out(2)';

  // ---------- footage ----------
  const cam = $('#cam');
  if (T.foot) cam.style.filter = T.foot;
  const face = E.face || (PORT ? [0.5, 0.3] : [0.5, 0.38]);
  cam.style.transformOrigin = `${face[0] * 100}% ${face[1] * 100}%`;

  // ---------- overlay root (design units: short side = 1080) ----------
  const ov = $('#ov');
  ov.style.width = OW + 'px'; ov.style.height = OH + 'px'; ov.style.transform = `scale(${U})`;
  const fxL = mk('div', '', null, ov); fxL.id = 'fx';
  const gfx = mk('div', '', null, ov); gfx.id = 'gfx';
  const capbox = mk('div', '', null, ov); capbox.id = 'capbox';
  const chrome = mk('div', '', null, ov); chrome.id = 'chrome';
  const flashEl = $('#flash');

  // ---------- zones ----------
  function zone(z) {
    if (Array.isArray(z)) return { x: z[0] * OW, y: z[1] * OH, w: z[2] * OW, h: z[3] * OH };
    const P = {
      lower: [40, .675 * OH, OW - 80, .25 * OH], upper: [40, .095 * OH, OW - 80, .2 * OH], center: [40, .36 * OH, OW - 80, .28 * OH],
      left: [20, .62 * OH, OW / 2 - 30, .3 * OH], right: [OW / 2 + 10, .62 * OH, OW / 2 - 30, .3 * OH], full: [0, 0, OW, OH],
      corner: [OW - 260, .7 * OH, 240, 240], cornerL: [20, .7 * OH, 240, 240], top: [40, .1 * OH, OW - 80, .2 * OH]
    };
    const L = {
      right: [OW * .6, OH * .12, OW * .37, OH * .6], left: [OW * .03, OH * .12, OW * .37, OH * .6], lower: [OW * .2, OH * .52, OW * .6, OH * .26],
      upper: [OW * .2, OH * .07, OW * .6, OH * .24], center: [OW * .2, OH * .2, OW * .6, OH * .5], full: [0, 0, OW, OH],
      corner: [OW - 290, OH * .48, 250, 250], cornerL: [40, OH * .48, 250, 250], top: [OW * .2, OH * .07, OW * .6, OH * .24]
    };
    const r = (PORT ? P : L)[z || (PORT ? 'lower' : 'right')] || (PORT ? P.lower : L.right);
    return { x: r[0], y: r[1], w: r[2], h: r[3] };
  }

  // ---------- icons (100x100) ----------
  const ICON = {
    question: '<circle cx="50" cy="50" r="44" class="f1 s"/><text x="50" y="72" text-anchor="middle" class="disp fi" font-size="62">?</text>',
    exclaim: '<circle cx="50" cy="50" r="44" class="f3 s"/><text x="50" y="74" text-anchor="middle" class="disp fi" font-size="66">!</text>',
    trophy: '<path d="M26 14h48v18c0 20-10 32-24 34-14-2-24-14-24-34z" fill="#F5C518" class="s"/><path d="M26 22H12c0 16 8 22 16 24M74 22h14c0 16-8 22-16 24" class="s sn"/><rect x="42" y="64" width="16" height="14" class="fi"/><rect x="30" y="78" width="40" height="10" rx="3" class="fi"/>',
    crown: '<path d="M12 74 8 26l22 20 20-30 20 30 22-20-4 48z" fill="#F5C518" class="s"/><rect x="14" y="74" width="72" height="12" rx="3" fill="#F5C518" class="s"/>',
    pin: '<path d="M50 94C42 76 18 58 18 36a32 32 0 0 1 64 0c0 22-24 40-32 58z" fill="#E2231A" class="s"/><circle cx="50" cy="36" r="12" class="fw s"/>',
    globe: '<circle cx="50" cy="50" r="42" fill="#2B7BE4" class="s"/><path d="M22 34c10-8 22-4 22 6s-12 10-6 22-10 16-14 8M58 18c10 2 20 10 16 18s-14 2-16 12 10 16 4 24" fill="#3DBE5A"/><circle cx="50" cy="50" r="42" class="s sn"/>',
    heart: '<path d="M50 86C20 64 8 48 8 32 8 18 20 10 31 10c9 0 15 6 19 12 4-6 10-12 19-12 11 0 23 8 23 22 0 16-12 32-42 54z" fill="#FF4D6D" class="s"/>',
    star: '<path d="M50 6l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 37l30-3z" class="f1 s"/>',
    fire: '<path d="M50 94c-20 0-32-14-32-30 0-20 18-26 16-50 14 8 22 20 22 30 4-4 6-10 6-16 12 10 20 24 20 36 0 16-12 30-32 30z" fill="#FF7A00" class="s"/><path d="M50 92c-9 0-15-6-15-14 0-10 9-12 10-24 8 6 20 14 20 24 0 8-6 14-15 14z" fill="#FFD400"/>',
    bulb: '<path d="M50 8a30 30 0 0 0-18 54c4 4 6 8 6 12h24c0-4 2-8 6-12A30 30 0 0 0 50 8z" fill="#FFE14D" class="s"/><rect x="38" y="76" width="24" height="14" rx="4" fill="#9CA3AF" class="s"/><path d="M42 50l8 10 8-10" class="s sn"/>',
    check: '<circle cx="50" cy="50" r="44" fill="#22C55E" class="s"/><path d="M28 52l14 14 30-32" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    cross: '<circle cx="50" cy="50" r="44" fill="#EF4444" class="s"/><path d="M32 32l36 36M68 32 32 68" stroke="#fff" stroke-width="11" stroke-linecap="round"/>',
    clock: '<circle cx="50" cy="50" r="42" class="fw s"/><path d="M50 22v28l18 12" class="s sn"/><circle cx="50" cy="50" r="4" class="fi"/>',
    money: '<rect x="8" y="24" width="84" height="52" rx="8" fill="#22C55E" class="s"/><circle cx="50" cy="50" r="15" fill="#86EFAC" class="s"/><text x="50" y="58" text-anchor="middle" class="disp fi" font-size="24">$</text>',
    chart: '<rect x="14" y="54" width="18" height="32" class="f2 s"/><rect x="41" y="34" width="18" height="52" class="f1 s"/><rect x="68" y="14" width="18" height="72" class="f3 s"/><path d="M8 88h86" class="s"/>',
    up: '<path d="M50 8 88 52H64v40H36V52H12z" fill="#22C55E" class="s"/>',
    down: '<path d="M50 92 88 48H64V8H36v40H12z" fill="#EF4444" class="s"/>',
    mic: '<rect x="34" y="8" width="32" height="52" rx="16" class="fi"/><path d="M22 46c0 18 12 28 28 28s28-10 28-28M50 74v16M34 90h32" class="s sn"/>',
    ball: '<circle cx="50" cy="50" r="42" class="fw s"/><path d="M50 30l14 10-5 17H41l-5-17z" class="fk"/><path d="M50 8v22M64 40l22-6M59 57l12 18M41 57 29 75M36 40l-22-6" class="s sn" stroke-width="4"/>',
    warning: '<path d="M50 8 94 88H6z" fill="#FACC15" class="s"/><rect x="45" y="36" width="10" height="28" rx="4" class="fi"/><circle cx="50" cy="74" r="6" class="fi"/>',
    eye: '<path d="M6 50c12-20 28-30 44-30s32 10 44 30c-12 20-28 30-44 30S18 70 6 50z" class="fw s"/><circle cx="50" cy="50" r="16" class="f2"/><circle cx="50" cy="50" r="7" class="fk"/>',
    brain: '<path d="M30 20c-12 0-20 10-18 22-8 6-8 20 2 26 0 12 12 18 22 14 4 6 10 8 14 6V18c-6-6-14-6-20 2zM70 20c12 0 20 10 18 22 8 6 8 20-2 26 0 12-12 18-22 14-4 6-10 8-14 6V18c6-6 14-6 20 2z" fill="#F9A8D4" class="s"/>',
    rocket: '<path d="M50 6c18 12 24 34 18 58H32C26 40 32 18 50 6z" class="fw s"/><circle cx="50" cy="36" r="9" class="f2 s"/><path d="M32 52 18 70l16-2M68 52l14 18-16-2" class="f3 s"/><path d="M40 66c0 12 4 20 10 26 6-6 10-14 10-26z" fill="#FF7A00"/>',
    users: '<circle cx="36" cy="34" r="14" class="f2 s"/><circle cx="66" cy="38" r="12" class="f1 s"/><path d="M10 86c0-20 12-32 26-32s26 12 26 32zM50 86c2-16 8-26 18-26s20 10 22 26z" class="f2 s"/>',
    play: '<rect x="6" y="20" width="88" height="60" rx="18" fill="#FF0000" class="s"/><path d="M42 36v28l24-14z" fill="#fff"/>',
    bell: '<path d="M50 10c-16 0-26 12-26 28v18L14 72h72L76 56V38c0-16-10-28-26-28z" class="f1 s"/><circle cx="50" cy="82" r="8" class="f1 s"/>',
    thumb: '<path d="M30 44 46 12c8 0 12 6 10 14l-4 14h28c6 0 10 6 8 12l-8 30c-2 4-4 6-8 6H30z" class="f1 s"/><rect x="10" y="44" width="18" height="44" rx="4" class="f2 s"/>',
    book: '<path d="M50 24C38 14 22 14 8 18v62c14-4 30-4 42 6 12-10 28-10 42-6V18c-14-4-30-4-42 6z" class="fw s"/><path d="M50 24v62" class="s"/>',
    phone: '<rect x="28" y="6" width="44" height="88" rx="10" class="fi"/><rect x="33" y="16" width="34" height="62" rx="3" class="f2"/>',
    camera: '<rect x="8" y="28" width="84" height="56" rx="10" class="fi"/><path d="M34 28l6-12h20l6 12" class="fi"/><circle cx="50" cy="56" r="17" class="f2 s"/>',
    home: '<path d="M10 48 50 12l40 36" class="s sn"/><path d="M20 42v46h60V42" class="fw s"/><rect x="42" y="60" width="16" height="28" class="f1"/>',
    sparkle: '<path d="M50 4c4 26 20 42 46 46-26 4-42 20-46 46-4-26-20-42-46-46 26-4 42-20 46-46z" class="f1 s" stroke-width="4"/>',
    target: '<circle cx="50" cy="50" r="42" fill="#EF4444" class="s"/><circle cx="50" cy="50" r="28" fill="#fff"/><circle cx="50" cy="50" r="14" fill="#EF4444"/>',
    lock: '<path d="M30 44V32a20 20 0 0 1 40 0v12" class="s sn" stroke-width="9"/><rect x="18" y="44" width="64" height="48" rx="8" class="f1 s"/><circle cx="50" cy="66" r="7" class="fi"/>',
    music: '<path d="M38 74V20l46-10v52" class="s sn" stroke-width="8"/><circle cx="28" cy="76" r="13" class="fi"/><circle cx="74" cy="66" r="13" class="fi"/>',
    plane: '<path d="M8 54 92 18 70 86 50 60z" class="fw s"/><path d="M50 60 92 18" class="s"/>',
    calendar: '<rect x="10" y="18" width="80" height="72" rx="8" class="fw s"/><rect x="10" y="18" width="80" height="20" class="f3"/><path d="M30 10v16M70 10v16" class="s"/><rect x="28" y="50" width="14" height="12" class="f1"/>',
    flag: '<path d="M22 8v86" class="s" stroke-width="8"/><path d="M26 12h58l-10 18 10 18H26z" fill="#EF4444" class="s"/>'
  };
  const icon = (name, px, extra) => `<svg width="${px}" height="${px}" viewBox="0 0 100 100" ${extra || ''}>${ICON[name] || ICON.star}</svg>`;

  // ---------- buddy character ----------
  const FACE = {
    wow: '<ellipse cx="80" cy="112" rx="13" ry="17" class="fk"/><ellipse cx="130" cy="112" rx="13" ry="17" class="fk"/><circle cx="84" cy="106" r="4" class="fw"/><circle cx="134" cy="106" r="4" class="fw"/><ellipse cx="105" cy="156" rx="12" ry="15" fill="#E2231A" stroke="#111" stroke-width="5"/>',
    shock: '<circle cx="80" cy="112" r="21" class="fw" stroke="#111" stroke-width="6"/><circle cx="130" cy="112" r="21" class="fw" stroke="#111" stroke-width="6"/><circle cx="80" cy="112" r="7" class="fk"/><circle cx="130" cy="112" r="7" class="fk"/><path d="M58 80l28 8M152 80l-28 8" stroke="#111" stroke-width="7" stroke-linecap="round"/><ellipse cx="105" cy="162" rx="19" ry="21" class="fk"/><path d="M176 60q12 18 0 26q-12-8 0-26z" fill="#6fc6ff" stroke="#111" stroke-width="4"/>',
    think: '<circle cx="80" cy="116" r="13" class="fw" stroke="#111" stroke-width="5"/><circle cx="130" cy="116" r="13" class="fw" stroke="#111" stroke-width="5"/><circle cx="85" cy="109" r="6" class="fk"/><circle cx="135" cy="109" r="6" class="fk"/><path d="M62 93l30-6M118 87l30 6" stroke="#111" stroke-width="6" stroke-linecap="round"/><path d="M88 158q15-6 32 2" stroke="#111" stroke-width="7" fill="none" stroke-linecap="round"/>',
    happy: '<path d="M66 118q14-18 28 0M116 118q14-18 28 0" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M74 142q31 38 62 0z" fill="#E2231A" stroke="#111" stroke-width="6" stroke-linejoin="round"/><circle cx="62" cy="140" r="9" fill="#ff8fa3" opacity=".8"/><circle cx="148" cy="140" r="9" fill="#ff8fa3" opacity=".8"/>',
    laugh: '<path d="M64 108l26 10-26 10M146 108l-26 10 26 10" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M68 140q37 50 74 0z" fill="#E2231A" stroke="#111" stroke-width="6"/><path d="M50 126q-6 12 2 18M160 126q6 12-2 18" stroke="#6fc6ff" stroke-width="6" fill="none" stroke-linecap="round"/>',
    sad: '<circle cx="80" cy="116" r="9" class="fk"/><circle cx="130" cy="116" r="9" class="fk"/><path d="M64 96l24-8M146 96l-24-8" stroke="#111" stroke-width="6" stroke-linecap="round"/><path d="M82 166q23-20 46 0" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M78 130q-6 14 0 18q6-4 0-18z" fill="#6fc6ff"/>',
    angry: '<circle cx="80" cy="118" r="9" class="fk"/><circle cx="130" cy="118" r="9" class="fk"/><path d="M60 92l30 14M150 92l-30 14" stroke="#111" stroke-width="9" stroke-linecap="round"/><path d="M82 164q23-16 46 0" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/>',
    cool: '<path d="M54 102h102l-6 22q-20 8-38-2l-2-8h-10l-2 8q-18 10-38 2z" class="fk"/><path d="M84 152q21 14 42 0" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/>',
    love: '<path d="M80 128c-14-10-20-16-20-24 0-6 5-10 10-10 4 0 8 3 10 6 2-3 6-6 10-6 5 0 10 4 10 10 0 8-6 14-20 24zM130 128c-14-10-20-16-20-24 0-6 5-10 10-10 4 0 8 3 10 6 2-3 6-6 10-6 5 0 10 4 10 10 0 8-6 14-20 24z" fill="#FF4D6D"/><path d="M80 150q25 24 50 0" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/>',
    wink: '<circle cx="80" cy="114" r="10" class="fk"/><path d="M118 116q12-10 24 0" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M80 148q25 22 50 0" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/>'
  };
  const BODY = {
    ball: '<circle cx="105" cy="110" r="92" class="fw" stroke="#111" stroke-width="9"/><path d="M105 20l28 20-10 32H87L77 40z" class="fk"/><path d="M28 85l26-6 16 26-14 26-26-4" class="fk"/><path d="M182 85l-26-6-16 26 14 26 26-4" class="fk"/><path d="M75 190l12-26h36l12 26" class="fk"/>',
    blob: '<path d="M105 18c50 0 92 30 92 92s-40 88-92 88S13 172 13 110 55 18 105 18z" class="f1" stroke="#111" stroke-width="9"/><ellipse cx="70" cy="60" rx="22" ry="12" fill="#fff" opacity=".35" transform="rotate(-25 70 60)"/>',
    bot: '<rect x="22" y="38" width="166" height="150" rx="34" class="f2" stroke="#111" stroke-width="9"/><path d="M105 38V14" stroke="#111" stroke-width="8"/><circle cx="105" cy="12" r="10" class="f1" stroke="#111" stroke-width="5"/><rect x="40" y="74" width="130" height="100" rx="24" class="fw" opacity=".9"/>',
    star: '<path d="M105 8l28 62 68 6-52 44 16 66-60-36-60 36 16-66L9 76l68-6z" class="f1" stroke="#111" stroke-width="9" stroke-linejoin="round"/>'
  };

  // ---------- components: (g, zone) => {el, w?, h?, anim(tl,t0,t1)} ----------
  const textHi = s => esc(s).split(/\s+/).map(w => w.startsWith('*') ? `<span class="tw hi">${w.replace(/\*/g, '')}</span>` : `<span class="tw">${w}</span>`).join(' ');
  const C = {};
  C.title = (g, Z) => {
    const el = mk('div', 'ttl', textHi(g.text));
    el.style.fontSize = (g.size || (PORT ? 130 : 120)) + 'px'; el.style.maxWidth = Z.w + 'px';
    if (g.sub) mk('div', 'lbl', esc(g.sub), el).style.cssText = `font-family:var(--fb);font-weight:800;font-size:.32em;margin-top:.3em;`;
    return { el, anim: (tl, t0) => tl.from(el.querySelectorAll('.tw'), { y: 90, autoAlpha: 0, rotation: -6, duration: .35, stagger: g.stagger || .12, ease: EASE }, t0) };
  };
  C.stamp = (g) => {
    const el = mk('div', 'stamp', esc(g.text)); el.style.fontSize = (g.size || 88) + 'px';
    const rot = g.rot != null ? g.rot : -6; el.style.transform = `rotate(${rot}deg)`;
    return { el, anim: (tl, t0) => tl.from(el, { scale: 0, rotation: rot - 25, duration: .3, ease: 'back.out(3)' }, t0) };
  };
  C.lower = (g) => {
    const el = mk('div', 'card', `<div class="disp" style="font-size:58px;line-height:1.05;text-transform:var(--case)">${esc(g.name)}</div>` + (g.role ? `<div style="font-size:32px;font-weight:700;opacity:.85;margin-top:6px">${esc(g.role)}</div>` : ''));
    el.style.cssText += 'padding:22px 36px;border-left:16px solid var(--a1);max-width:100%;';
    return { el, anim: (tl, t0) => tl.from(el, { x: -420, duration: .45, ease: 'expo.out' }, t0) };
  };
  C.icon = (g) => {
    const px = g.size || 260, el = mk('div', '', icon(g.icon, px) + (g.label ? `<div class="lbl" style="font-size:${g.labelSize || 60}px;margin-top:8px">${esc(g.label)}</div>` : ''));
    el.style.textAlign = 'center';
    return { el, w: Math.max(px, g.label ? g.label.length * 34 : 0), h: px + (g.label ? 90 : 0), anim: (tl, t0, t1) => { tl.from(el.firstChild, { scale: 0, rotation: -30, duration: .4, ease: 'back.out(3)', transformOrigin: '50% 50%' }, t0); tl.to(el.firstChild, { y: -14, duration: .35, yoyo: true, repeat: Math.max(0, Math.floor((t1 - t0 - .8) / .35)), ease: 'sine.inOut' }, t0 + .4); } };
  };
  C.icons = (g) => {
    const px = g.size || 190, items = g.items.map(it => typeof it === 'string' ? { icon: it } : it);
    const el = mk('div', '', items.map(it => `<div style="display:inline-block;text-align:center;margin:0 18px;vertical-align:top">${icon(it.icon, px)}${it.label ? `<div class="lbl" style="font-size:44px;margin-top:6px">${esc(it.label)}</div>` : ''}</div>`).join(''));
    el.style.whiteSpace = 'nowrap';
    return { el, w: items.length * (px + 36), h: px + 70, anim: (tl, t0) => tl.from(el.children, { scale: 0, y: 60, duration: .35, stagger: g.at ? 0 : .18, ease: EASE }, t0) };
  };
  C.count = (g) => {
    const el = mk('div', '', `<div class="ttl" style="font-size:${g.size || 200}px;color:var(--a1);line-height:1">0</div>` + (g.label ? `<div class="chip" style="font-size:48px;margin-top:20px">${esc(g.label)}</div>` : ''));
    el.style.textAlign = 'center';
    const num = el.firstChild, o = { v: g.from || 0 }, fmt = new Intl.NumberFormat(g.locale || 'en-US', { maximumFractionDigits: g.decimals || 0, minimumFractionDigits: g.decimals || 0 });
    const show = () => { num.textContent = (g.prefix || '') + fmt.format(o.v) + (g.suffix || ''); };
    show();
    return { el, anim: (tl, t0) => { tl.to(o, { v: g.to, duration: g.dur || 1.4, ease: 'power3.out', onUpdate: show }, t0 + .05); tl.fromTo(num, { scale: 1 }, { scale: 1.12, duration: .12, yoyo: true, repeat: 1, immediateRender: false }, t0 + (g.dur || 1.4)); if (g.label) tl.from(el.lastChild, { autoAlpha: 0, y: 30, duration: .3 }, t0 + .5); } };
  };
  C.vs = (g) => {
    const ca = g.ca || a1, cb = g.cb || a2;
    const shield = (x, c) => `<g transform="translate(${x} 170)"><g class="sh"><path d="M-110 -120H110V20Q110 105 0 145Q-110 105 -110 20Z" fill="${c}" stroke="#111" stroke-width="10"/></g></g>`;
    const el = mk('div', '', `<svg width="900" height="420" viewBox="0 0 900 420">${shield(220, ca)}${shield(680, cb)}<g transform="translate(450 170)"><g class="vsx"><path d="M0-110 26-36 104-46 42 8 86 84 8 42-36 110-32 28-108 18-42-24-74-94-8-46Z" class="f3" stroke="#111" stroke-width="8"/><text y="24" text-anchor="middle" class="disp fi" font-size="74">VS</text></g></g></svg><div style="display:flex;justify-content:space-between;margin-top:-50px"><div class="lbl" style="font-size:56px;width:440px">${esc(g.a || '')}</div><div class="lbl" style="font-size:56px;width:440px">${esc(g.b || '')}</div></div>`);
    const sh = el.querySelectorAll('.sh');
    return { el, w: 900, h: 480, anim: (tl, t0) => { tl.from(sh[0], { x: -500, duration: .45, ease: 'power3.out' }, t0); tl.from(sh[1], { x: 500, duration: .45, ease: 'power3.out' }, t0); tl.from(el.querySelector('.vsx'), { scale: 0, rotation: -40, svgOrigin: '0 0', duration: .35, ease: 'back.out(3)' }, t0 + .4); } };
  };
  C.split = (g) => {
    const panel = (txt, c, ic) => `<div class="card" style="width:430px;height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${c};color:#fff;border-color:#111">${ic ? icon(ic, 120) : ''}<div class="disp" style="font-size:60px;text-transform:var(--case)">${esc(txt)}</div></div>`;
    const el = mk('div', '', `<div style="display:flex;gap:60px;align-items:center;position:relative">${panel(g.a, g.ca || a2, g.ia)}${panel(g.b, g.cb || a1, g.ib)}<div class="link" style="position:absolute;left:400px;top:118px;width:120px;height:24px;background:var(--a3);border:4px solid #111;border-radius:12px"></div></div>` + (g.tag ? `<div style="text-align:center;margin-top:26px"><div class="chip" style="font-size:46px">${esc(g.tag)}</div></div>` : ''));
    const p = el.querySelectorAll('.card');
    return { el, w: 920, h: g.tag ? 380 : 270, anim: (tl, t0) => { tl.from(p[0], { x: -300, autoAlpha: 0, duration: .4, ease: 'power3.out' }, t0); tl.from(p[1], { x: 300, autoAlpha: 0, duration: .4, ease: 'power3.out' }, t0 + .08); tl.from(el.querySelector('.link'), { scaleX: 0, duration: .3 }, t0 + .5); if (g.tag) tl.from(el.lastChild, { autoAlpha: 0, y: 30, duration: .3 }, t0 + .8); } };
  };
  C.list = (g) => {
    const el = mk('div', 'card', (g.title ? `<div class="disp" style="font-size:60px;margin-bottom:14px;text-transform:var(--case)">${esc(g.title)}</div>` : '') + g.items.map(i => `<div class="li" style="display:flex;align-items:center;gap:18px;font-size:44px;font-weight:800;margin:10px 0">${icon(g.icon || 'check', 56)}<span>${esc(i)}</span></div>`).join(''));
    el.style.cssText += 'padding:30px 40px;max-width:100%;';
    return { el, anim: (tl, t0) => el.querySelectorAll('.li').forEach((li, i) => tl.from(li, { x: -80, autoAlpha: 0, duration: .3, ease: EASE }, g.at ? g.at[i] : t0 + .3 + i * (g.gap || .6))) };
  };
  C.quote = (g) => {
    const el = mk('div', 'card', `<div class="disp" style="font-size:150px;line-height:.6;color:var(--a1);height:70px">&ldquo;</div><div class="disp" style="font-size:${g.size || 64}px;line-height:1.1">${esc(g.text)}</div>` + (g.by ? `<div style="font-size:34px;font-weight:800;margin-top:16px;opacity:.8">— ${esc(g.by)}</div>` : ''));
    el.style.cssText += 'padding:36px 44px;max-width:100%;';
    return { el, anim: (tl, t0) => tl.from(el, { y: 80, rotation: -3, duration: .45, ease: EASE }, t0) };
  };
  C.buddy = (g) => {
    const el = mk('div', '', `<svg width="210" height="210" viewBox="0 0 210 210">${BODY[g.kind || 'ball']}${FACE[g.face || 'wow']}</svg>` + (g.say ? `<div class="stamp" style="position:absolute;left:-150px;top:-80px;font-size:52px">${esc(g.say)}</div>` : ''));
    el.style.position = 'relative';
    return { el, w: 210, h: 210, anim: (tl, t0, t1) => { tl.from(el.firstChild, { scale: 0, rotation: -40, transformOrigin: '50% 100%', duration: .35, ease: 'back.out(2.5)' }, t0); tl.to(el.firstChild, { y: -14, duration: .3, yoyo: true, repeat: Math.max(1, Math.floor((t1 - t0 - .6) / .3)), ease: 'sine.inOut' }, t0 + .35); if (g.say) tl.from(el.lastChild, { scale: 0, duration: .25, ease: 'back.out(3)' }, t0 + .25); } };
  };
  C.burst = (g) => {
    const fx = face[0] * OW, fy = face[1] * OH, R = g.r || 330;
    let lines = '';
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + .3, c = Math.cos(a), s = Math.sin(a); lines += `<line x1="${fx + c * R}" y1="${fy + s * R}" x2="${fx + c * (R + 110)}" y2="${fy + s * (R + 110)}"/>`; }
    const el = mk('div', '', `<svg width="${OW}" height="${OH}" style="position:absolute;left:0;top:0"><g stroke="${g.color || a1}" stroke-width="16" stroke-linecap="round">${lines}</g></svg>` + (g.say ? `<div class="stamp" style="position:absolute;left:${fx + R * .35}px;top:${fy - R - 40}px;font-size:64px">${esc(g.say)}</div>` : ''));
    el.style.cssText = `position:absolute;left:0;top:0;width:${OW}px;height:${OH}px`;
    return { el, abs: true, anim: (tl, t0) => { tl.from(el.firstChild, { scale: .6, transformOrigin: `${fx}px ${fy}px`, duration: .2, ease: 'back.out(3)' }, t0); if (g.say) tl.from(el.lastChild, { scale: 0, rotation: -20, duration: .3, ease: 'back.out(3)' }, t0 + .05); } };
  };
  C.marks = (g) => {
    const fx = face[0] * OW, fy = face[1] * OH, ch = esc(g.char || '?');
    const spots = [[-.38, -.05, 190, -14, a1], [.32, -.18, 150, 12, '#fff'], [.38, .15, 110, 18, a1]];
    const el = mk('div', '', spots.map(([dx, dy, fs, r, c]) => `<div class="ttl mk" style="position:absolute;left:${fx + dx * OW}px;top:${fy + dy * OH - fs / 2}px;font-size:${fs}px;color:${c};transform:rotate(${r}deg)">${ch}</div>`).join(''));
    el.style.cssText = `position:absolute;left:0;top:0;width:${OW}px;height:${OH}px`;
    return { el, abs: true, anim: (tl, t0) => { tl.from(el.children, { scale: 0, autoAlpha: 0, duration: .25, stagger: .08, ease: 'back.out(3)' }, t0); tl.to(el.children, { y: -30, duration: .6, ease: 'sine.inOut' }, t0 + .3); } };
  };
  C.image = (g) => {
    const el = mk('img', 'card'); el.src = g.src; el.style.cssText += `width:${g.w || 520}px;height:auto;padding:0;object-fit:cover;${g.round ? 'border-radius:50%;' : ''}`;
    return { el, anim: (tl, t0) => tl.from(el, { scale: .3, rotation: -10, duration: .4, ease: EASE }, t0) };
  };
  C.chapter = (g) => {
    const el = mk('div', 'card', (g.num != null ? `<div class="chip" style="font-size:44px;margin-right:30px">${esc(g.num)}</div>` : '') + `<div class="disp" style="font-size:${g.size || 84}px;text-transform:var(--case)">${esc(g.text)}</div>`);
    el.style.cssText += 'display:flex;align-items:center;padding:26px 48px;';
    return { el, anim: (tl, t0) => tl.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: .5, ease: 'power3.inOut', immediateRender: false }, t0) };
  };
  C.cta = (g) => {
    const el = mk('div', '', `<div class="card btn" style="display:inline-flex;align-items:center;gap:22px;padding:22px 44px;background:#FF0000;color:#fff;border-color:#111">${icon('play', 80)}<span class="disp t" style="font-size:66px;text-transform:uppercase">${esc(g.text || 'Subscribe')}</span>${icon('bell', 70)}</div><svg class="cur" width="90" height="90" viewBox="0 0 100 100" style="position:absolute;left:62%;top:60%"><path d="M14 6l70 46-30 6 18 32-14 8-18-32-22 22z" fill="#fff" stroke="#111" stroke-width="6" stroke-linejoin="round"/></svg>`);
    el.style.position = 'relative';
    const btn = el.querySelector('.btn'), cur = el.querySelector('.cur'), txt = el.querySelector('.t');
    return { el, anim: (tl, t0) => { tl.from(btn, { scale: 0, duration: .4, ease: EASE }, t0); tl.from(cur, { x: 300, y: 250, duration: .6, ease: 'power2.out' }, t0 + .3); tl.to(cur, { scale: .8, duration: .08, yoyo: true, repeat: 1 }, t0 + .95); tl.to(btn, { background: '#333', duration: .05 }, t0 + 1.0); tl.call(() => {}, null, t0 + 1.0); tl.set(txt, { textContent: g.done || 'Subscribed' }, t0 + 1.0); } };
  };
  C.bars = (g) => {
    const max = Math.max(...g.items.map(i => i[1])), n = g.items.length, bw = Math.min(160, 760 / n - 30);
    const el = mk('div', '', `<div style="display:flex;align-items:flex-end;gap:30px;height:420px">${g.items.map((it, i) => `<div style="text-align:center;width:${bw}px"><div class="lbl" style="font-size:44px">${esc((g.prefix || '') + it[1] + (g.suffix || ''))}</div><div class="bar card" style="height:${300 * it[1] / max}px;background:${[a1, a2, a3][i % 3]};border-color:#111;transform-origin:50% 100%"></div><div class="lbl" style="font-size:36px;margin-top:8px">${esc(it[0])}</div></div>`).join('')}</div>`);
    return { el, w: n * (bw + 30), h: 480, anim: (tl, t0) => tl.from(el.querySelectorAll('.bar'), { scaleY: 0, duration: .5, stagger: .15, ease: EASE }, t0 + .1) };
  };
  C.flag = (g) => {
    const st = g.stripes || ['#FF9933', '#ffffff', '#138808'], n = st.length, v = g.vertical;
    const rects = st.map((c, i) => v ? `<rect x="${i * 320 / n}" y="0" width="${320 / n + 1}" height="200" fill="${c}"/>` : `<rect x="0" y="${i * 200 / n}" width="320" height="${200 / n + 1}" fill="${c}"/>`).join('');
    const em = g.emblem === 'wheel' ? '<circle cx="160" cy="100" r="26" fill="none" stroke="#000080" stroke-width="5"/><circle cx="160" cy="100" r="5" fill="#000080"/>' : g.emblem === 'dot' ? `<circle cx="160" cy="100" r="40" fill="${g.emblemColor || '#BC002D'}"/>` : g.emblem === 'star' ? `<path d="M160 60l12 26 28 3-21 19 6 28-25-15-25 15 6-28-21-19 28-3z" fill="${g.emblemColor || '#FFDE00'}"/>` : '';
    const el = mk('div', '', `<svg width="420" height="320" viewBox="-20 -20 380 300"><rect x="-12" y="-10" width="12" height="290" rx="6" fill="#d9d4cc" stroke="#111" stroke-width="5"/><g class="cloth"><g>${rects}${em}</g><rect x="0" y="0" width="320" height="200" fill="none" stroke="#111" stroke-width="7"/></g></svg>` + (g.label ? `<div class="lbl" style="font-size:56px">${esc(g.label)}</div>` : ''));
    el.style.textAlign = 'center';
    const cl = el.querySelector('.cloth');
    return { el, w: 420, h: g.label ? 390 : 320, anim: (tl, t0, t1) => { tl.from(cl, { scaleX: 0, svgOrigin: '0 100', duration: .5, ease: 'back.out(1.6)' }, t0); tl.to(cl, { skewY: 3, svgOrigin: '0 100', duration: .4, yoyo: true, repeat: Math.max(1, Math.floor((t1 - t0 - .6) / .4)), ease: 'sine.inOut' }, t0 + .5); } };
  };
  C.annot = (g) => {
    let d;
    if (g.shape === 'arrow') { const [x1, y1] = [g.from[0] * OW, g.from[1] * OH], [x2, y2] = [g.to[0] * OW, g.to[1] * OH], mx = (x1 + x2) / 2 - (y2 - y1) * .25, my = (y1 + y2) / 2 + (x2 - x1) * .25, ang = Math.atan2(y2 - my, x2 - mx);
      d = `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}M${x2 - 50 * Math.cos(ang - .5)} ${y2 - 50 * Math.sin(ang - .5)}L${x2} ${y2}L${x2 - 50 * Math.cos(ang + .5)} ${y2 - 50 * Math.sin(ang + .5)}`;
    } else { const [x, y, w, h] = [g.rect[0] * OW, g.rect[1] * OH, g.rect[2] * OW, g.rect[3] * OH];
      d = g.shape === 'box' ? `M${x} ${y}h${w}v${h}h${-w}z` : `M${x + w / 2} ${y - 6}a${w / 2} ${h / 2} 0 1 1 -2 0`; }
    const el = mk('div', '', `<svg width="${OW}" height="${OH}"><path d="${d}" fill="none" stroke="${g.color || a1}" stroke-width="${g.width || 12}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>` + (g.label ? `<div class="stamp" style="position:absolute;left:${(g.labelAt || [.1, .1])[0] * OW}px;top:${(g.labelAt || [.1, .1])[1] * OH}px;font-size:56px">${esc(g.label)}</div>` : ''));
    el.style.cssText = `position:absolute;left:0;top:0;width:${OW}px;height:${OH}px`;
    return { el, abs: true, anim: (tl, t0) => { tl.to(el.querySelector('path'), { strokeDashoffset: 0, duration: .5, ease: 'power2.out' }, t0); if (g.label) tl.from(el.lastChild, { scale: 0, duration: .3, ease: 'back.out(3)' }, t0 + .3); } };
  };

  // ---------- graphics timeline ----------
  const tl = gsap.timeline();
  window.__tl = tl;
  (E.graphics || []).forEach((g, i) => {
    const comp = C[g.type];
    if (!comp) { console.warn('editkit: unknown graphic type ' + g.type); return; }
    const t0 = g.t, t1 = g.end != null ? g.end : g.t + (g.dur || 2.5);
    const Z = zone(g.zone || (g.type === 'buddy' ? 'corner' : null));
    const r = comp(g, Z);
    const wrap = mk('div', 'gw', null, gfx);
    if (r.abs) { wrap.style.cssText += `left:0;top:0;width:${OW}px;height:${OH}px`; wrap.appendChild(r.el); }
    else {
      wrap.style.cssText += `left:${Z.x}px;top:${Z.y}px;width:${Z.w}px;height:${Z.h}px;display:flex;align-items:center;justify-content:center`;
      const inner = mk('div', 'gi', null, wrap); inner.appendChild(r.el);
      if (r.w) { const fit = Math.min(1, Z.w / r.w, Z.h / r.h) * (g.scale || 1); inner.style.cssText = `width:${r.w}px;height:${r.h}px;flex:none;transform:scale(${fit});position:relative`; }
      else if (g.scale) inner.style.transform = `scale(${g.scale})`;
    }
    tl.set(wrap, { autoAlpha: 1 }, t0);
    tl.fromTo(wrap, { scale: r.abs ? 1 : .85 }, { scale: 1, duration: .3, ease: EASE, immediateRender: false }, t0);
    if (r.anim) r.anim(tl, t0, t1);
    tl.to(wrap, { autoAlpha: 0, scale: r.abs ? 1 : .8, duration: .2, ease: 'power2.in' }, t1);
  });

  // ---------- chrome ----------
  const CH = E.chrome || {}, endT = E.end || E.dur;
  if (CH.pills && CH.pills.length) {
    const top = mk('div', '', CH.pills.map((p, i) => `<div class="pill p${i ? 1 : 0}" style="font-size:${PORT ? 30 : 26}px">${esc(p)}</div>`).join(''), chrome);
    top.style.cssText = `position:absolute;top:${PORT ? 70 : 40}px;left:0;right:0;display:flex;justify-content:${PORT ? 'center' : 'flex-start'};gap:16px;padding:0 ${PORT ? 0 : 50}px`;
    tl.fromTo(top, { y: -160, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .45, ease: 'back.out(1.8)', immediateRender: true }, CH.pillsAt || .1);
    tl.to(top, { y: -160, autoAlpha: 0, duration: .3, ease: 'power2.in' }, CH.pillsUntil || endT - .3);
  }
  let prog = null;
  if (CH.progress) { prog = mk('div', '', null, chrome); prog.id = 'progress'; }

  // ---------- fx ----------
  const fxList = T.fx || [], R = rng(7), dyn = [];
  const canvas = mk('canvas', 'fx', null, fxL); canvas.width = Math.round(OW / 2); canvas.height = Math.round(OH / 2); canvas.style.width = OW + 'px'; canvas.style.height = OH + 'px';
  const cx = canvas.getContext('2d');
  const edge = (y) => y < .25 * OH || y > .75 * OH; // keep particles off the face band
  const svgDeco = (svg, css) => { const d = mk('div', 'deco', svg, fxL); d.style.cssText += css; return d; };
  fxList.forEach(f => {
    if (['grain', 'noise', 'scanlines', 'halftone', 'vignette', 'paper-tint', 'vapor-tint', 'grid-light', 'grid-blue', 'pixel-grid', 'iso-grid', 'aida', 'hatch', 'brick-dark', 'blinds', 'light-rays', 'op-rings', 'horizon'].includes(f)) { mk('div', 'fx fx-' + f, null, fxL); return; }
    if (f === 'tiltshift') { mk('div', 'fx-tiltshift-top', null, fxL); mk('div', 'fx-tiltshift-bot', null, fxL); return; }
    if (['particles', 'sparkles', 'bubbles', 'dust', 'ascii-rain'].includes(f)) {
      const n = { particles: 70, sparkles: 18, bubbles: 22, dust: 60, 'ascii-rain': 26 }[f];
      const P = []; for (let i = 0; i < n; i++) { let y = R() * OH; P.push({ x: R() * OW, y, s: .4 + R(), v: .3 + R(), ph: R() * 6.28, ch: '01#*+=/\\'[Math.floor(R() * 8)] }); }
      dyn.push(t => P.forEach(p => {
        const X = (p.x + Math.sin(t * .5 * p.v + p.ph) * 30) / 2;
        if (f === 'particles') { const Y = ((p.y - t * 40 * p.v) % OH + OH) % OH; if (!edge(Y)) return; cx.globalAlpha = .35 + .35 * Math.sin(t * 3 + p.ph); cx.fillStyle = p.s > .9 ? a1 : a2; cx.beginPath(); cx.arc(X, Y / 2, 2 + p.s * 2.5, 0, 7); cx.fill(); }
        if (f === 'dust') { const Y = ((p.y + t * 12 * p.v) % OH + OH) % OH; cx.globalAlpha = .25; cx.fillStyle = '#fff'; cx.fillRect(X, Y / 2, 1.5, 1.5); }
        if (f === 'bubbles') { const Y = ((p.y - t * 60 * p.v) % OH + OH) % OH; if (!edge(Y)) return; cx.globalAlpha = .55; cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(X, Y / 2, 8 + p.s * 14, 0, 7); cx.stroke(); cx.globalAlpha = .35; cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(X - 4, Y / 2 - 5, 3 + p.s * 2, 0, 7); cx.fill(); }
        if (f === 'sparkles') { const k = (Math.sin(t * 2.2 * p.v + p.ph) + 1) / 2; if (!edge(p.y)) return; cx.globalAlpha = k; cx.fillStyle = '#fff'; const r = 4 + 10 * k * p.s, y = p.y / 2; cx.beginPath(); cx.moveTo(X, y - r); cx.lineTo(X + r * .25, y); cx.lineTo(X, y + r); cx.lineTo(X - r * .25, y); cx.fill(); cx.beginPath(); cx.moveTo(X - r, y); cx.lineTo(X, y + r * .25); cx.lineTo(X + r, y); cx.lineTo(X, y - r * .25); cx.fill(); }
        if (f === 'ascii-rain') { if (X > OW * .12 && X < OW * .38) return; cx.globalAlpha = .45; cx.fillStyle = a1; cx.font = '14px monospace'; for (let k = 0; k < 12; k++) { const Y = ((p.y + t * 160 * p.v - k * 16) % OH + OH) % OH; cx.globalAlpha = .45 * (1 - k / 12); cx.fillText('01#*+=/\\'[(k + Math.floor(t * 8 + p.ph)) % 8], X, Y / 2); } }
      }));
      return;
    }
    if (f === 'aurora' || f === 'aurora-soft') {
      const al = f === 'aurora' ? .42 : .25;
      dyn.push(t => [[a1, .2, .05], [a2, .8, .1], [a3, .5, .95]].forEach(([c, x, y], i) => { const X = (x + .12 * Math.sin(t * .4 + i * 2)) * OW / 2, Y = (y + .04 * Math.cos(t * .5 + i)) * OH / 2, g = cx.createRadialGradient(X, Y, 0, X, Y, OW * .45); g.addColorStop(0, c); g.addColorStop(1, 'transparent'); cx.globalAlpha = al; cx.fillStyle = g; cx.fillRect(0, 0, OW / 2, OH / 2); }));
      return;
    }
    if (f === 'speedlines-soft') { let s = ''; for (let i = 0; i < 60; i++) { const a = R() * 6.283, r0 = Math.max(OW, OH) * (.45 + R() * .1); s += `<line x1="${OW / 2 + Math.cos(a) * r0}" y1="${OH / 2 + Math.sin(a) * r0}" x2="${OW / 2 + Math.cos(a) * OH}" y2="${OH / 2 + Math.sin(a) * OH}"/>`; } const d = svgDeco(`<svg width="${OW}" height="${OH}"><g stroke="#000" stroke-width="3" opacity=".22">${s}</g></svg>`, 'inset:0;'); dyn.push(t => { d.style.transform = `rotate(${Math.sin(t * 7) * .6}deg)`; }); return; }
    const corner = (svg, pos, amp) => { const d = svgDeco(svg, pos); dyn.push(t => { d.style.transform = `translateY(${Math.sin(t * 1.2 + pos.length) * (amp || 8)}px) rotate(${Math.sin(t * .8) * 2}deg)`; }); };
    if (f === 'shapes-memphis') { corner(`<svg width="260" height="260"><path d="M20 60q30-40 60 0t60 0 60 0" stroke="${a2}" stroke-width="12" fill="none"/><circle cx="190" cy="170" r="40" fill="${a1}" stroke="#111" stroke-width="6"/><path d="M40 200l50-60 30 70z" fill="${a3}" stroke="#111" stroke-width="6"/></svg>`, 'left:0;top:180px;'); corner(`<svg width="240" height="240"><rect x="40" y="30" width="80" height="80" fill="${a3}" stroke="#111" stroke-width="6" transform="rotate(15 80 70)"/><g fill="#111">${[0, 1, 2, 3].map(i => [0, 1, 2].map(j => `<circle cx="${140 + i * 22}" cy="${150 + j * 22}" r="5"/>`).join('')).join('')}</g></svg>`, `right:0;top:${OH * .45}px;`); return; }
    if (f === 'shapes-bauhaus') { corner(`<svg width="300" height="300"><circle cx="70" cy="70" r="70" fill="${a1}"/><rect x="120" y="140" width="130" height="130" fill="${a2}"/><path d="M0 300 140 160V300z" fill="${a3}"/></svg>`, `left:-60px;top:${OH - 260}px;`); corner(`<svg width="220" height="220"><path d="M0 0h220v220A220 220 0 0 1 0 0z" fill="${a3}"/><circle cx="160" cy="60" r="34" fill="${a1}"/></svg>`, 'right:0;top:150px;'); return; }
    if (f === 'atomic') { corner(`<svg width="220" height="220"><g stroke="${a1}" stroke-width="8" fill="none"><ellipse cx="110" cy="110" rx="100" ry="34"/><ellipse cx="110" cy="110" rx="100" ry="34" transform="rotate(60 110 110)"/><ellipse cx="110" cy="110" rx="100" ry="34" transform="rotate(120 110 110)"/></g><circle cx="110" cy="110" r="16" fill="${a2}"/></svg>`, 'right:20px;top:180px;'); corner(`<svg width="160" height="160"><path d="M80 0l12 68 68 12-68 12-12 68-12-68L0 80l68-12z" fill="${a3}"/></svg>`, `left:20px;top:${OH * .62}px;`); return; }
    if (f === 'vines') { corner(`<svg width="300" height="420"><path d="M10 410C60 300 10 220 80 150S140 40 230 10" stroke="${a3}" stroke-width="8" fill="none"/>${[[60, 300], [70, 170], [150, 80]].map(([x, y]) => `<path d="M${x} ${y}q40-30 70 0q-35 30-70 0z" fill="${a2}" stroke="${a3}" stroke-width="3"/>`).join('')}<circle cx="230" cy="14" r="16" fill="${a1}"/></svg>`, `left:0;top:${OH - 440}px;`, 4); return; }
    if (f === 'line-doodles') { corner(`<svg width="260" height="200"><path d="M10 100q40-80 80 0t80 0 80 0" stroke="${ink}" stroke-width="5" fill="none"/><circle cx="210" cy="40" r="22" stroke="${a2}" stroke-width="5" fill="none"/></svg>`, 'left:20px;top:200px;'); corner(`<svg width="220" height="220"><path d="M20 200 200 20M60 200 200 60M100 200 200 100" stroke="${ink}" stroke-width="5"/></svg>`, `right:10px;top:${OH * .6}px;`); return; }
    if (f === 'deco-frame') { svgDeco(`<svg width="${OW}" height="${OH}"><g stroke="${a1}" fill="none" stroke-width="4"><rect x="24" y="24" width="${OW - 48}" height="${OH - 48}"/><rect x="38" y="38" width="${OW - 76}" height="${OH - 76}" stroke-width="2"/>${[[24, 24, 1, 1], [OW - 24, 24, -1, 1], [24, OH - 24, 1, -1], [OW - 24, OH - 24, -1, -1]].map(([x, y, a, b]) => `<path d="M${x} ${y + b * 120}L${x + a * 60} ${y + b * 60}L${x + a * 120} ${y}"/><path d="M${x} ${y + b * 80}L${x + a * 80} ${y}"/>`).join('')}</g></svg>`, 'inset:0;'); return; }
    if (f === 'hud-frame') { const d = svgDeco(`<svg width="${OW}" height="${OH}"><g stroke="${a1}" fill="none" stroke-width="4">${[[30, 30, 1, 1], [OW - 30, 30, -1, 1], [30, OH - 30, 1, -1], [OW - 30, OH - 30, -1, -1]].map(([x, y, a, b]) => `<path d="M${x} ${y + b * 90}V${y}H${x + a * 90}"/>`).join('')}<circle cx="${face[0] * OW}" cy="${face[1] * OH}" r="${OW * .36}" stroke-dasharray="20 14" opacity=".35"/></g><text x="${OW - 60}" y="${OH - 60}" text-anchor="end" fill="${a1}" font-family="monospace" font-size="26" class="hudt">REC ●</text></svg>`, 'inset:0;'); const c = d.querySelector('circle'); dyn.push(t => { c.setAttribute('transform', `rotate(${t * 12} ${face[0] * OW} ${face[1] * OH})`); }); return; }
    if (f === 'contours') { let s = ''; for (let i = 0; i < 9; i++) s += `<ellipse cx="${OW * .9}" cy="${OH * .9}" rx="${80 + i * 70}" ry="${60 + i * 52}" transform="rotate(${-20 + i * 3} ${OW * .9} ${OH * .9})"/>`; svgDeco(`<svg width="${OW}" height="${OH}"><g stroke="${a1}" fill="none" stroke-width="3" opacity=".35">${s}</g></svg>`, 'inset:0;'); return; }
    if (f === 'lowpoly') { let s = ''; for (let i = 0; i < 18; i++) { const x = (i % 6) * OW / 5, y = OH - 260 + (i < 6 ? 0 : i < 12 ? 90 : 180); s += `<path d="M${x} ${y}l${OW / 10} ${60 + R() * 60}l${-OW / 5} 0z" fill="${[a1, a2, a3][i % 3]}" opacity="${.35 + R() * .3}"/>`; } svgDeco(`<svg width="${OW}" height="${OH}">${s}</svg>`, 'inset:0;'); return; }
    if (f === 'swirl') { const d = mk('div', 'fx', null, fxL); d.style.cssText += `background:conic-gradient(from 0deg, ${a1}, ${a2}, ${a3}, ${a1});opacity:.22;mix-blend-mode:screen;-webkit-mask-image:radial-gradient(circle at 50% 35%, transparent 38%, #000 78%);`; dyn.push(t => { d.style.transform = `rotate(${t * 20}deg) scale(1.6)`; }); return; }
    if (f === 'clouds') { const P = [...Array(5)].map(() => ({ x: R() * OW, y: (R() < .5 ? .05 + R() * .12 : .8 + R() * .12) * OH, s: .6 + R() * .8 })); dyn.push(t => P.forEach(p => { const X = ((p.x + t * 25 * p.s) % (OW + 400)) - 200; cx.globalAlpha = .7; cx.fillStyle = '#fff'; [[0, 0, 60], [50, -20, 50], [100, 0, 55], [50, 15, 50]].forEach(([dx, dy, r]) => { cx.beginPath(); cx.arc((X + dx * p.s) / 2, (p.y + dy * p.s) / 2, r * p.s / 2, 0, 7); cx.fill(); }); })); return; }
    console.warn('editkit: unknown fx ' + f);
  });

  // ---------- captions (pure function of t) ----------
  const lines = E.lines || [], CAP = E.cap || {};
  const capEl = mk('div', '', null, capbox); capEl.id = 'cap';
  capEl.className = 'mode-' + (CAP.mode || 'highlight');
  const capPos = CAP.pos != null ? CAP.pos : (PORT ? .585 : .84);
  capEl.style.fontSize = ((PORT ? 84 : 62) * (cap.size || 1) * (CAP.size || 1)) + 'px';
  capEl.style.top = (capPos * OH) + 'px'; capEl.style.marginTop = '-.6em';
  let curLine = -1, spans = [];
  function findLine(t) { let lo = 0, hi = lines.length - 1, ans = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (lines[m].s <= t) { ans = m; lo = m + 1; } else hi = m - 1; } return ans >= 0 && t < lines[ans].e ? ans : -1; }
  function drawCaps(t) {
    const i = CAP.off ? -1 : findLine(t);
    if (i !== curLine) {
      curLine = i; capEl.innerHTML = '';
      if (i >= 0) { const ln = mk('span', 'ln', null, capEl); spans = lines[i].w.map((w, k) => { if (k) ln.appendChild(document.createTextNode(' ')); return mk('span', 'w' + (w[3] ? ' em' : ''), esc(w[0]), ln); }); }
    }
    if (i < 0) { capEl.style.visibility = 'hidden'; return; }
    capEl.style.visibility = 'visible';
    const L = lines[i], k = clamp((t - L.s) / .18, 0, 1);
    capEl.style.transform = `translateY(${(1 - easeOut(k)) * 26}px) scale(${.84 + .16 * easeOutBack(k)})`;
    L.w.forEach((w, j) => {
      const next = j + 1 < L.w.length ? L.w[j + 1][1] : L.e, on = t >= w[1] && t < next, past = t >= next, el = spans[j];
      const cls = 'w' + (w[3] ? ' em' : '') + (on ? ' on' : past ? ' past' : ' future');
      if (el.className !== cls) el.className = cls;
      const kk = on ? clamp((t - w[1]) / .15, 0, 1) : 1;
      el.style.transform = on ? `scale(${1.1 - .1 * easeOut(kk)})` : '';
    });
  }

  // ---------- camera (pure function of t) ----------
  const CM = E.camera || {}, shots = E.shots && E.shots.length ? E.shots : [[0, E.dur]];
  const push = CM.push != null ? CM.push : (PORT ? .08 : .045), auto = CM.auto !== false;
  const plan = shots.map(([s, e], i) => { const m = i % 3; return auto ? (m === 0 ? [s, e, 1, 1 + push] : m === 1 ? [s, e, 1 + push * 1.6, 1 + push * .6] : [s, e, 1 + push * .5, 1 + push * 1.5]) : [s, e, 1, 1]; });
  (CM.keys || []).forEach(k => plan.push(k));
  plan.sort((a, b) => a[0] - b[0]);
  const flashes = CM.flash === 'cuts' ? shots.slice(1).map(s => s[0]) : (CM.flash || []);
  function camAt(t) {
    let p = null; for (const q of plan) if (t >= q[0] && t < q[1]) p = q; // latest-starting match wins (keys override shots)
    let s = 1; if (p) { const k = clamp((t - p[0]) / Math.max(.01, p[1] - p[0]), 0, 1), e = .5 - .5 * Math.cos(Math.PI * k); s = p[2] + (p[3] - p[2]) * e; }
    let x = 0, y = 0, r = 0, filt = T.foot || '';
    (CM.punch || []).forEach(([tp, ps, hold = .5]) => { const d = t - tp; if (d < 0 || d > hold + .45) return; const env = d < .1 ? easeOut(d / .1) : d < .1 + hold ? 1 : 1 - easeOut((d - .1 - hold) / .35); s *= 1 + (ps - 1) * clamp(env, 0, 1); });
    (CM.shake || []).forEach(([ts, amp = 16, dur = .4]) => { const d = t - ts; if (d < 0 || d > dur) return; const env = 1 - d / dur; x += amp * env * Math.sin(d * 113); y += amp * .6 * env * Math.cos(d * 82); r += amp * .03 * env * Math.sin(d * 97); });
    (CM.whip || []).forEach(([tw, dir = 1]) => { const d = t - tw; if (d < -.08 || d > .14) return; const k = d < 0 ? 1 + d / .08 : 1 - d / .14; x += dir * k * OW * .12 * U; filt += ` blur(${(k * 14).toFixed(1)}px)`; });
    (CM.glitch || []).forEach(([tg, dur = .3]) => { const d = t - tg; if (d < 0 || d > dur) return; const f = Math.floor(d * 24), j = rng(f + 11); x += (j() - .5) * 60 * U; filt += ` drop-shadow(${(8 * U).toFixed(1)}px 0 0 rgba(255,0,80,.75)) drop-shadow(${(-8 * U).toFixed(1)}px 0 0 rgba(0,255,240,.75))`; if (j() > .5) cam.style.clipPath = `inset(${j() * 40}% 0 ${j() * 40}% 0)`; });
    return { s, x, y, r, filt };
  }

  window.__seek = function (t) {
    cam.style.clipPath = ''; // glitch may set it inside camAt
    const g = camAt(t);
    cam.style.transform = `translate(${g.x}px, ${g.y}px) scale(${g.s}) rotate(${g.r}deg)`;
    cam.style.filter = g.filt;
    let fo = 0; flashes.forEach(tf => { const d = t - tf; if (d >= 0 && d < .2) fo = Math.max(fo, .75 * (1 - d / .2)); });
    flashEl.style.opacity = fo;
    drawCaps(t);
    cx.clearRect(0, 0, canvas.width, canvas.height); dyn.forEach(fn => fn(t)); cx.globalAlpha = 1;
    if (prog) { prog.style.transform = `scaleX(${clamp(t / endT, 0, 1)})`; prog.style.opacity = t > endT ? 0 : 1; }
    const hideAll = E.end != null && t >= E.end;
    fxL.style.visibility = hideAll ? 'hidden' : 'visible';
  };
  window.__seek(0);
})();
