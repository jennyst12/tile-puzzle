// ── Constants ────────────────────────────────────────────────
const N = 4, TOTAL = N * N;
const TILE_PX = 200;

// Solved layout: tiles 1..15 at indices 0..14, empty (0) at index 15.
// Tile value k belongs at index k-1.
const SOLVED = Array.from({length: TOTAL}, (_, i) => i < TOTAL - 1 ? i + 1 : 0);

// ── State ────────────────────────────────────────────────────
let state = [], history = [], initialState = [];
let moveCount = 0;
let completedCount = parseInt(localStorage.getItem('fifteen_completed') || '0');
let bestMoves = parseInt(localStorage.getItem('fifteen_best') || '0') || null;
let won = false, hintTimer = null;
let tileImages = [];
let activePatternIdx = 0;
let usingCustomImage = false;
let fwAnim = null;

// ── DOM ──────────────────────────────────────────────────────
const boardEl     = document.getElementById('board');
const movesEl     = document.getElementById('moves');
const completedEl = document.getElementById('completed');
const bestEl      = document.getElementById('best');
const winOverlay  = document.getElementById('winOverlay');
const winMovesEl  = document.getElementById('winMoves');
const btnHint     = document.getElementById('btnHint');
const btnUndo     = document.getElementById('btnUndo');
const btnRestart  = document.getElementById('btnRestart');
const btnNew      = document.getElementById('btnNew');
const imgUrlInput = document.getElementById('imgUrl');
const btnImg      = document.getElementById('btnImg');
const msgEl       = document.getElementById('msg');
const patternRow  = document.getElementById('patternRow');
const fwCanvas    = document.getElementById('fwCanvas');

completedEl.textContent = completedCount;
bestEl.textContent = bestMoves || '—';

