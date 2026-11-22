/* ratemypfp — everything runs locally. no network calls, no trackers. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const startTime = Date.now();

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- base image ---------------- */
const BASE = 512;
const base = document.createElement('canvas'); base.width = base.height = BASE;
const bctx = base.getContext('2d', { willReadFrequently: true });
let eyes = [[0.4, 0.47], [0.6, 0.47]];
let seed = 1337;
let uploaded = false;

function drawPlaceholder() {
  const c = bctx, S = BASE;
  const g = c.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#ffd6e8'); g.addColorStop(.55, '#e3dbff'); g.addColorStop(1, '#c8f1e6');
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  // sparkles
  c.fillStyle = 'rgba(255,255,255,.8)';
  [[80, 90, 10], [430, 110, 7], [400, 400, 9], [70, 380, 6], [250, 60, 5]].forEach(([x, y, r]) => {
    c.beginPath(); c.moveTo(x, y - r * 2); c.quadraticCurveTo(x, y, x + r * 2, y); c.quadraticCurveTo(x, y, x, y + r * 2);
    c.quadraticCurveTo(x, y, x - r * 2, y); c.quadraticCurveTo(x, y, x, y - r * 2); c.fill();
  });
  // shoulders / hoodie
  c.fillStyle = '#9b8cff';
  c.beginPath(); c.ellipse(256, 560, 210, 170, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#b3a8ff';
  c.beginPath(); c.ellipse(256, 545, 120, 70, 0, 0, Math.PI * 2); c.fill();
  // neck
  c.fillStyle = '#f2bfa3'; c.fillRect(226, 330, 60, 70);
  // head
  c.fillStyle = '#ffd7bf';
  c.beginPath(); c.ellipse(256, 250, 118, 132, 0, 0, Math.PI * 2); c.fill();
  // hair
  c.fillStyle = '#2b2140';
  c.beginPath(); c.ellipse(256, 175, 132, 88, 0, Math.PI, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(124, 180); c.quadraticCurveTo(170, 120, 300, 150); c.quadraticCurveTo(360, 170, 388, 200);
  c.quadraticCurveTo(380, 120, 256, 110); c.quadraticCurveTo(140, 110, 124, 180); c.fill();
  c.beginPath(); c.ellipse(140, 230, 22, 60, -.15, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(372, 230, 22, 60, .15, 0, Math.PI * 2); c.fill();
  // eyes
  [[205, 241], [307, 241]].forEach(([x, y]) => {
    c.fillStyle = '#1d1533'; c.beginPath(); c.ellipse(x, y, 15, 19, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 5, y - 7, 5, 0, Math.PI * 2); c.fill();
  });
  // blush
  c.fillStyle = 'rgba(255,120,150,.35)';
  c.beginPath(); c.ellipse(180, 288, 22, 12, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(332, 288, 22, 12, 0, 0, Math.PI * 2); c.fill();
  // smile
  c.strokeStyle = '#7a3b4f'; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.arc(256, 292, 26, .2 * Math.PI, .8 * Math.PI); c.stroke();
  eyes = [[205 / S, 241 / S], [307 / S, 241 / S]];
  seed = 1337; uploaded = false;
}

async function loadFile(file) {
  if (!file || !/^image\//.test(file.type)) return;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const w = img.naturalWidth, h = img.naturalHeight, m = Math.min(w, h);
    bctx.clearRect(0, 0, BASE, BASE);
    bctx.drawImage(img, (w - m) / 2, (h - m) / 2, m, m, 0, 0, BASE, BASE);
    eyes = [[0.38, 0.42], [0.62, 0.42]];
    // best-effort face landmarks where the browser supports it (local, no network)
    if ('FaceDetector' in window) {
      try {
        const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await fd.detect(base);
        const lm = faces[0] && faces[0].landmarks && faces[0].landmarks.filter(l => l.type === 'eye');
        if (lm && lm.length >= 2) eyes = lm.slice(0, 2).map(l => { const p = l.locations[0]; return [p.x / BASE, p.y / BASE]; });
      } catch (e) { /* unsupported: keep defaults */ }
    }
    // deterministic seed from pixels so the same pfp gets the same verdict
    const d = bctx.getImageData(0, 0, BASE, BASE).data; let hsh = 2166136261;
    for (let i = 0; i < d.length; i += 4 * 97) { hsh ^= d[i] + d[i + 1] * 3 + d[i + 2] * 7; hsh = Math.imul(hsh, 16777619); }
    seed = hsh >>> 0; uploaded = true;
    onBaseChanged();
    $('#dropTitle').textContent = 'looking good 👀';
    $('#dropSub').textContent = 'analysis ready. scroll for your results ↓';
  } catch (e) {
    $('#dropTitle').textContent = "couldn't read that one";
    $('#dropSub').textContent = 'try a jpg or png';
  } finally { URL.revokeObjectURL(url); }
}

/* ---------------- distortion renderer ---------------- */
function render(cv, L, t = 0) {
  const S = cv.width, ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(base, 0, 0, S, S);
  if (L <= 0.001) return;
  const frame = Math.floor(t * 4);
  const rnd = mulberry(seed + frame * 7919);
  const srnd = mulberry(seed); // static per image

  // hollow eyes
  if (L > 0.18) {
    const a = clamp((L - 0.18) / 0.45);
    for (const [ex, ey] of eyes) {
      const x = ex * S, y = ey * S, r = S * (0.05 + 0.055 * a) * 1.7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${0.98 * a})`); g.addColorStop(0.5, `rgba(0,0,0,${0.9 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (L > 0.55) { // drips
        const k = clamp((L - 0.55) / 0.45);
        const dg = ctx.createLinearGradient(0, y, 0, y + S * 0.35 * k);
        dg.addColorStop(0, `rgba(10,0,0,${0.85 * k})`); dg.addColorStop(1, 'rgba(10,0,0,0)');
        ctx.fillStyle = dg;
        ctx.fillRect(x - S * 0.012, y, S * 0.012, S * 0.35 * k);
        ctx.fillRect(x + S * 0.018, y, S * 0.007, S * 0.22 * k);
      }
    }
  }

  // pixel pass: desaturate, contrast, crush, chromatic split, red decay, grain, inversion band
  const id = ctx.getImageData(0, 0, S, S), d = id.data, src = new Uint8ClampedArray(d);
  const sat = 1 - L * 0.85, bri = 1 - L * 0.42, con = 1 + L * 0.7;
  const noise = 18 + L * 70, shift = Math.round(L * L * S * 0.028);
  const red = clamp((L - 0.4) / 0.6);
  const invOn = L > 0.8, invTop = Math.floor(S * (0.55 + srnd() * 0.15)), invH = Math.floor(S * 0.05 + S * 0.25 * clamp((L - 0.8) / 0.2));
  for (let y = 0; y < S; y++) {
    const row = y * S, inBand = invOn && y > invTop && y < invTop + invH;
    const xs = inBand ? S * (0.08 + 0.1 * Math.sin(y * 0.09 + seed % 7)) + srnd() * S * 0.04 : 0, xe = inBand ? S * (0.86 + 0.08 * Math.sin(y * 0.05)) : 0;
    for (let x = 0; x < S; x++) {
      const i = (row + x) * 4;
      const xr = Math.min(S - 1, x + shift), xb = Math.max(0, x - shift);
      let r = src[(row + xr) * 4], g = src[i + 1], b = src[(row + xb) * 4 + 2];
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      r = lum + (r - lum) * sat; g = lum + (g - lum) * sat; b = lum + (b - lum) * sat;
      r = ((r - 128) * con + 128) * bri; g = ((g - 128) * con + 128) * bri; b = ((b - 128) * con + 128) * bri;
      if (red) { r = r + (r * 0.35 + 30) * red; g *= 1 - red * 0.65; b *= 1 - red * 0.72; }
      const n = (rnd() - 0.5) * noise * L; r += n; g += n; b += n;
      if (inBand && x > xs && x < xe) { r = 255 - r; g = (255 - g) * 0.35; b = (255 - b) * 0.3; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
  ctx.putImageData(id, 0, 0);

  // slice displacement
  if (L > 0.42) {
    const n = Math.floor(2 + L * 9);
    for (let k = 0; k < n; k++) {
      const y = rnd() * S, h = 2 + rnd() * S * 0.05 * L, dx = (rnd() - 0.5) * S * 0.14 * L;
      ctx.drawImage(cv, 0, y, S, h, dx, y, S, h);
    }
  }
  // vertical smear (one row dragged down)
  if (L > 0.6) {
    const y0 = S * (0.52 + 0.04 * Math.sin(t * 0.7) + srnd() * 0.08), len = S * (L - 0.6) * 1.1;
    ctx.globalAlpha = 0.5; ctx.drawImage(cv, 0, y0, S, 2, 0, y0, S, len); ctx.globalAlpha = 1;
  }
  // scanlines
  if (L > 0.32) { ctx.fillStyle = `rgba(0,0,0,${0.14 * L})`; for (let y = 0; y < S; y += 3) ctx.fillRect(0, y, S, 1); }
  // pinpoint pupils
  if (L > 0.78) {
    const a = clamp((L - 0.78) / 0.22);
    for (const [ex, ey] of eyes) {
      const x = ex * S + Math.sin(t * 0.5) * S * 0.004, y = ey * S;
      const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.02);
      g.addColorStop(0, `rgba(255,40,30,${a})`); g.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, S * 0.02, 0, Math.PI * 2); ctx.fill();
    }
  }
  // vignette
  const vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.25, S / 2, S / 2, S * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.85 * L})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
}

/* ---------------- canvases & live animation ---------------- */
const stageCanvases = $$('canvas.pfp');
const heroCv = $('#heroPfp'), miniCv = $('#mini');
const visible = new Set();
const visIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)), { rootMargin: '100px' });
stageCanvases.forEach(c => visIO.observe(c));

function renderAllStatic() {
  render(heroCv, 0);
  stageCanvases.forEach(c => render(c, +c.dataset.level, 0));
  render(miniCv, miniLevel, 0);
}
let lastTick = 0;
function animate(now) {
  requestAnimationFrame(animate);
  if (now - lastTick < 110) return; // ~9fps: slow, unsettling, never strobing
  lastTick = now;
  const t = now / 1000;
  visible.forEach(c => { const L = +c.dataset.level; if (L >= 0.4) render(c, L, t); });
  if (depth > 1.5) render(miniCv, miniLevel, t);
}

/* ---------------- personal (local-only) info ---------------- */
const ua = navigator.userAgent;
const os = /iPhone|iPad/.test(ua) ? 'iphone' : /Android/.test(ua) ? 'android' : /Mac/.test(ua) ? 'mac' : /Win/.test(ua) ? 'windows' : /Linux/.test(ua) ? 'linux' : 'device';
const browser = /Edg\//.test(ua) ? 'edge' : /OPR\//.test(ua) ? 'opera' : /Firefox\//.test(ua) ? 'firefox' : /CriOS|Chrome\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'browser';
const isMobile = /iPhone|iPad|Android|Mobile/.test(ua);
let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
const city = tz && tz.includes('/') ? tz.split('/').pop().replace(/_/g, ' ').toLowerCase() : 'your room';
const dark = matchMedia('(prefers-color-scheme: dark)').matches;
let batteryLine = isMobile ? "you're holding your phone a little too close." : "you're sitting a little too close to the screen.";
if (navigator.getBattery) navigator.getBattery().then(b => {
  const pct = Math.round(b.level * 100);
  batteryLine = b.charging ? `you're on ${pct}% and plugged in. so you're staying.` : `you're on ${pct}% battery. when it dies, it stays here.`;
  setK('batteryLine', batteryLine);
}).catch(() => {});

function timeStr() { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s/g, ''); }
function timeLine() {
  const h = new Date().getHours();
  if (h < 5) return 'why are you awake right now.';
  if (h < 8) return "you're up early. or you never slept.";
  if (h < 12) return 'it\'s morning. you should be doing something else.';
  if (h < 17) return "middle of the day and you're here. with it.";
  if (h < 21) return "it's getting dark where you are.";
  return "it's late. you know it's late.";
}
function elapsedStr() {
  const s = Math.floor((Date.now() - startTime) / 1000), m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s} seconds`;
}
function setK(k, v) { $$(`[data-k="${k}"]`).forEach(el => { if (el.textContent !== v) el.textContent = v; }); }
let ups = 0;
function updatePersonal() {
  setK('time', timeStr()); setK('city', city); setK('device', `${os} · ${browser}`);
  setK('screen', String(innerWidth)); setK('elapsed', elapsedStr()); setK('ups', String(ups));
  setK('timeLine', timeLine()); setK('lights', dark ? 'off. just the screen.' : 'on. for now.');
  setK('batteryLine', batteryLine);
  setK('upsLine', ups === 0 ? "you never scrolled back up. good. it doesn't like that." : `you scrolled back up ${ups} time${ups > 1 ? 's' : ''}. it followed you.`);
}
setInterval(updatePersonal, 1000);

/* ---------------- scroll engine ---------------- */
const anchors = [$('#top'), $('#s1'), $('#s2'), $('#s3'), $('#s4'), $('#s5'), $('#result')];
const s5 = $('#s5'), s5Lines = $$('.s5-text p');
const P = [ // depth, bg, fg, muted, accent, accent2, cardAlpha
  [0, [253, 244, 255], [29, 21, 51], [107, 99, 133], [255, 111, 181], [124, 108, 255], .72],
  [1.2, [253, 244, 255], [29, 21, 51], [107, 99, 133], [255, 111, 181], [124, 108, 255], .72],
  [2, [241, 235, 230], [42, 34, 40], [118, 108, 108], [206, 104, 136], [138, 118, 146], .6],
  [3, [196, 186, 178], [30, 20, 20], [88, 70, 68], [168, 40, 60], [110, 60, 70], .38],
  [3.5, [120, 100, 96], [25, 15, 15], [60, 40, 40], [150, 20, 30], [90, 30, 40], .2],
  [3.62, [92, 62, 60], [232, 204, 204], [190, 150, 150], [230, 60, 60], [150, 30, 30], .12],
  [4, [40, 12, 12], [232, 204, 204], [176, 124, 124], [226, 46, 46], [140, 20, 20], .05],
  [5, [6, 0, 0], [232, 202, 202], [150, 100, 100], [255, 50, 50], [120, 0, 0], .03],
];
function palette(dp) {
  let i = 0; while (i < P.length - 2 && dp > P[i + 1][0]) i++;
  const a = P[i], b = P[i + 1], t = clamp((dp - a[0]) / (b[0] - a[0]));
  const mix = k => a[k].map((v, j) => Math.round(lerp(v, b[k][j], t)));
  return { bg: mix(1), fg: mix(2), muted: mix(3), accent: mix(4), accent2: mix(5), card: lerp(a[6], b[6], t) };
}
const rgb = a => `rgb(${a[0]},${a[1]},${a[2]})`;
const root = document.documentElement.style;
const themeMeta = $('meta[name="theme-color"]');
const logoText = $('#logoText'), navC = $('#navC');
const LOGO = ['ratemypfp', 'ratemypfp', 'ratemypfp', 'ratemypf', 'rate my face', 'it rates you', 'it rates you'];
const NAVC = ['try it', 'try it', 'try again', 'try again', 'leave', "you can't", "you can't"];
let depth = 0, miniLevel = 0, stage = 0, lastY = scrollY, upAnchor = scrollY, goingUp = false;

function onScroll() {
  const y = scrollY, center = y + innerHeight * 0.5;
  // scroll-back-up counter (only counts once you're past the hero)
  if (y < lastY - 2 && !goingUp) { goingUp = true; upAnchor = lastY; }
  if (y > lastY + 2 && goingUp) { goingUp = false; }
  if (goingUp && upAnchor - y > 260 && depth > 1) { ups++; upAnchor = -1e9; }
  lastY = y;

  const tops = anchors.map(a => a.getBoundingClientRect().top + y);
  let i = 0; while (i < tops.length - 1 && center >= tops[i + 1]) i++;
  depth = i >= tops.length - 1 ? tops.length - 1 : i + clamp((center - tops[i]) / (tops[i + 1] - tops[i]));
  const dp = Math.min(depth, 5);
  const pal = palette(dp);
  root.setProperty('--bg', rgb(pal.bg)); root.setProperty('--fg', rgb(pal.fg));
  root.setProperty('--muted', rgb(pal.muted)); root.setProperty('--accent', rgb(pal.accent));
  root.setProperty('--accent2', rgb(pal.accent2));
  root.setProperty('--card', `rgba(255,255,255,${pal.card.toFixed(3)})`);
  root.setProperty('--line', `rgba(${pal.fg.join(',')},${dp > 3.6 ? .1 : .08})`);
  const decay = clamp((dp - 1.5) / 3.5);
  root.setProperty('--decay', decay.toFixed(3));
  themeMeta.setAttribute('content', rgb(pal.bg));
  miniLevel = clamp((depth - 1) / 4);

  const st = Math.floor(depth + 0.1);
  if (st !== stage) {
    stage = st; document.body.dataset.stage = String(st);
    document.body.classList.toggle('glitchy', st >= 3);
    logoText.textContent = LOGO[Math.min(st, 6)]; navC.textContent = NAVC[Math.min(st, 6)];
    if (reduced) render(miniCv, miniLevel, 0);
  }
  $('#mini').classList.toggle('on', depth > 0.85 && depth < 5.9);

  // sticky horror scene
  const r = s5.getBoundingClientRect();
  const sp = clamp(-r.top / (s5.offsetHeight - innerHeight));
  s5.style.setProperty('--hp', clamp(sp * 3).toFixed(3));
  s5.style.setProperty('--hz', sp.toFixed(3));
  let cur = -1; s5Lines.forEach((p, k) => { if (sp >= +p.dataset.at) cur = k; });
  s5Lines.forEach((p, k) => p.classList.toggle('on', k === cur && r.top < innerHeight * 0.2));
  updateEyes(sp);
  updateAudio(decay, depth);
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
addEventListener('resize', onScroll);

navC.addEventListener('click', e => { if (stage >= 5) { e.preventDefault(); navC.textContent = 'no.'; } });

/* ---------------- reveal ---------------- */
const revIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revIO.unobserve(e.target); } }), { threshold: 0.18 });
$$('.reveal').forEach(el => revIO.observe(el));

/* ---------------- eyes in the dark ---------------- */
const svg = $('#eyes'), NS = 'http://www.w3.org/2000/svg';
const eyeEls = [];
(function buildEyes() {
  const r = mulberry(99);
  const spots = [];
  while (spots.length < 16) {
    const x = r() * 100, y = r() * 100;
    if (Math.hypot(x - 50, (y - 45) * 1.3) < 30) continue;
    if (spots.some(s => Math.hypot(s[0] - x, s[1] - y) < 13)) continue;
    spots.push([x, y]);
  }
  spots.forEach(([x, y], k) => {
    const g = document.createElementNS(NS, 'g');
    const sc = 0.8 + r() * 1.1;
    g.innerHTML = [-1, 1].map(side => `<g class="eye" data-side="${side}">
      <ellipse rx="13" ry="6" fill="rgba(110,0,0,.6)"/>
      <circle class="pupil" r="3.2" fill="#ff3a26" style="filter:drop-shadow(0 0 4px #f00)"/></g>`).join('');
    svg.appendChild(g);
    eyeEls.push({ g, x, y, sc, at: 0.12 + (k / 16) * 0.7, blinkAt: 2 + r() * 8 });
  });
  layoutEyes();
})();
function layoutEyes() {
  const W = svg.clientWidth || innerWidth, H = svg.clientHeight || innerHeight;
  eyeEls.forEach(e => {
    e.px = e.x / 100 * W; e.py = e.y / 100 * H;
    $$('.eye', e.g).forEach(ey => { ey.setAttribute('transform', `translate(${e.px + (+ey.dataset.side) * 19 * e.sc},${e.py}) scale(${e.sc})`); });
  });
}
addEventListener('resize', layoutEyes);
let pointer = { x: innerWidth / 2, y: innerHeight / 2 }, pointerSeen = false;
addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointerSeen = true; }, { passive: true });
let eyeSp = 0;
function updateEyes(sp) { eyeSp = sp; eyeEls.forEach(e => { e.g.style.opacity = clamp((sp - e.at) * 6).toFixed(2); }); }
function eyeLoop(now) {
  requestAnimationFrame(eyeLoop);
  if (eyeSp <= 0 || eyeSp >= 1) return;
  const t = now / 1000;
  const tx = pointerSeen ? pointer.x : innerWidth / 2 + Math.sin(t * 0.4) * innerWidth * 0.3;
  const ty = pointerSeen ? pointer.y : innerHeight / 2 + Math.cos(t * 0.3) * innerHeight * 0.2;
  eyeEls.forEach(e => {
    const a = Math.atan2(ty - e.py, tx - e.px);
    const blink = reduced ? 1 : (((t + e.blinkAt) % 9) < 0.18 ? 0.1 : 1);
    $$('.eye', e.g).forEach(ey => {
      const p = ey.firstElementChild.nextElementSibling;
      p.setAttribute('cx', (Math.cos(a) * 6).toFixed(1)); p.setAttribute('cy', (Math.sin(a) * 2.2).toFixed(1));
      ey.firstElementChild.setAttribute('ry', 6 * blink); p.style.opacity = blink;
    });
  });
}

/* ---------------- glitch text (slow, small, never full-screen) ---------------- */
const GLY = { a: 'ä', e: 'ē', i: 'ı', o: 'ø', u: 'ü', s: 'ş', t: 'ţ', n: 'ñ', r: 'ŗ', y: 'ÿ', c: 'ç' };
function glitchTick() {
  if (reduced || stage < 3) return;
  const els = $$('.gl').filter(el => { const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; });
  if (!els.length) return;
  const el = els[Math.floor(Math.random() * els.length)];
  el.classList.remove('jit'); void el.offsetWidth; el.classList.add('jit');
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const nodes = [];
  while (w.nextNode()) if (w.currentNode.nodeValue.trim()) nodes.push(w.currentNode);
  const node = nodes[Math.floor(Math.random() * nodes.length)]; if (!node) return;
  const orig = node.nodeValue, chars = orig.split('');
  const count = stage >= 4 ? 3 : 1;
  for (let k = 0; k < count; k++) { const idx = Math.floor(Math.random() * chars.length); const ch = chars[idx]; if (GLY[ch]) chars[idx] = GLY[ch]; }
  node.nodeValue = chars.join('');
  setTimeout(() => { if (node.nodeValue === chars.join('')) node.nodeValue = orig; }, 160);
}
setInterval(glitchTick, 650);

/* ---------------- tab title ---------------- */
const baseTitle = document.title;
document.addEventListener('visibilitychange', () => {
  if (document.hidden && stage >= 3) document.title = "it's still here";
  else if (!document.hidden && document.title !== baseTitle) { document.title = 'you came back.'; setTimeout(() => document.title = baseTitle, 3000); }
});

/* ---------------- audio (opt-in only) ---------------- */
let AC = null, master, padGain, droneGain, pads = [], soundOn = false, beatTimer = null;
const soundBtn = $('#soundBtn');
function initAudio() {
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
  padGain = AC.createGain(); padGain.connect(master);
  droneGain = AC.createGain(); droneGain.gain.value = 0; droneGain.connect(master);
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(padGain);
  [261.6, 329.6, 392, 493.9].forEach(f => { const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = AC.createGain(); g.gain.value = 0.05; o.connect(g); g.connect(lp); o.start(); pads.push({ o, f }); });
  [48.9, 51.3, 73.4].forEach(f => { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const f2 = AC.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 180; const g = AC.createGain(); g.gain.value = 0.25; o.connect(f2); f2.connect(g); g.connect(droneGain); o.start(); });
  const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), ch = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; ch[i] = last * 3.5; }
  const ns = AC.createBufferSource(); ns.buffer = buf; ns.loop = true; const ng = AC.createGain(); ng.gain.value = 0.5; ns.connect(ng); ng.connect(droneGain); ns.start();
}
function thump(at, vol) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(70, at); o.frequency.exponentialRampToValueAtTime(38, at + 0.18);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
  o.connect(g); g.connect(master); o.start(at); o.stop(at + 0.3);
}
function heartbeat() {
  if (!soundOn || depth < 3.6) return;
  const now = AC.currentTime, v = 0.5 + clamp((depth - 3.6) / 1.5) * 0.5;
  thump(now, v); thump(now + 0.28, v * 0.7);
}
function updateAudio(decay, dp) {
  if (!AC || !soundOn) return;
  const now = AC.currentTime;
  padGain.gain.setTargetAtTime(Math.max(0, 1 - decay * 1.4) * 0.6, now, 0.3);
  droneGain.gain.setTargetAtTime(decay * decay * 0.9, now, 0.4);
  pads.forEach(p => p.o.frequency.setTargetAtTime(p.f * (1 - decay * 0.07) * (p.f > 300 ? 1 - decay * 0.03 : 1), now, 0.5));
  const rate = dp > 4.6 ? 800 : 1150;
  if (beatTimer && beatTimer.rate !== rate) { clearInterval(beatTimer.id); beatTimer = null; }
  if (!beatTimer) beatTimer = { rate, id: setInterval(heartbeat, rate) };
}
soundBtn.addEventListener('click', async () => {
  if (!AC) initAudio();
  soundOn = !soundOn;
  if (soundOn) { await AC.resume(); master.gain.setTargetAtTime(0.18, AC.currentTime, 0.4); onScroll(); }
  else { master.gain.setTargetAtTime(0, AC.currentTime, 0.15); }
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  $('.sound-ico', soundBtn).textContent = soundOn ? '🔊' : '🔇';
  $('.sound-lbl', soundBtn).textContent = soundOn ? 'sound on' : 'sound off';
});

/* ---------------- result card ---------------- */
const TITLES = ['the thing in the hallway', 'main character (deceased)', 'certified hollow', 'the one in the background of your photos',
  'aura: evicted', 'the face it wears now', '4am mirror energy', "rizz left. so did you", 'not you anymore', 'the pfp that looks back'];
const SCORES = ['-6.6/10', '0.0/10', '?/10', '-∞/10', '3/10 (not yours)', 'n/a', '-2.1/10', '1/10 (it ate)'];
const LINES = ['aura: gone · rizz: unrecoverable · mce: transferred', 'aura: -8 · rizz: [taken] · you: fading',
  'eye contact: permanent · approachable: no · still there: yes', 'crop: immaculate · lighting: wrong · face: borrowed'];
let result = { title: '', score: '', line: '', id: 0 };
function pickResult() {
  const r = mulberry(seed ^ 0x5bd1e995);
  result = { title: TITLES[Math.floor(r() * TITLES.length)], score: SCORES[Math.floor(r() * SCORES.length)], line: LINES[Math.floor(r() * LINES.length)], id: Math.floor(r() * 90000 + 10000) };
  $('#resultTitle').textContent = result.title;
}
function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur); return lines;
}
const SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif', MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
function drawCard() {
  const cv = $('#card'), c = cv.getContext('2d', { willReadFrequently: true }), W = 1080, H = 1350;
  c.fillStyle = '#070000'; c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W / 2, 480, 50, W / 2, 480, 700); glow.addColorStop(0, 'rgba(120,0,0,.45)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = glow; c.fillRect(0, 0, W, H);
  c.font = `600 30px ${MONO}`; c.fillStyle = '#c98a8a'; c.textBaseline = 'alphabetic';
  c.textAlign = 'left'; c.fillText('ratemypfp', 72, 84);
  c.textAlign = 'right'; c.fillStyle = '#7a4a4a'; c.fillText(`vibe report #${result.id}`, W - 72, 84);
  // portrait
  const P = 768, px = (W - P) / 2, py = 124;
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = P; render(tmp, 1, 3.3);
  c.save(); c.beginPath(); c.roundRect ? c.roundRect(px, py, P, P, 22) : c.rect(px, py, P, P); c.clip(); c.drawImage(tmp, px, py); c.restore();
  c.strokeStyle = 'rgba(255,80,80,.18)'; c.lineWidth = 2; c.strokeRect(px + 1, py + 1, P - 2, P - 2);
  // text
  c.textAlign = 'left';
  c.font = `600 26px ${MONO}`; c.fillStyle = '#9a6060'; c.fillText('VIBE SCORE', 72, 966);
  c.font = `400 112px ${SERIF}`; c.fillStyle = '#ff3b3b'; c.fillText(result.score, 66, 1072);
  c.font = `italic 400 50px ${SERIF}`; c.fillStyle = '#ecd6d6';
  wrap(c, `"${result.title}"`, W - 144).slice(0, 2).forEach((ln, k) => c.fillText(ln, 72, 1146 + k * 58));
  c.font = `500 24px ${MONO}`; c.fillStyle = '#a86e6e'; c.fillText(result.line, 72, 1262);
  c.fillStyle = 'rgba(255,80,80,.15)'; c.fillRect(72, 1284, W - 144, 1);
  c.font = `600 24px ${MONO}`; c.fillStyle = '#8a5555'; c.fillText('ratemypfp · by @voidhl', 72, 1322);
  c.textAlign = 'right'; c.fillStyle = '#5e3a3a'; c.fillText(`rated at ${timeStr()} · on-device`, W - 72, 1322);
  // grain
  const id = c.getImageData(0, 0, W, H), d = id.data, r = mulberry(seed + 5);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(id, 0, 0);
  updateShare();
}
function updateShare() {
  const url = ' https://maximusdigitals.github.io/rate-my-pfp/';
  const text = `ratemypfp gave me a vibe score of ${result.score} and called me "${result.title}" 💀 i just wanted to know my aura${url}`;
  $('#shareBtn').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text);
}
$('#dlBtn').addEventListener('click', () => {
  drawCard();
  $('#card').toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ratemypfp-result.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
});
new IntersectionObserver(es => { if (es[0].isIntersecting) drawCard(); }, { threshold: 0.05 }).observe($('#card'));

/* ---------------- upload wiring ---------------- */
const fileIn = $('#file'), drop = $('#drop');
fileIn.addEventListener('change', () => loadFile(fileIn.files[0]));
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadFile(f); });
$('#againBtn').addEventListener('click', () => setTimeout(() => fileIn.click(), 600));

function onBaseChanged() { pickResult(); renderAllStatic(); drawCard(); }

/* ---------------- boot ---------------- */
drawPlaceholder();
updatePersonal();
onBaseChanged();
onScroll();
if (!reduced) { requestAnimationFrame(animate); }
requestAnimationFrame(eyeLoop);
window.__rmp = { loadFile, get depth() { return depth; }, get result() { return result; } };
})();
