// Vice City Cover Studio — offline GTA 6-style cover maker.
// One 2D canvas draws the whole poster: five photo panels with gold
// frames, a striped sunset title, a neon script subtitle, a quote bar,
// a tagline strip and a billing block. No libraries, no network.

const SAMPLES = {
  hero: 'samples/hero-duo.jpg',
  neon: 'samples/neon-woman.jpg',
  roof: 'samples/rooftop-man.jpg',
  boat: 'samples/speedboat.jpg',
};
const SAMPLE_LABELS = {
  hero: 'Hero Duo',
  neon: 'Neon Diner',
  roof: 'Rooftop',
  boat: 'Speedboat',
};

const PANEL_DEFS = [
  { id: 'hero', name: 'Hero — Jason & Lucia', tag: 'THE DRIVER', src: SAMPLES.hero, zoom: 1.0, fx: 0.5, fy: 0.42 },
  { id: 'lookout', name: 'Lookout', tag: 'THE LOOKOUT', src: SAMPLES.neon, zoom: 1.05, fx: 0.5, fy: 0.45 },
  { id: 'fixer', name: 'Fixer', tag: 'THE FIXER', src: SAMPLES.roof, zoom: 1.0, fx: 0.5, fy: 0.35 },
  { id: 'captain', name: 'Captain', tag: 'THE CAPTAIN', src: SAMPLES.boat, zoom: 1.0, fx: 0.5, fy: 0.5 },
  { id: 'getaway', name: 'Getaway', tag: 'THE GETAWAY', src: SAMPLES.roof, zoom: 1.35, fx: 0.62, fy: 0.22 },
];

const EXPORT_SIZES = { wide: [1920, 1080], square: [1080, 1080], portrait: [1080, 1350] };
const SHOT_SIZES = { wide: [1280, 720], square: [1024, 1024], portrait: [1024, 1280] };
const PREVIEW_SIZES = { wide: [960, 540], square: [680, 680], portrait: [540, 675] };

const state = {
  layout: 'duo',
  grade: 'sunset',
  size: 'wide',
  title: 'VICE CITY',
  script: 'Jason & Lucia',
  quote: 'EVERY SUNSET ENDS IN A GETAWAY',
  tagline: 'TWO OUTLAWS · ONE COAST · NO WAY BACK',
  panels: PANEL_DEFS.map((d) => ({ ...d, img: null })),
};

// Deterministic pseudo-random so the barcode and grain never change.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}

const fracRect = (x0, y0, x1, y1, W, H) => ({
  x: x0 * W,
  y: y0 * H,
  w: (x1 - x0) * W,
  h: (y1 - y0) * H,
});

// Panel rectangles per layout, as fractions of the canvas. The quote bar
// lives above y 0.085 and the bottom strip below y 0.865; panels sit
// between them. The title zone is where the big title is drawn.
function layoutRects(layout, W, H) {
  if (layout === 'bleed') {
    return {
      hero: fracRect(0.012, 0.095, 0.988, 0.855, W, H),
      lookout: fracRect(0.02, 0.6, 0.245, 0.855, W, H),
      fixer: fracRect(0.26, 0.6, 0.49, 0.855, W, H),
      captain: fracRect(0.51, 0.6, 0.74, 0.855, W, H),
      getaway: fracRect(0.755, 0.6, 0.98, 0.855, W, H),
      titleZone: fracRect(0.06, 0.24, 0.94, 0.52, W, H),
    };
  }
  if (layout === 'strip') {
    return {
      hero: fracRect(0.012, 0.095, 0.6, 0.855, W, H),
      lookout: fracRect(0.615, 0.095, 0.795, 0.46, W, H),
      fixer: fracRect(0.805, 0.095, 0.988, 0.46, W, H),
      captain: fracRect(0.615, 0.48, 0.795, 0.855, W, H),
      getaway: fracRect(0.805, 0.48, 0.988, 0.855, W, H),
      titleZone: fracRect(0.03, 0.58, 0.58, 0.82, W, H),
    };
  }
  // duo (default): wide hero in the middle, four corner panels around it.
  return {
    hero: fracRect(0.265, 0.095, 0.735, 0.855, W, H),
    lookout: fracRect(0.012, 0.095, 0.255, 0.46, W, H),
    fixer: fracRect(0.745, 0.095, 0.988, 0.46, W, H),
    captain: fracRect(0.012, 0.48, 0.255, 0.855, W, H),
    getaway: fracRect(0.745, 0.48, 0.988, 0.855, W, H),
    titleZone: fracRect(0.24, 0.56, 0.76, 0.82, W, H),
  };
}