// ── Patterns ─────────────────────────────────────────────────
function drawMoonscape(ctx, s) {
  const sky = ctx.createLinearGradient(0, 0, 0, s * 0.65);
  sky.addColorStop(0, '#0d1b2a');
  sky.addColorStop(0.5, '#1a3a4a');
  sky.addColorStop(1, '#2d5a6e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, s, s);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  [[30,20],[80,15],[140,35],[200,10],[260,28],[310,18],[370,8],
   [50,55],[120,45],[180,60],[240,40],[300,50],[350,30],
   [20,85],[90,75],[160,90],[220,70],[280,82],[340,65],[390,78]]
    .forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x / 400 * s, y / 400 * s, 1.5 * s / 400, 0, Math.PI * 2);
      ctx.fill();
    });

  ctx.fillStyle = '#c9a96e';
  ctx.beginPath(); ctx.arc(0.78*s, 0.12*s, 0.055*s, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a3a4a';
  ctx.beginPath(); ctx.arc(0.8*s, 0.105*s, 0.042*s, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#1a3550'; ctx.beginPath();
  ctx.moveTo(0, s*.72); ctx.lineTo(s*.12, s*.38); ctx.lineTo(s*.27, s*.55);
  ctx.lineTo(s*.42, s*.3); ctx.lineTo(s*.58, s*.52); ctx.lineTo(s*.72, s*.32);
  ctx.lineTo(s*.88, s*.5); ctx.lineTo(s, s*.42); ctx.lineTo(s, s*.72);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#0f2235'; ctx.beginPath();
  ctx.moveTo(0, s*.85); ctx.lineTo(s*.15, s*.52); ctx.lineTo(s*.3, s*.68);
  ctx.lineTo(s*.48, s*.44); ctx.lineTo(s*.65, s*.62); ctx.lineTo(s*.8, s*.48);
  ctx.lineTo(s*.95, s*.6); ctx.lineTo(s, s*.55); ctx.lineTo(s, s*.85);
  ctx.closePath(); ctx.fill();

  const w = ctx.createLinearGradient(0, s*.72, 0, s);
  w.addColorStop(0, '#0a1c2e'); w.addColorStop(1, '#061018');
  ctx.fillStyle = w; ctx.fillRect(0, s*.72, s, s*.28);

  ctx.strokeStyle = 'rgba(201,169,110,0.15)'; ctx.lineWidth = s * 0.006;
  for (let i = 0; i < 6; i++) {
    const y = s * (0.75 + i * 0.04);
    ctx.beginPath(); ctx.moveTo(s * 0.1, y); ctx.lineTo(s * 0.9, y); ctx.stroke();
  }

  const sh = ctx.createRadialGradient(s*.78, s*.85, 0, s*.78, s*.85, s*.25);
  sh.addColorStop(0, 'rgba(201,169,110,0.18)'); sh.addColorStop(1, 'transparent');
  ctx.fillStyle = sh; ctx.fillRect(0, s*.72, s, s*.28);
}

function drawMandala(ctx, s) {
  const cx = s / 2, cy = s / 2;
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.7);
  bg.addColorStop(0, '#1a0a2e'); bg.addColorStop(0.5, '#12062a'); bg.addColorStop(1, '#080412');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s);

  [[12, 'rgba(201,169,110,0.6)', s*.38],
   [8,  'rgba(126,184,201,0.5)', s*.26],
   [6,  'rgba(180,120,200,0.45)', s*.16]]
    .forEach(([n, col, r]) => {
      for (let i = 0; i < n; i++) {
        const a = i * Math.PI * 2 / n;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.18, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill(); ctx.restore();
      }
    });

  [s*.38, s*.26, s*.16, s*.07].forEach((r, i) => {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(201,169,110,${0.15 + i * 0.08})`;
    ctx.lineWidth = s * 0.008; ctx.stroke();
  });

  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * s * 0.42, cy + Math.sin(a) * s * 0.42);
    ctx.strokeStyle = 'rgba(201,169,110,0.08)'; ctx.lineWidth = s * 0.004; ctx.stroke();
  }

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.06);
  core.addColorStop(0, '#c9a96e'); core.addColorStop(1, 'rgba(201,169,110,0)');
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = core; ctx.fill();
}

function drawIsometric(ctx, s) {
  ctx.fillStyle = '#0a1520'; ctx.fillRect(0, 0, s, s);
  const cols = ['#1e3a5f','#2a5080','#1a2f4a','#0d2035','#7eb8c9','#5a9ab5','#3a7a95'];
  const sz = s / 8;
  for (let row = -2; row < 12; row++) {
    for (let col = -2; col < 14; col++) {
      const x = (col - row) * sz * 0.866;
      const y = (col + row) * sz * 0.5;
      const h = sz * (0.3 + Math.abs(Math.sin(col * 1.3 + row * 0.7)) * 0.7);
      const ci = Math.abs(col * 3 + row * 7) % cols.length;
      ctx.beginPath();
      ctx.moveTo(x, y-h); ctx.lineTo(x+sz*.866, y+sz*.5-h);
      ctx.lineTo(x, y+sz-h); ctx.lineTo(x-sz*.866, y+sz*.5-h);
      ctx.closePath(); ctx.fillStyle = cols[ci]; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x-sz*.866, y+sz*.5-h); ctx.lineTo(x, y+sz-h);
      ctx.lineTo(x, y+sz); ctx.lineTo(x-sz*.866, y+sz*.5);
      ctx.closePath(); ctx.fillStyle = cols[(ci+2)%cols.length]; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x+sz*.866, y+sz*.5-h); ctx.lineTo(x, y+sz-h);
      ctx.lineTo(x, y+sz); ctx.lineTo(x+sz*.866, y+sz*.5);
      ctx.closePath(); ctx.fillStyle = cols[(ci+4)%cols.length]; ctx.fill();
    }
  }
}

function drawAurora(ctx, s) {
  ctx.fillStyle = '#020810'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  [[40,30],[100,20],[160,45],[230,15],[290,35],[350,25],[410,10],[60,65],[150,55],[220,70],[310,60],[380,50]]
    .forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x/420*s, y/420*s, s*0.003, 0, Math.PI*2); ctx.fill();
    });

  [{y:0.15,h:0.22,col:'rgba(50,200,120,'},
   {y:0.1, h:0.35,col:'rgba(80,150,255,'},
   {y:0.2, h:0.28,col:'rgba(160,80,220,'},
   {y:0.05,h:0.18,col:'rgba(50,220,180,'}]
    .forEach(({y, h, col}) => {
      for (let x = 0; x < s; x += 2) {
        const wave = Math.sin(x/s * Math.PI*3 + y*10) * s*0.04 + Math.sin(x/s * Math.PI*5) * s*0.02;
        const top = (y + wave/s) * s, bot = (y + h + wave/s*0.5) * s;
        const g = ctx.createLinearGradient(0, top, 0, bot);
        g.addColorStop(0, col+'0)'); g.addColorStop(0.3, col+'0.15)');
        g.addColorStop(0.7, col+'0.1)'); g.addColorStop(1, col+'0)');
        ctx.fillStyle = g; ctx.fillRect(x, top, 2, bot - top);
      }
    });

  const hz = ctx.createLinearGradient(0, s*0.55, 0, s);
  hz.addColorStop(0, 'rgba(0,60,80,0.8)'); hz.addColorStop(0.4, 'rgba(0,30,50,0.95)'); hz.addColorStop(1, '#020810');
  ctx.fillStyle = hz; ctx.fillRect(0, s*0.55, s, s*0.45);

  ctx.fillStyle = '#010608';
  for (let x = 0; x < s; x += s/40) {
    const th = s * (0.06 + Math.random() * 0.08), tx = x + Math.random() * s/40;
    ctx.beginPath(); ctx.moveTo(tx, s*0.68); ctx.lineTo(tx + s/80, s*0.68 - th); ctx.lineTo(tx + s/40, s*0.68); ctx.fill();
  }
  ctx.fillStyle = '#010608'; ctx.fillRect(0, s*0.68, s, s*0.32);
}

function drawMosaic(ctx, s) {
  const pal = ['#c9a96e','#7eb8c9','#e8d5a3','#4a7a8a','#9b6e4a','#2a4a5a','#d4956a','#5a9ab5','#b8843a','#3a6a7a'];
  const g = 12, cs = s / g;
  for (let r = 0; r < g; r++) {
    for (let c = 0; c < g; c++) {
      const ci = (r*g + c + r*3 + c*7) % pal.length, pad = cs * 0.06;
      ctx.fillStyle = pal[ci]; ctx.fillRect(c*cs + pad, r*cs + pad, cs - pad*2, cs - pad*2);
      if ((r + c) % 3 === 0) {
        ctx.save(); ctx.translate(c*cs + cs/2, r*cs + cs/2); ctx.rotate(Math.PI/4);
        ctx.fillStyle = pal[(ci+3) % pal.length];
        const d = cs * 0.28; ctx.fillRect(-d/2, -d/2, d, d); ctx.restore();
      }
    }
  }
  ctx.strokeStyle = 'rgba(10,12,18,0.7)'; ctx.lineWidth = s * 0.008;
  for (let i = 0; i <= g; i++) {
    ctx.beginPath(); ctx.moveTo(i*cs, 0); ctx.lineTo(i*cs, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*cs); ctx.lineTo(s, i*cs); ctx.stroke();
  }
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function drawSpirograph(ctx, s) {
  const bg = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s*0.7);
  bg.addColorStop(0, '#1a1030'); bg.addColorStop(1, '#060410');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s);
  const cx = s/2, cy = s/2;
  [{R:s*.38, r:s*.12, d:s*.28, col:'rgba(201,169,110,0.55)', steps:800},
   {R:s*.3,  r:s*.08, d:s*.32, col:'rgba(126,184,201,0.5)',  steps:700},
   {R:s*.32, r:s*.05, d:s*.25, col:'rgba(180,120,200,0.45)', steps:600},
   {R:s*.2,  r:s*.07, d:s*.18, col:'rgba(100,200,160,0.4)',  steps:500}]
    .forEach(({R, r, d, col, steps}) => {
      ctx.beginPath();
      const ratio = Math.round(R / r);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps * Math.PI * 2 * ratio;
        const x = cx + (R-r) * Math.cos(t) + d * Math.cos((R-r)/r * t);
        const y = cy + (R-r) * Math.sin(t) - d * Math.sin((R-r)/r * t);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = col; ctx.lineWidth = s * 0.006; ctx.stroke();
    });
}

const patterns = [
  { name: 'Moonscape',  fn: drawMoonscape  },
  { name: 'Mandala',    fn: drawMandala    },
  { name: 'Isometric',  fn: drawIsometric  },
  { name: 'Aurora',     fn: drawAurora     },
  { name: 'Mosaic',     fn: drawMosaic     },
  { name: 'Spirograph', fn: drawSpirograph },
];

// ── Image slicing ────────────────────────────────────────────
// Tile value k → image chunk at grid row floor((k-1)/N), col (k-1)%N.
function sliceImage(src) {
  const fw = src.naturalWidth || src.width;
  const fh = src.naturalHeight || src.height;
  const side = Math.min(fw, fh);
  const ox = (fw - side) / 2, oy = (fh - side) / 2;
  const ts = TILE_PX, tot = ts * N;
  const fc = document.createElement('canvas');
  fc.width = tot; fc.height = tot;
  fc.getContext('2d').drawImage(src, ox, oy, side, side, 0, 0, tot, tot);
  tileImages = [null];
  for (let k = 1; k < TOTAL; k++) {
    const row = Math.floor((k-1) / N), col = (k-1) % N;
    const tc = document.createElement('canvas');
    tc.width = ts; tc.height = ts;
    tc.getContext('2d').drawImage(fc, col*ts, row*ts, ts, ts, 0, 0, ts, ts);
    tileImages.push(tc);
  }
}

function loadPattern(idx) {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 800;
  patterns[idx].fn(c.getContext('2d'), 800);
  sliceImage(c);
}

function loadFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { sliceImage(img); resolve(); };
    img.onerror = () => reject(new Error('failed'));
    img.src = url;
  });
}

// ── Pattern picker UI ────────────────────────────────────────
function buildPatternRow() {
  patternRow.innerHTML = '';
  patterns.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'pat-btn' + (i === activePatternIdx ? ' active' : '');
    btn.title = p.name;
    const c = document.createElement('canvas');
    c.width = 80; c.height = 80;
    p.fn(c.getContext('2d'), 80);
    btn.appendChild(c);
    btn.addEventListener('click', () => {
      activePatternIdx = i;
      usingCustomImage = false;
      msgEl.textContent = ''; msgEl.className = 'msg';
      document.querySelectorAll('.pat-btn').forEach((b, j) => b.classList.toggle('active', j === i));
      loadPattern(i);
      newGame();
    });
    patternRow.appendChild(btn);
  });
}

// ── Puzzle logic ─────────────────────────────────────────────
function isSolvable(arr) {
  let inv = 0;
  const flat = arr.filter(x => x !== 0);
  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++)
      if (flat[i] > flat[j]) inv++;
  const emptyFromBottom = N - Math.floor(arr.indexOf(0) / N);
  if (N % 2 === 1) return inv % 2 === 0;
  return emptyFromBottom % 2 === 0 ? inv % 2 === 1 : inv % 2 === 0;
}

function isSolved(arr) { return arr.every((v, i) => v === SOLVED[i]); }

function shuffle() {
  const arr = [...SOLVED];
  do {
    for (let i = TOTAL - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } while (!isSolvable(arr) || isSolved(arr));
  return arr;
}

function movableTiles(arr) {
  const ei = arr.indexOf(0), er = Math.floor(ei / N), ec = ei % N;
  return [[-1,0],[1,0],[0,-1],[0,1]]
    .map(([dr, dc]) => [er+dr, ec+dc])
    .filter(([r, c]) => r >= 0 && r < N && c >= 0 && c < N)
    .map(([r, c]) => r * N + c);
}

function moveTile(arr, idx) {
  const next = [...arr], ei = next.indexOf(0);
  [next[ei], next[idx]] = [next[idx], next[ei]];
  return next;
}

function totalManhattan(arr) {
  return arr.reduce((sum, val, idx) => {
    if (val === 0) return sum;
    const goalR = Math.floor((val-1) / N), goalC = (val-1) % N;
    return sum + Math.abs(Math.floor(idx/N) - goalR) + Math.abs(idx%N - goalC);
  }, 0);
}

function hintTile(arr) {
  const movable = movableTiles(arr), cur = totalManhattan(arr);
  let best = null, bestD = -Infinity;
  for (const idx of movable) {
    const d = cur - totalManhattan(moveTile(arr, idx));
    if (d > bestD) { bestD = d; best = idx; }
  }
  return best;
}

// ── Render ───────────────────────────────────────────────────
function render() {
  boardEl.innerHTML = '';
  const movable = won ? [] : movableTiles(state);
  state.forEach((val, idx) => {
    const tile = document.createElement('div');
    tile.className = 'tile' + (val === 0 ? ' empty' : '');
    if (val !== 0 && idx === val - 1) tile.classList.add('correct');
    if (val !== 0 && tileImages[val]) {
      const c = document.createElement('canvas');
      c.width = TILE_PX; c.height = TILE_PX;
      c.getContext('2d').drawImage(tileImages[val], 0, 0);
      tile.appendChild(c);
      const num = document.createElement('span');
      num.className = 'num'; num.textContent = val;
      tile.appendChild(num);
    }
    if (movable.includes(idx)) {
      tile.addEventListener('click', () => handleClick(idx));
      tile.addEventListener('touchend', e => { e.preventDefault(); handleClick(idx); }, {passive: false});
    }
    boardEl.appendChild(tile);
  });
  movesEl.textContent = moveCount;
  btnUndo.disabled = history.length === 0;
}

function handleClick(idx) {
  if (won) return;
  clearHint();
  history.push([...state]);
  state = moveTile(state, idx);
  moveCount++;
  render();
  checkWin();
}

function clearHint() {
  clearTimeout(hintTimer);
  document.querySelectorAll('.hint-tile').forEach(t => t.classList.remove('hint-tile'));
}

// ── Win & fireworks ──────────────────────────────────────────
function checkWin() {
  if (!isSolved(state)) return;
  won = true;
  completedCount++;
  localStorage.setItem('fifteen_completed', completedCount);
  if (!bestMoves || moveCount < bestMoves) {
    bestMoves = moveCount;
    localStorage.setItem('fifteen_best', bestMoves);
  }
  completedEl.textContent = completedCount;
  bestEl.textContent = bestMoves;
  winMovesEl.textContent = moveCount + ' moves';
  launchFireworks(() => winOverlay.classList.add('show'));
}

function launchFireworks(onDone) {
  fwCanvas.width = window.innerWidth;
  fwCanvas.height = window.innerHeight;
  fwCanvas.style.display = 'block';
  const ctx = fwCanvas.getContext('2d');
  const particles = [];
  const colors = ['#c9a96e','#7eb8c9','#e8d5a3','#f0c080','#a0d8ef','#d4a0ff','#80efc0','#ffb870','#ff9090'];

  function hexToRgb(hex) {
    return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
  }

  function burst(x, y) {
    const count = 50 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 2 + Math.random() * 6;
      const col = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        alpha: 1, color: col, rgb: hexToRgb(col),
        size: 2 + Math.random() * 3,
        decay: 0.013 + Math.random() * 0.018,
        trail: []
      });
    }
  }

  const W = fwCanvas.width, H = fwCanvas.height;
  [0, 200, 420, 650, 870, 1100].forEach(t => {
    setTimeout(() => burst(W * (0.2 + Math.random() * 0.6), H * (0.1 + Math.random() * 0.45)), t);
  });

  const start = performance.now(), duration = 2400;

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.trail.push({x: p.x, y: p.y, a: p.alpha});
      if (p.trail.length > 6) p.trail.shift();
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.98; p.alpha -= p.decay;
      p.trail.forEach((pt, ti) => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, p.size * 0.5 * (ti / p.trail.length), 0, Math.PI*2);
        ctx.fillStyle = `rgba(${p.rgb},${pt.a * 0.35})`; ctx.fill();
      });
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.rgb},${Math.max(0, p.alpha)})`; ctx.fill();
      if (p.alpha <= 0) particles.splice(i, 1);
    }
    if (now - start < duration || particles.length > 0) {
      fwAnim = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
      fwCanvas.style.display = 'none';
      if (onDone) onDone();
    }
  }
  fwAnim = requestAnimationFrame(frame);
}

