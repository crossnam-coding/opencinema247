import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ---------- i18n (EN default, KO toggle; nothing is stored — no cookies, no localStorage) ---------- */
const langBtn = document.getElementById('lang');
function setLang(l) {
  document.documentElement.lang = l;
  document.querySelectorAll('[data-ko]').forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    el.innerHTML = l === 'ko' ? el.dataset.ko : el.dataset.en;
  });
  langBtn.textContent = l === 'ko' ? 'EN' : 'KO';
  window.dispatchEvent(new CustomEvent('oc:lang', { detail: l }));
}
setLang((navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en');
langBtn.addEventListener('click', () => setLang(document.documentElement.lang === 'ko' ? 'en' : 'ko'));
const isKo = () => document.documentElement.lang === 'ko';

/* ---------- nav ---------- */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
const menuBtn = document.getElementById('menu');
if (menuBtn) {
  menuBtn.addEventListener('click', () => { const open = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(open)); });
  document.querySelectorAll('#links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }));
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('nomotion');
if (reduced) document.documentElement.style.scrollBehavior = 'auto';
const isMobile = window.matchMedia('(max-width: 900px)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- marquee letters: which face the changeable letters use (?font= / ?kofont= override for comparisons) ---------- */
// scale = how much smaller the HTML marquee strips (film cards, HUD) render this face, so wide faces still fit
const FACES = {
  bebas:      { css: '"Bebas Neue"',    weight: '',     size: 172, track: 14, scale: 1 },
  anton:      { css: 'Anton',           weight: '',     size: 150, track: 16, scale: .9 },
  oswald:     { css: 'Oswald',          weight: '700 ', size: 138, track: 14, scale: .88 },
  archivo:    { css: '"Archivo Black"', weight: '',     size: 116, track: 18, scale: .7 },
  league:     { css: '"League Gothic"', weight: '',     size: 180, track: 14, scale: 1 },
  jost:       { css: 'Jost',            weight: '700 ', size: 122, track: 22, scale: .76 },
  montserrat: { css: 'Montserrat',      weight: '800 ', size: 112, track: 20, scale: .72 }
};
const KO_FACES = {
  system:   { css: '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif', weight: '800 ', size: 128, track: 6 },
  blackhan: { css: '"Black Han Sans","Apple SD Gothic Neo",sans-serif',               weight: '',     size: 140, track: 8 }
};
const Q = new URLSearchParams(location.search);
const FACE = FACES[Q.get('font')] || FACES.jost;           // default: Jost Bold (Futura-style, classic cinema marquee) — owner's pick, 2026-09-05
const KO_FACE = KO_FACES[Q.get('kofont')] || KO_FACES.blackhan;
document.documentElement.style.setProperty('--marquee', FACE.css + ',"Inter Tight",sans-serif');
document.documentElement.style.setProperty('--marquee-weight', FACE.weight.trim() || '400');
document.documentElement.style.setProperty('--mq-scale', String(FACE.scale));
document.documentElement.style.setProperty('--marquee-ko', KO_FACE.css);

/* ---------- the slate: what the marquee cycles through ---------- */
const FILMS = [
  { en: 'NEW YEAR BLUES', ko: '새해전야', year: 2021 },
  { en: 'REMEMBER', ko: '리멤버', year: 2022 },
  { en: 'TROLL FACTORY', ko: '댓글부대', year: 2024 },
  { en: 'DIRTY MONEY', ko: '더러운 돈에 손대지 마라', year: 2024 },
  { en: 'FIREFIGHTERS', ko: '소방관', year: 2024 }
];

/* ---------- marquee cards: changeable letters, each one a little crooked ---------- */
(function jitterMarquees() {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  document.querySelectorAll('.mq').forEach(mq => {
    const text = mq.textContent.trim();
    mq.textContent = '';
    text.split(' ').forEach(word => {                 // words stay whole; a long title wraps between words, never mid-word
      const w = document.createElement('span'); w.className = 'w';
      [...word].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = ch;
        s.style.setProperty('--r', ((rnd() - .5) * 5).toFixed(2) + 'deg');
        s.style.setProperty('--y', ((rnd() - .5) * 4).toFixed(2) + 'px');
        w.appendChild(s);
      });
      mq.appendChild(w);
    });
  });
})();

/* ---------- HUD: the title on the marquee, typed in ---------- */
const hud = document.getElementById('hud');
const hudYear = document.getElementById('hudYear');
const hudLine = document.getElementById('hudLine');
const hudBar = document.getElementById('hudBar');
let typeTimer = null;
function hudShow(f) {
  if (!hud) return;
  const text = isKo() ? f.ko : f.en;
  hudYear.textContent = f.year;
  hud.classList.add('on');
  hudLine.textContent = '';
  clearInterval(typeTimer);
  let i = 0;
  typeTimer = setInterval(() => { i++; hudLine.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typeTimer); }, 34);
  hudBar.style.transition = 'none'; hudBar.style.transform = 'scaleX(0)';
  requestAnimationFrame(() => requestAnimationFrame(() => { hudBar.style.transition = 'transform 4.4s linear'; hudBar.style.transform = 'scaleX(1)'; }));
}

/* ---------- 3D: a cinema front at night — marquee bulbs, a letter board, a neon OPEN, one door ajar ---------- */
const cam = { dolly: 0 };
const board = { text: '', from: '', t0: 0, busy: false };

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Bebas Neue letters on a backlit cream panel — drawn char by char so each letter sits a little off, like a real board.
function drawBoard(ctx, W, H, title, sub, mix, fromTitle) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, '#fbf1d6'); g.addColorStop(1, '#dcc48f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.06)';
  for (let y = 56; y < H; y += 56) ctx.fillRect(0, y, W, 2);
  const vg = ctx.createLinearGradient(0, 0, W, 0);
  vg.addColorStop(0, 'rgba(60,40,10,.28)'); vg.addColorStop(.08, 'rgba(60,40,10,0)'); vg.addColorStop(.92, 'rgba(60,40,10,0)'); vg.addColorStop(1, 'rgba(60,40,10,.28)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  const ko = /[ㄱ-힝]/.test(title);
  const face = ko ? KO_FACE : FACE;
  const family = face.css + (ko ? '' : ',"Inter Tight",sans-serif');
  const weight = face.weight;
  let size = face.size;
  const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const chars = [...title];
  // split-flap: letters that have not resolved yet show a random glyph
  const shown = chars.map((c, i) => {
    if (mix >= 1 || c === ' ') return c;
    const at = i / Math.max(1, chars.length - 1);
    const local = (mix - at * 0.55) / 0.45;
    if (local >= 1) return c;
    if (local <= 0) return (fromTitle && fromTitle[i] && fromTitle[i] !== ' ') ? fromTitle[i] : ALPH[(i * 7 + 3) % ALPH.length];
    return ALPH[Math.floor((Math.sin(i * 12.9898 + mix * 97.3) * .5 + .5) * ALPH.length)];
  });
  ctx.font = `${weight}${size}px ${family}`;
  const track = face.track;
  let width = shown.reduce((a, c) => a + ctx.measureText(c).width + track, 0);
  if (width > W - 180) { size = Math.floor(size * (W - 180) / width); ctx.font = `${weight}${size}px ${family}`; width = shown.reduce((a, c) => a + ctx.measureText(c).width + track, 0); }
  let x = (W - width) / 2, y = H * 0.5;
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#17130f';
  shown.forEach((c, i) => {
    const w = ctx.measureText(c).width;
    const rot = ((Math.sin(i * 3.7 + 1.3) * 0.5) * 0.028) + (i === 2 ? 0.05 : 0);   // one letter noticeably crooked
    const dy = Math.cos(i * 2.1) * 3;
    ctx.save(); ctx.translate(x + w / 2, y + dy); ctx.rotate(rot); ctx.fillText(c, -w / 2, 0); ctx.restore();
    x += w + track;
  });
  // second row
  ctx.font = `54px "Bebas Neue","Inter Tight",sans-serif`;
  ctx.fillStyle = 'rgba(40,28,12,.85)'; ctx.textAlign = 'center';
  ctx.fillText(sub, W / 2, H * 0.86);
  ctx.textAlign = 'left';
}

function letterPath(strokes, sx, sy, ox, oy, smooth) {
  // strokes: arrays of [x,y] in a 1-unit letter box → tubes
  const geos = [];
  strokes.forEach(pts => {
    const v = pts.map(p => new THREE.Vector3(ox + p[0] * sx, oy + p[1] * sy, 0));
    let curve;
    if (smooth) curve = new THREE.CatmullRomCurve3(v, false, 'catmullrom', 0.35);
    else { curve = new THREE.CurvePath(); for (let i = 0; i < v.length - 1; i++) curve.add(new THREE.LineCurve3(v[i], v[i + 1])); }
    geos.push(new THREE.TubeGeometry(curve, smooth ? 48 : 24 * (v.length - 1), 0.022, 7, false));
  });
  return geos;
}
const arc = (cx, cy, rx, ry, a0, a1, n) => { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };
const GLYPHS = {
  O: { smooth: true, strokes: [arc(0.34, 0.5, 0.31, 0.47, Math.PI / 2, Math.PI / 2 + Math.PI * 2, 36)] },
  P: { smooth: true, strokes: [[[0, 0], [0, 0.5], [0, 1]], [[0, 1], [0.34, 1], ...arc(0.34, 0.75, 0.3, 0.25, Math.PI / 2, -Math.PI / 2, 14), [0, 0.5]]] },
  E: { smooth: false, strokes: [[[0.6, 1], [0, 1], [0, 0], [0.6, 0]], [[0, 0.5], [0.5, 0.5]]] },
  N: { smooth: false, strokes: [[[0, 0], [0, 1], [0.66, 0], [0.66, 1]]] },
  '2': { smooth: true, strokes: [[[0.02, 0.78], [0.12, 0.94], [0.32, 1], [0.52, 0.94], [0.62, 0.78], [0.56, 0.6], [0.3, 0.36], [0.02, 0.1], [0, 0], [0.64, 0]]] },
  '4': { smooth: false, strokes: [[[0.46, 0], [0.46, 1], [0, 0.32], [0.66, 0.32]]] },
  '/': { smooth: false, strokes: [[[0.04, 0], [0.5, 1]]] },
  '7': { smooth: false, strokes: [[[0, 1], [0.64, 1], [0.22, 0]]] }
};
function neonWord(word, height, gap, color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  let x = 0;
  const widths = { O: 0.68, P: 0.66, E: 0.62, N: 0.68, '2': 0.64, '4': 0.66, '/': 0.5, '7': 0.64 };
  [...word].forEach(ch => {
    const g = GLYPHS[ch]; if (!g) { x += 0.4 * height; return; }
    letterPath(g.strokes, height * 0.68, height, x, 0, g.smooth).forEach(geo => group.add(new THREE.Mesh(geo, mat)));
    x += (widths[ch] || 0.66) * height * 0.68 + gap;
  });
  group.userData.width = x - gap; group.userData.mat = mat;
  return group;
}

function glowSprite(color, size, opacity) {
  const c = makeCanvas(128, 128); const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}

function initStage() {
  const canvas = document.getElementById('stage');
  const hero = document.querySelector('.hero');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { hero.classList.add('nogl'); return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));   // phones: bloom at 1.25x is plenty and keeps 60fps
  hero.classList.add('gl');
  renderer.setClearColor(0x050505, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.055);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

  // ---- materials for the building itself (lit by the bulbs' point lights)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x100e10, roughness: 0.92, metalness: 0.05 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.55, metalness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2c, roughness: 0.35, metalness: 0.8 });

  // facade wall + doorway recess
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), wallMat); wall.position.set(0, 6, -0.8); scene.add(wall);
  const pillars = [-1.35, 1.35];
  pillars.forEach(px => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.35), trimMat); p.position.set(px, 1.3, -0.7); scene.add(p); });

  // canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.5, 1.7), canopyMat); canopy.position.set(0, 3.4, 0); scene.add(canopy);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.08, 1.8), trimMat); lip.position.set(0, 2.62, 0); scene.add(lip);
  const lip2 = lip.clone(); lip2.position.y = 4.18; scene.add(lip2);

  // letter board
  const BW = 2048, BH = 300;
  const bc = makeCanvas(BW, BH); const bctx = bc.getContext('2d');
  const boardTex = new THREE.CanvasTexture(bc); boardTex.colorSpace = THREE.SRGBColorSpace; boardTex.anisotropy = 4;
  const boardMat = new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false, color: new THREE.Color(0.82, 0.82, 0.82) });
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 1.04), boardMat); boardMesh.position.set(0, 3.4, 0.86); scene.add(boardMesh);
  const boardMirror = new THREE.Mesh(boardMesh.geometry, new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false, color: new THREE.Color(0.35, 0.33, 0.3), transparent: true, opacity: 0.9 }));
  boardMirror.position.set(0, -3.4, 0.86); boardMirror.scale.y = -1; scene.add(boardMirror);
  const subLine = () => isKo() ? 'FULL-LENGTH · SUBTITLED · FREE · OPEN 24/7' : 'FULL-LENGTH · SUBTITLED · FREE · OPEN 24/7';
  function paintBoard(mix) {
    drawBoard(bctx, BW, BH, board.text, subLine(), mix, board.from);
    boardTex.needsUpdate = true;
  }
  let filmIdx = Math.max(0, parseInt(Q.get('title') || '0', 10) || 0);   // ?title=N starts the board on a given film (comparisons)
  function setTitle(f, instant) {
    board.from = board.text;
    board.text = isKo() ? f.ko : f.en;
    board.t0 = performance.now(); board.busy = !instant && !reduced;
    paintBoard(instant || reduced ? 1 : 0);
  }
  setTitle(FILMS[filmIdx % FILMS.length], true);
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`${FACE.weight}${FACE.size}px ${FACE.css}`), document.fonts.load(`${KO_FACE.weight}${KO_FACE.size}px ${KO_FACE.css}`), document.fonts.load('54px "Bebas Neue"')])
      .then(() => paintBoard(board.busy ? 0 : 1)).catch(() => {});
  }

  // channel name above the canopy, gold — and the door-and-film mark on top
  const hc = makeCanvas(1536, 160); const hctx = hc.getContext('2d');
  function paintHeader() {
    hctx.clearRect(0, 0, 1536, 160);
    hctx.font = '800 108px Montserrat,"Inter Tight",sans-serif'; hctx.textAlign = 'center'; hctx.textBaseline = 'middle';
    hctx.fillStyle = '#f4d27a'; hctx.fillText('OPEN CINEMA 24/7', 768, 84);
  }
  paintHeader();
  const headTex = new THREE.CanvasTexture(hc); headTex.colorSpace = THREE.SRGBColorSpace;
  const headMat = new THREE.MeshBasicMaterial({ map: headTex, transparent: true, toneMapped: false, color: new THREE.Color(1.35, 1.2, 0.85) });
  const head = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.5625), headMat); head.position.set(0, 4.6, 0.3); scene.add(head);
  if (document.fonts && document.fonts.load) document.fonts.load('800 108px Montserrat').then(() => { paintHeader(); headTex.needsUpdate = true; }).catch(() => {});
  const markTex = new THREE.TextureLoader().load('assets/mark.png', t => { t.colorSpace = THREE.SRGBColorSpace; });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.79), new THREE.MeshBasicMaterial({ map: markTex, transparent: true, toneMapped: false, color: new THREE.Color(1.5, 1.3, 0.9) }));
  mark.position.set(0, 5.32, 0.3); scene.add(mark);

  // ---- marquee bulbs, in perimeter order so the chase runs around the board
  const front = []; const Wb = 3.95, yT = 4.05, yB = 2.75, zF = 0.9, nx = 33, ny = 5;
  for (let i = 0; i < nx; i++) front.push([-Wb + i * (2 * Wb / (nx - 1)), yT, zF]);
  for (let i = 1; i < ny; i++) front.push([Wb, yT - i * (yT - yB) / ny, zF]);
  for (let i = 0; i < nx; i++) front.push([Wb - i * (2 * Wb / (nx - 1)), yB, zF]);
  for (let i = 1; i < ny; i++) front.push([-Wb, yB + i * (yT - yB) / ny, zF]);
  const sides = [];
  for (let s of [-1, 1]) for (let i = 1; i <= 6; i++) { const z = zF - i * 0.27; sides.push([s * Wb, yT, z]); sides.push([s * Wb, yB, z]); }
  const bulbs = [...front, ...sides];
  const N = bulbs.length;
  const bulbGeo = new THREE.SphereGeometry(0.052, 10, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const inst = new THREE.InstancedMesh(bulbGeo, bulbMat, N);
  const instMirror = new THREE.InstancedMesh(bulbGeo, bulbMat, N);
  const M = new THREE.Matrix4(), C = new THREE.Color();
  bulbs.forEach((b, i) => {
    M.makeTranslation(b[0], b[1], b[2]); inst.setMatrixAt(i, M);
    M.makeTranslation(b[0], -b[1], b[2]); instMirror.setMatrixAt(i, M);
    inst.setColorAt(i, C.setRGB(0.3, 0.2, 0.1)); instMirror.setColorAt(i, C);
  });
  scene.add(inst); scene.add(instMirror);
  const bulbNow = new Float32Array(N).fill(0.2);
  const DEAD = 17, FLICKER = 41;
  // little glow discs behind the bulbs so they read as lit even where bloom is faint
  const bulbGlow = new THREE.Group();
  front.forEach((b, i) => { if (i % 2) return; const s = glowSprite(0xffc27a, 0.34, 0.16); s.position.set(b[0], b[1], b[2] + 0.02); bulbGlow.add(s); });
  scene.add(bulbGlow);

  // ---- doors: warm light inside, the right one ajar
  const dc = makeCanvas(256, 512); const dctx = dc.getContext('2d');
  { const g = dctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#f6c98a'); g.addColorStop(0.55, '#ffd9a0'); g.addColorStop(1, '#fff1cf');
    dctx.fillStyle = g; dctx.fillRect(0, 0, 256, 512);
    dctx.fillStyle = 'rgba(30,20,10,.85)'; dctx.fillRect(0, 0, 256, 14); dctx.fillRect(0, 498, 256, 14); dctx.fillRect(0, 0, 12, 512); dctx.fillRect(244, 0, 12, 512); dctx.fillRect(122, 0, 12, 512); dctx.fillRect(0, 300, 256, 10);
    dctx.fillStyle = 'rgba(0,0,0,.18)'; dctx.fillRect(0, 0, 256, 220); }
  const doorTex = new THREE.CanvasTexture(dc); doorTex.colorSpace = THREE.SRGBColorSpace;
  const doorMat = new THREE.MeshBasicMaterial({ map: doorTex, toneMapped: false, color: new THREE.Color(1.15, 1.02, 0.85) });
  const doorL = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.3), doorMat); doorL.position.set(-0.6, 1.15, -0.78); scene.add(doorL);
  const hinge = new THREE.Group(); hinge.position.set(1.2, 0, -0.78); scene.add(hinge);
  const doorR = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.3), doorMat); doorR.position.set(-0.58, 1.15, 0); hinge.add(doorR);
  hinge.rotation.y = 0.62;
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 2.32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.1, 0.8), toneMapped: false })); doorway.position.set(0.6, 1.15, -0.79); scene.add(doorway);
  // light spilling onto the pavement
  const sc = makeCanvas(256, 256); const sctx = sc.getContext('2d');
  { const g = sctx.createRadialGradient(128, 40, 4, 128, 40, 200); g.addColorStop(0, 'rgba(255,214,150,.9)'); g.addColorStop(0.5, 'rgba(255,190,110,.28)'); g.addColorStop(1, 'rgba(255,170,80,0)');
    sctx.fillStyle = g; sctx.fillRect(0, 0, 256, 256); }
  const spillTex = new THREE.CanvasTexture(sc);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.2), new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85, toneMapped: false }));
  spill.rotation.x = -Math.PI / 2; spill.position.set(0.35, 0.01, 1.6); scene.add(spill);
  const doorGlow = glowSprite(0xffc98a, 5.5, 0.16); doorGlow.position.set(0.3, 1.3, -0.4); scene.add(doorGlow);

  // ---- box office window with the neon OPEN 24/7 (right of the doors, so it sits clear of the headline)
  const BX = 2.75;
  const win =new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.35), new THREE.MeshBasicMaterial({ color: 0x0c0709 })); win.position.set(BX, 1.55, -0.79); scene.add(win);
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.5, 0.08), trimMat); winFrame.position.set(BX, 1.55, -0.83); scene.add(winFrame);
  const neon = neonWord('OPEN', 0.5, 0.1, new THREE.Color(3.4, 0.5, 0.42));
  neon.position.set(BX - neon.userData.width / 2, 1.62, -0.7); scene.add(neon);
  const neon2 = neonWord('24/7', 0.24, 0.06, new THREE.Color(2.6, 2.2, 1.7));
  neon2.position.set(BX - neon2.userData.width / 2, 1.08, -0.7); scene.add(neon2);
  const neonGlow = glowSprite(0xff5a48, 2.6, 0.22); neonGlow.position.set(BX, 1.7, -0.6); scene.add(neonGlow);
  // reflections of the neon in the pavement
  const neonM = neon.clone(); neonM.scale.y = -1; neonM.position.y = -neon.position.y; neonM.traverse(o => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.12, 0.1), toneMapped: false }); }); scene.add(neonM);
  const neon2M = neon2.clone(); neon2M.scale.y = -1; neon2M.position.y = -neon2.position.y; neon2M.traverse(o => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.45, 0.35), toneMapped: false }); }); scene.add(neon2M);
  // the doorway's reflection in the wet pavement: the door gradient, fading out as it gets further from the sill
  const mc = makeCanvas(256, 512); const mctx = mc.getContext('2d');
  { mctx.drawImage(dc, 0, 0); mctx.globalCompositeOperation = 'destination-in';
    const g = mctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,.9)');
    mctx.fillStyle = g; mctx.fillRect(0, 0, 256, 512); }
  const mirrorTex = new THREE.CanvasTexture(mc); mirrorTex.colorSpace = THREE.SRGBColorSpace;
  const doorMirror = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.3), new THREE.MeshBasicMaterial({ map: mirrorTex, transparent: true, toneMapped: false, color: new THREE.Color(0.6, 0.5, 0.38) }));
  doorMirror.position.set(0.1, -1.15, -0.78); doorMirror.scale.y = -1; scene.add(doorMirror);

  // ---- wet pavement: the reflections live under a translucent ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.28, metalness: 0.3, transparent: true, opacity: 0.74 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; ground.renderOrder = 2; scene.add(ground);

  // ---- lights (for the wall, canopy and pavement)
  scene.add(new THREE.AmbientLight(0x223040, 0.35));
  const warm = [[-2.6, 3.4, 1.6], [2.6, 3.4, 1.6]].map(p => { const l = new THREE.PointLight(0xffb45c, 18, 9, 2); l.position.set(...p); scene.add(l); return l; });
  const doorLight = new THREE.PointLight(0xffc88a, 10, 7, 2); doorLight.position.set(0.4, 1.3, 0.4); scene.add(doorLight);
  const neonLight = new THREE.PointLight(0xff4a3a, 4, 4, 2); neonLight.position.set(BX, 1.6, -0.2); scene.add(neonLight);

  // ---- dust in the light
  const DN = isMobile ? 220 : 520;
  const dpos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) { dpos[i * 3] = (Math.random() - .5) * 9; dpos[i * 3 + 1] = Math.random() * 5; dpos[i * 3 + 2] = -0.6 + Math.random() * 3.2; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dtexC = makeCanvas(32, 32); { const g = dtexC.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.04, map: new THREE.CanvasTexture(dtexC), color: new THREE.Color(1.6, 1.3, 0.9), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  scene.add(dust);

  // ---- post: bloom makes the bulbs and neon actually glow
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), isMobile ? 0.7 : 0.85, 0.55, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- camera: street level, marquee to the right; scrolling walks you to the open door
  const portrait = () => canvas.clientWidth > 0 && canvas.clientHeight > canvas.clientWidth * 1.05;
  const A = { pos: new THREE.Vector3(-0.9, 1.4, 11.2), look: new THREE.Vector3(-2.2, 1.75, 0) };
  const B = { pos: new THREE.Vector3(0.3, 1.5, 3.4), look: new THREE.Vector3(0.55, 1.3, -0.8) };
  function layout() {
    // portrait: the marquee sits in the top third, the copy owns the bottom; the pavement (and its reflections) runs under the text
    if (portrait()) { camera.fov = 58; A.pos.set(0, 1.8, 15); A.look.set(0.15, -0.4, 0); B.pos.set(0.2, 1.6, 4.2); B.look.set(0.5, 1.4, -0.8); }
    else if (canvas.clientWidth > 0 && canvas.clientWidth < 1100) { camera.fov = 54; A.pos.set(-0.6, 1.5, 12); A.look.set(-1.6, 1.9, 0); B.pos.set(0.3, 1.5, 4.0); B.look.set(0.55, 1.3, -0.8); }
    else { camera.fov = 50; A.pos.set(-0.9, 1.4, 11.2); A.look.set(-2.5, 1.75, 0); B.pos.set(0.3, 1.5, 4.0); B.look.set(0.55, 1.3, -0.8); }
    camera.updateProjectionMatrix();
  }
  let mx = 0, my = 0, active = true;
  window.addEventListener('pointermove', e => { mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  new IntersectionObserver(([en]) => { active = en.isIntersecting; }, { threshold: 0.02 }).observe(hero);

  let lastW = -1, lastH = -1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; layout();
  }
  window.addEventListener('resize', resize); resize();
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(hero);

  window.addEventListener('oc:lang', () => { setTitle(FILMS[filmIdx % FILMS.length], true); if (hud.classList.contains('on')) hudShow(FILMS[filmIdx % FILMS.length]); });

  const clock = new THREE.Clock();
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  let lastSwitch = performance.now() - 2600, started = false, slowFrames = 0, degraded = false;
  function tick() {
    requestAnimationFrame(tick);
    if (!active || canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) resize();
    const raw = clock.getDelta();
    // weak GPU: after a run of slow frames, drop to 1x pixel ratio and a lighter bloom rather than stutter
    if (!degraded && !document.hidden) { slowFrames = raw > 0.045 ? slowFrames + 1 : 0; if (slowFrames > 40) { degraded = true; renderer.setPixelRatio(1); composer.setPixelRatio(1); bloom.strength = 0.7; resize(); } }
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    const now = performance.now();

    // camera
    const d = THREE.MathUtils.smoothstep(cam.dolly, 0, 1);
    tmpP.lerpVectors(A.pos, B.pos, d); tmpL.lerpVectors(A.look, B.look, d);
    camera.position.x += ((tmpP.x + mx * 0.35 * (1 - d)) - camera.position.x) * 0.08;
    camera.position.y += ((tmpP.y - my * 0.18 * (1 - d)) - camera.position.y) * 0.08;
    camera.position.z += (tmpP.z - camera.position.z) * 0.1;
    camera.lookAt(tmpL.x + mx * 0.15, tmpL.y - my * 0.08, tmpL.z);

    // the marquee changes its letters every few seconds while you're out front
    if (!reduced && cam.dolly < 0.2 && now - lastSwitch > 4600) {
      lastSwitch = now; filmIdx++; const f = FILMS[filmIdx % FILMS.length];
      setTitle(f, false); hudShow(f);
    } else if (!started) { started = true; hudShow(FILMS[filmIdx % FILMS.length]); }
    if (board.busy) { const p = Math.min(1, (now - board.t0) / 900); paintBoard(p); if (p >= 1) board.busy = false; }

    // chase lights
    const step = Math.floor(t * 5.5);
    for (let i = 0; i < N; i++) {
      let target;
      if (i < front.length) target = ((i - step) % 3 + 3) % 3 === 0 ? 1 : 0.16;
      else target = 0.55 + Math.sin(t * 1.3 + i) * 0.18;
      if (i === DEAD) target = 0.02;
      if (i === FLICKER) target = Math.random() < 0.08 ? 0.05 : target;
      if (reduced) target = i < front.length ? (i % 3 === 0 ? 1 : 0.3) : 0.5;
      bulbNow[i] += (target - bulbNow[i]) * (target > bulbNow[i] ? 0.55 : 0.18);
      const v = bulbNow[i];
      C.setRGB(0.25 + v * 2.6, 0.16 + v * 1.9, 0.07 + v * 1.0); inst.setColorAt(i, C);
      C.multiplyScalar(0.55); instMirror.setColorAt(i, C);
    }
    inst.instanceColor.needsUpdate = true; instMirror.instanceColor.needsUpdate = true;

    // neon: hums, and the N drops out now and then
    const buzz = 0.92 + Math.sin(t * 37) * 0.04 + Math.sin(t * 7.3) * 0.04;
    neon.userData.mat.color.setRGB(3.4 * buzz, 0.5 * buzz, 0.42 * buzz);
    const nDrop = (Math.sin(t * 0.9) > 0.985 || Math.sin(t * 2.3 + 1) > 0.995) ? 0.15 : 1;
    neon.children.forEach((m, i) => { if (i >= 5) m.visible = nDrop === 1 || Math.random() < 0.5; });
    neonGlow.material.opacity = 0.16 + 0.08 * buzz;

    // walking in: the doorway brightens and the spill widens
    const open = THREE.MathUtils.smoothstep(cam.dolly, 0.55, 1);
    doorway.material.color.setRGB(1.35 + open * 0.55, 1.1 + open * 0.45, 0.8 + open * 0.35);
    doorGlow.material.opacity = 0.16 + open * 0.2; doorGlow.scale.setScalar(5.5 + open * 2);
    spill.material.opacity = 0.85 + open * 0.3;
    doorLight.intensity = 10 + open * 14;
    hinge.rotation.y = 0.62 + open * 0.5;

    // dust drifts up through the light
    const p = dgeo.attributes.position.array;
    for (let i = 0; i < DN; i++) { p[i * 3 + 1] += dt * 0.06; p[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.02; if (p[i * 3 + 1] > 5) p[i * 3 + 1] = 0; }
    dgeo.attributes.position.needsUpdate = true;

    composer.render();
  }
  tick();
  return { setTitle, cam, camera, tick, resize };
}
// ?no3d=1 skips WebGL (used for quick screenshots and as a manual fallback)
const NO3D = new URLSearchParams(location.search).has('no3d');
const stage = NO3D ? (document.querySelector('.hero').classList.add('nogl'), null) : initStage();
window.__oc = stage;

/* ---------- cursor + magnetic buttons (fine pointers only) ---------- */
if (finePointer && !reduced) {
  const cur = document.getElementById('cursor');
  if (cur) {
    document.body.classList.add('has-cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy, shown = false;
    window.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cur.style.display = 'block'; cx = tx; cy = ty; }
      cur.classList.toggle('hot', !!e.target.closest('a,button,.film,.channel-card'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => { cur.style.display = 'none'; shown = false; });
    (function follow() { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(follow); })();
  }
  document.querySelectorAll('.btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      b.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

/* ---------- motion (GSAP) ---------- */
const fmtNum = (el, v) => {
  const dec = parseInt(el.dataset.decimals || '0', 10), suf = (el.dataset.suffix || '').trim();
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (suf ? `<small>${suf}</small>` : '');
};
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ScrollTrigger.refresh(); });
  window.addEventListener('scroll', () => ScrollTrigger.refresh(), { once: true, passive: true });
  if (!reduced) {
    gsap.from('.hero-copy > *', { y: 34, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.3 });
    // the hero is CSS-sticky inside #heroWrap; scrolling through the wrapper drives the walk to the door (no GSAP pin, so a resize can never freeze the layout)
    // end = the wrapper's extra height (95vh desktop / 70vh mobile, see .hero-wrap) computed from the viewport, not measured from the DOM —
    // a page loaded in a hidden tab can measure the wrapper as 0px, which would park the camera at the door before anyone scrolls
    const extra = () => '+=' + Math.round(window.innerHeight * (window.matchMedia('(max-width: 900px)').matches ? 0.7 : 0.95));
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#heroWrap', start: 'top top', end: extra, scrub: 0.8, invalidateOnRefresh: true,
      onUpdate: self => { if (hud) hud.classList.toggle('hide', self.progress > 0.1); } } });
    tl.to(cam, { dolly: 1, ease: 'none', duration: 1 }, 0)
      .to('.hero-copy', { y: -70, opacity: 0, ease: 'power1.in', duration: 0.5 }, 0)
      .to('.scroll-hint', { opacity: 0, duration: 0.3 }, 0)
      .to('.hero-glow', { opacity: 0.5, duration: 0.6 }, 0.45);
    document.querySelectorAll('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  }
  document.querySelectorAll('.num[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    if (reduced) { el.innerHTML = fmtNum(el, end); return; }
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.innerHTML = fmtNum(el, o.v); }, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
} else {
  document.querySelectorAll('.num[data-count]').forEach(el => { el.innerHTML = fmtNum(el, parseFloat(el.dataset.count)); });
}