// Cover-fit a photo into a panel rect, with zoom and a focal point
// (fx, fy in 0..1) that picks which part of the photo stays visible.
function drawPhotoCover(ctx, img, rect, zoom, fx, fy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) * fx;
  const dy = rect.y + (rect.h - dh) * fy;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// A tall hero panel cannot cover-fit a wide duo photo without slicing
// both faces off at the edges (portrait is 0.49 aspect vs the photo's
// 1.5). Fill it with a darkened blurred copy instead, then show the
// whole photo sharp on top — a poster treatment, not a gap.
function drawPhotoBlurFill(ctx, img, rect) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const coverScale = Math.max(rect.w / iw, rect.h / ih);
  ctx.save();
  ctx.filter = 'blur(18px) brightness(0.55)';
  ctx.drawImage(
    img,
    rect.x + (rect.w - iw * coverScale) / 2,
    rect.y + (rect.h - ih * coverScale) / 2,
    iw * coverScale,
    ih * coverScale,
  );
  ctx.restore();
  const fitScale = Math.min(rect.w / iw, rect.h / ih);
  const dw = iw * fitScale;
  const dh = ih * fitScale;
  ctx.drawImage(img, rect.x + (rect.w - dw) / 2, rect.y + (rect.h - dh) / 2, dw, dh);
}