// ── Game flow ────────────────────────────────────────────────
function newGame() {
  clearHint();
  if (fwAnim) { cancelAnimationFrame(fwAnim); fwAnim = null; }
  fwCanvas.style.display = 'none';
  history = []; moveCount = 0; won = false;
  state = shuffle(); initialState = [...state];
  winOverlay.classList.remove('show');
  render();
}

function restart() {
  if (!initialState.length) return;
  clearHint();
  history = []; moveCount = 0; won = false;
  state = [...initialState];
  winOverlay.classList.remove('show');
  render();
}

// ── Events ───────────────────────────────────────────────────
btnHint.addEventListener('click', () => {
  if (won) return; clearHint();
  const idx = hintTile(state); if (idx === null) return;
  boardEl.querySelectorAll('.tile')[idx].classList.add('hint-tile');
  hintTimer = setTimeout(clearHint, 1800);
});

btnUndo.addEventListener('click', () => {
  if (!history.length) return; clearHint();
  state = history.pop(); moveCount = Math.max(0, moveCount - 1); render();
});

btnRestart.addEventListener('click', restart);
btnNew.addEventListener('click', newGame);
winOverlay.addEventListener('click', newGame);

btnImg.addEventListener('click', async () => {
  const url = imgUrlInput.value.trim(); if (!url) return;
  msgEl.textContent = 'Loading…'; msgEl.className = 'msg';
  try {
    await loadFromUrl(url);
    usingCustomImage = true;
    document.querySelectorAll('.pat-btn').forEach(b => b.classList.remove('active'));
    msgEl.textContent = 'Image loaded! Starting new game.';
    newGame();
  } catch (e) {
    msgEl.textContent = 'Could not load that image. Try a direct .jpg/.png URL.';
    msgEl.className = 'msg err';
  }
});

// ── Init ─────────────────────────────────────────────────────
buildPatternRow();
loadPattern(activePatternIdx);
newGame();