function drawPanel(ctx, panel, rect, W, H, tagOnTop) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel.img) {
    if (panel.id === 'hero' && rect.w / rect.h < 0.55) {
      drawPhotoBlurFill(ctx, panel.img, rect);
    } else {
      drawPhotoCover(ctx, panel.img, rect, panel.zoom, panel.fx, panel.fy);
    }
  } else {
    ctx.fillStyle = '#2a1547';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeStyle = '#d8a93b';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  // Role tag chip. The hero tag sits at the top so the big title never
  // covers it; the other tags sit at the bottom of their panel.
  const tagPx = Math.max(9, H * 0.016);
  ctx.font = `400 ${tagPx}px Anton, 'Arial Black', sans-serif`;
  const tw = ctx.measureText(panel.tag).width;
  const padX = tagPx * 0.55;
  const padY = tagPx * 0.4;
  const chipW = tw + padX * 2;
  const chipH = tagPx + padY * 2;
  const chipX = rect.x + Math.max(6, W * 0.006);
  const chipY = tagOnTop
    ? rect.y + Math.max(6, H * 0.008)
    : rect.y + rect.h - chipH - Math.max(6, H * 0.008);
  ctx.fillStyle = 'rgba(10,4,24,0.85)';
  ctx.fillRect(chipX, chipY, chipW, chipH);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#d8a93b';
  ctx.strokeRect(chipX, chipY, chipW, chipH);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(panel.tag, chipX + padX, chipY + chipH / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

// The big title is drawn on a throwaway canvas first, so the diagonal
// stripes can be clipped to the letters alone (source-atop) without
// touching the photos underneath.
function drawTitle(ctx, zone, W, H) {
  const text = state.title.toUpperCase();
  const tmp = document.createElement('canvas');
  tmp.width = Math.max(2, Math.ceil(zone.w));
  tmp.height = Math.max(2, Math.ceil(zone.h));
  const t = tmp.getContext('2d');
  let px = zone.h * 0.78;
  const setFont = (s) => {
    t.font = `400 ${s}px Anton, 'Arial Black', sans-serif`;
  };
  setFont(px);
  const maxW = zone.w * 0.98;
  while (px > 18 && t.measureText(text).width > maxW) {
    px *= 0.94;
    setFont(px);
  }
  const tw = t.measureText(text).width;
  const tx = (zone.w - tw) / 2;
  const ty = zone.h * 0.72;
  t.textBaseline = 'alphabetic';
  t.textAlign = 'left';
  t.shadowColor = 'rgba(0,0,0,0.55)';
  t.shadowBlur = px * 0.08;
  t.shadowOffsetY = px * 0.04;
  const grad = t.createLinearGradient(tx, 0, tx + tw, 0);
  grad.addColorStop(0, '#ffb347');
  grad.addColorStop(0.32, '#ff7a59');
  grad.addColorStop(0.55, '#ff5e8a');
  grad.addColorStop(0.8, '#b45cff');
  grad.addColorStop(1, '#7a5cff');
  t.fillStyle = grad;
  t.fillText(text, tx, ty);
  t.shadowColor = 'transparent';
  t.shadowBlur = 0;
  t.shadowOffsetY = 0;
  t.globalCompositeOperation = 'source-atop';
  t.strokeStyle = 'rgba(20,4,40,0.16)';
  t.lineWidth = Math.max(2, px * 0.05);
  t.beginPath();
  for (let sx = tx - zone.h; sx < tx + tw + zone.h; sx += px * 0.26) {
    t.moveTo(sx, ty - px);
    t.lineTo(sx + px * 0.45, ty + px * 0.1);
  }
  t.stroke();
  t.globalCompositeOperation = 'source-over';
  const viW = t.measureText('VI').width;
  const gold = t.createLinearGradient(tx, 0, tx + viW, 0);
  gold.addColorStop(0, '#ffe27a');
  gold.addColorStop(1, '#f0a500');
  t.fillStyle = gold;
  t.fillText('VI', tx, ty);
  ctx.drawImage(tmp, zone.x, zone.y);
  return { x: zone.x + tx, y: zone.y + ty, w: tw, h: px };
}

function drawScript(ctx, titleBox, W, H) {
  const text = state.script;
  let px = titleBox.h * 0.42;
  const setFont = (s) => {
    ctx.font = `400 ${s}px Pacifico, cursive`;
  };
  setFont(px);
  const maxW = titleBox.w * 0.98;
  while (px > 16 && ctx.measureText(text).width > maxW) {
    px *= 0.94;
    setFont(px);
  }
  ctx.save();
  ctx.translate(titleBox.x + titleBox.w / 2, titleBox.y + titleBox.h * 0.22);
  ctx.rotate(-0.045);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff2ea6';
  ctx.shadowBlur = H * 0.02;
  ctx.fillStyle = '#ff7ad9';
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawQuoteBar(ctx, W, H) {
  const barH = H * 0.085;
  const cy = barH / 2;
  const starPx = Math.max(12, H * 0.03);
  ctx.font = `400 ${starPx}px Anton, 'Arial Black', sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5c542';
  const stars = '★★★★★';
  const sx = W * 0.02;
  ctx.fillText(stars, sx, cy);
  const starsW = ctx.measureText(stars).width;
  // Ticket stub on the right.
  const stubW = W * 0.075;
  const stubH = barH * 0.62;
  const stubX = W * 0.985 - stubW;
  const stubY = cy - stubH / 2;
  ctx.save();
  ctx.translate(stubX + stubW / 2, stubY + stubH / 2);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#ffd23e';
  ctx.fillRect(-stubW / 2, -stubH / 2, stubW, stubH);
  ctx.fillStyle = '#1a0b2e';
  const stubPx = Math.max(10, stubH * 0.42);
  ctx.font = `400 ${stubPx}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('VOL. VI', 0, 1);
  ctx.restore();
  ctx.textAlign = 'left';
  // Quote + byline, centered in the space between stars and stub.
  const availX0 = sx + starsW + W * 0.015;
  const availX1 = stubX - W * 0.015;
  const availW = availX1 - availX0;
  const byline = ' — THE VICE GAZETTE';
  let qPx = Math.max(11, H * 0.032);
  const setQ = (s) => {
    ctx.font = `400 ${s}px Anton, 'Arial Black', sans-serif`;
  };
  setQ(qPx);
  while (qPx > 10 && ctx.measureText(state.quote + byline).width > availW) {
    qPx *= 0.94;
    setQ(qPx);
  }
  const qw = ctx.measureText(state.quote).width;
  const bw = ctx.measureText(byline).width;
  const qx = availX0 + (availW - qw - bw) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.quote, qx, cy);
  ctx.fillStyle = '#c9b8d9';
  ctx.font = `400 ${Math.max(9, qPx * 0.62)}px Anton, 'Arial Black', sans-serif`;
  ctx.fillText(byline, qx + qw + 2, cy);
}

function drawBottomStrip(ctx, W, H) {
  const y0 = H * 0.865;
  let px = Math.max(12, H * 0.03);
  ctx.font = `400 ${px}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (px > 10 && ctx.measureText(state.tagline).width > W * 0.62) {
    px *= 0.94;
    ctx.font = `400 ${px}px Anton, 'Arial Black', sans-serif`;
  }
  ctx.fillStyle = '#ffc94d';
  ctx.fillText(state.tagline, W / 2, y0 + H * 0.028);
  const bPx = Math.max(9, H * 0.017);
  ctx.font = `400 ${bPx}px Anton, 'Arial Black', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('A VICE CITY PICTURE · STARRING JASON & LUCIA', W / 2, y0 + H * 0.062);
  ctx.fillStyle = '#c9b8d9';
  ctx.fillText('SHOT ON YOUR OWN CAMERA · GRADED BY HAND', W / 2, y0 + H * 0.088);
  ctx.textAlign = 'left';
  const cPx = Math.max(11, H * 0.028);
  ctx.font = `400 ${cPx}px Anton, 'Arial Black', sans-serif`;
  ctx.fillStyle = '#ff5e8a';
  ctx.fillText('COMING SOON', W * 0.02, y0 + H * 0.075);
  // Barcode (deterministic bars) and a gold seal on the right.
  const bcW = W * 0.07;
  const bcH = H * 0.062;
  const bcX = W * 0.855;
  const bcY = y0 + H * 0.012;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bcX, bcY, bcW, bcH);
  const rnd = mulberry32(20261120);
  ctx.fillStyle = '#111111';
  let bx = bcX + bcW * 0.06;
  while (bx < bcX + bcW * 0.94) {
    const bw = bcW * (0.015 + rnd() * 0.03);
    ctx.fillRect(bx, bcY + bcH * 0.08, bw, bcH * 0.84);
    bx += bw + bcW * (0.012 + rnd() * 0.025);
  }
  const sealR = H * 0.034;
  const sealX = W * 0.955;
  const sealY = y0 + H * 0.045;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd23e';
  ctx.fill();
  ctx.lineWidth = Math.max(1, sealR * 0.12);
  ctx.strokeStyle = '#a87e1f';
  ctx.stroke();
  ctx.fillStyle = '#1a0b2e';
  ctx.font = `400 ${sealR * 0.9}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('★', sealX, sealY + sealR * 0.04);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Warm / neon / gold / teal wash over the photo area only, then a
// vignette. The lettering above is drawn after this, so it stays crisp.
function applyGrade(ctx, grade, W, H) {
  const x = W * 0.01;
  const y = H * 0.09;
  const w = W * 0.98;
  const h = H * 0.77;
  let g;
  if (grade === 'neon') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,46,166,0.13)');
    g.addColorStop(1, 'rgba(0,229,204,0.12)');
  } else if (grade === 'gold') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,214,90,0.16)');
    g.addColorStop(1, 'rgba(240,165,0,0.16)');
  } else if (grade === 'teal') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,180,180,0.12)');
    g.addColorStop(1, 'rgba(40,10,80,0.15)');
  } else {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,154,61,0.15)');
    g.addColorStop(1, 'rgba(255,46,136,0.15)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const v = ctx.createRadialGradient(
    W / 2, H * 0.47, Math.min(W, H) * 0.35,
    W / 2, H * 0.47, Math.max(W, H) * 0.75,
  );
  v.addColorStop(0, 'rgba(10,2,24,0)');
  v.addColorStop(1, 'rgba(10,2,24,0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function grain(ctx, W, H) {
  const rnd = mulberry32(777);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 500; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.2, 1.2);
  }
}

function drawCover(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a2b';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const rects = layoutRects(state.layout, W, H);
  const order = state.layout === 'bleed'
    ? ['hero', 'lookout', 'fixer', 'captain', 'getaway']
    : ['lookout', 'fixer', 'captain', 'getaway', 'hero'];
  for (const id of order) {
    const panel = state.panels.find((p) => p.id === id);
    drawPanel(ctx, panel, rects[id], W, H, id === 'hero');
  }
  applyGrade(ctx, state.grade, W, H);
  grain(ctx, W, H);
  const titleBox = drawTitle(ctx, rects.titleZone, W, H);
  drawScript(ctx, titleBox, W, H);
  drawQuoteBar(ctx, W, H);
  drawBottomStrip(ctx, W, H);
}

// ---- Editor wiring ----

const canvas = document.getElementById('cover');
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
const isShotCover = shotMode === 'cover';

if (params.get('size') && (EXPORT_SIZES[params.get('size')] || SHOT_SIZES[params.get('size')])) {
  state.size = params.get('size');
}
if (isShotCover) document.body.classList.add('shot-cover');

function previewDims() {
  if (isShotCover) return SHOT_SIZES[state.size];
  return PREVIEW_SIZES[state.size];
}

function render() {
  const [w, h] = previewDims();
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h);
}

function buildPanelCards() {
  const list = document.getElementById('panelList');
  state.panels.forEach((panel, index) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const head = document.createElement('h3');
    head.textContent = panel.name;
    card.appendChild(head);

    const photoLabel = document.createElement('label');
    photoLabel.textContent = 'Photo';
    const select = document.createElement('select');
    for (const key of Object.keys(SAMPLES)) {
      const opt = document.createElement('option');
      opt.value = SAMPLES[key];
      opt.textContent = SAMPLE_LABELS[key];
      if (panel.src === SAMPLES[key]) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', async () => {
      panel.src = select.value;
      panel.img = await loadImage(select.value);
      render();
    });
    photoLabel.appendChild(select);
    card.appendChild(photoLabel);

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        panel.src = String(reader.result);
        panel.img = await loadImage(panel.src);
        render();
      };
      reader.readAsDataURL(f);
    });
    card.appendChild(file);

    const sliders = [
      ['Zoom', 1, 2, 0.05, 'zoom'],
      ['Position X', 0, 1, 0.01, 'fx'],
      ['Position Y', 0, 1, 0.01, 'fy'],
    ];
    for (const [label, min, max, step, key] of sliders) {
      const row = document.createElement('label');
      row.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(panel[key]);
      input.addEventListener('input', () => {
        panel[key] = Number(input.value);
        render();
      });
      row.appendChild(input);
      card.appendChild(row);
    }

    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Role tag';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.value = panel.tag;
    tagInput.maxLength = 18;
    tagInput.addEventListener('input', () => {
      panel.tag = tagInput.value.toUpperCase();
      render();
    });
    tagLabel.appendChild(tagInput);
    card.appendChild(tagLabel);

    list.appendChild(card);
  });
}

function wireToolbar() {
  const bind = (groupId, key) => {
    const group = document.getElementById(groupId);
    group.addEventListener('click', (event) => {
      const btn = event.target.closest('button');
      if (!btn) return;
      state[key] = btn.dataset[key];
      for (const b of group.querySelectorAll('button')) b.classList.remove('active');
      btn.classList.add('active');
      render();
    });
  };
  bind('layoutGroup', 'layout');
  bind('gradeGroup', 'grade');
  bind('sizeGroup', 'size');
}

function wireCaptions() {
  const pairs = [
    ['inTitle', 'title'],
    ['inScript', 'script'],
    ['inQuote', 'quote'],
    ['inTagline', 'tagline'],
  ];
  for (const [inputId, key] of pairs) {
    const input = document.getElementById(inputId);
    input.addEventListener('input', () => {
      state[key] = input.value;
      render();
    });
  }
}

async function exportPNG() {
  const [w, h] = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  await ready;
  drawCover(off.getContext('2d'), w, h);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

document.getElementById('exportBtn').addEventListener('click', exportPNG);

// Load the sample photos and the two fonts before the first real paint;
// a paint with fallback fonts is drawn first so the page never sits blank.
const ready = (async () => {
  await Promise.all(
    state.panels.map(async (panel) => {
      try {
        panel.img = await loadImage(panel.src);
      } catch {
        panel.img = null;
      }
    }),
  );
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 40px Anton'),
        document.fonts.load('400 40px Pacifico'),
        document.fonts.ready,
      ]),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch {
    // Fallback fonts are fine; the cover still renders.
  }
})();

buildPanelCards();
wireToolbar();
wireCaptions();
render();
ready.then(() => {
  render();
  window.__coverReady = true;
});
