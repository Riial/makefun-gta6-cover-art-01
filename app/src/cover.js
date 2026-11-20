// Neon Coast Cover Studio — the cover engine.
//
// Draws a six-frame GTA-style poster from photos + words onto a canvas.
// Every panel photo is drawn crop-fit (cover) around a focus point, so a
// face never gets cut and nothing is ever blur-filled: a panel that cannot
// fit its photo just crops tighter. All geometry is fractions of the cover
// size, so every layout works in every export size.

export const SIZES = {
  wide: { w: 1920, h: 1080, label: 'Wide', sub: '1920 × 1080' },
  square: { w: 1080, h: 1080, label: 'Square', sub: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait', sub: '1080 × 1350' },
};

export const LAYOUTS = {
  six: { label: 'Six-Frame', sub: 'feature + five' },
  solo: { label: 'Feature Solo', sub: 'one big frame' },
  strip: { label: 'Triple Strip', sub: 'three scenic bands' },
};

/** Strip bands are too short for faces, so each band frames a scene
 * (sky, open sea + rod, red car + street) instead of the panel's
 * photo and focus point. */
const STRIP_SHOTS = [
  { photo: 'pier', fx: 0.9, fy: 0.15, zoom: 1.8, tag: 'SUNSET SKY' },
  { photo: 'pier', fx: 0.95, fy: 0.42, zoom: 1.8, tag: 'OPEN WATER' },
  { photo: 'boulevard', fx: 0.12, fy: 0.62, zoom: 1.4, tag: 'LOW RIDER' },
];

export const GRADES = {
  sunset: {
    label: 'Sunset',
    sub: 'warm orange-pink',
    filter: 'saturate(1.3) contrast(1.06) sepia(0.12)',
    wash: ['rgba(255, 120, 40, 0)', 'rgba(255, 80, 40, 0.20)'],
  },
  neon: {
    label: 'Neon Nights',
    sub: 'magenta + teal',
    filter: 'saturate(1.7) contrast(1.12)',
    wash: ['rgba(255, 0, 110, 0.16)', 'rgba(0, 220, 200, 0.14)'],
  },
  gold: {
    label: 'Vice Gold',
    sub: 'amber glow',
    filter: 'sepia(0.38) saturate(1.5) contrast(1.05)',
    wash: ['rgba(255, 190, 60, 0.04)', 'rgba(255, 170, 30, 0.14)'],
  },
  dusk: {
    label: 'Teal Dusk',
    sub: 'teal + blue',
    filter: 'saturate(0.95) contrast(1.1) brightness(0.92)',
    wash: ['rgba(20, 60, 120, 0.18)', 'rgba(0, 180, 190, 0.12)'],
  },
};

export const SAMPLE_PHOTOS = {
  boulevard: { label: 'Boulevard — sunset convertible', file: 'samples/boulevard.jpg' },
  pier: { label: 'Pier — fishing at noon', file: 'samples/pier.jpg' },
};

/** The default cover: feature photo, five small frames, new words. */
export function defaultState() {
  return {
    layout: 'six',
    grade: 'sunset',
    size: 'wide',
    title: 'NEON COAST',
    subtitle: 'Sunset County',
    tagline: 'SIX FRAMES · ONE NIGHT · NO WAY BACK',
    quote: 'THE CITY NEVER LOOKS BACK',
    paper: 'THE NEON GAZETTE',
    panels: [
      { photo: 'boulevard', zoom: 1.0, fx: 0.62, fy: 0.24, tag: 'THE DRIVER' },
      { photo: 'pier', zoom: 1.0, fx: 0.42, fy: 0.26, tag: 'THE ANGLER' },
      { photo: 'boulevard', zoom: 1.45, fx: 0.22, fy: 0.20, tag: 'GOLDEN HOUR' },
      { photo: 'pier', zoom: 1.2, fx: 0.80, fy: 0.70, tag: 'OPEN WATER' },
      { photo: 'boulevard', zoom: 1.15, fx: 0.75, fy: 0.22, tag: 'PALM ROW' },
      { photo: 'pier', zoom: 1.5, fx: 0.85, fy: 0.72, tag: 'LOW TIDE' },
    ],
  };
}

/** Panel rectangles for a cover of W x H in the given layout. */
export function layoutRects(W, H, layout) {
  const m = Math.round(W * 0.012);
  const g = Math.max(4, Math.round(W * 0.008));
  const headerH = Math.round(H * 0.052);
  const footerH = Math.round(H * 0.155);
  const gridX = m;
  const gridY = headerH;
  const gridW = W - 2 * m;
  const gridH = H - headerH - footerH;
  const header = { x: 0, y: 0, w: W, h: headerH };
  const footer = { x: 0, y: headerH + gridH, w: W, h: footerH };

  if (layout === 'solo') {
    return { header, footer, panels: [{ x: gridX, y: gridY, w: gridW, h: gridH }] };
  }
  if (layout === 'strip') {
    const bh = Math.floor((gridH - 2 * g) / 3);
    return {
      header,
      footer,
      panels: [0, 1, 2].map((i) => ({
        x: gridX, y: gridY + i * (bh + g), w: gridW, h: i === 2 ? gridH - 2 * (bh + g) : bh,
      })),
    };
  }

  // six: one feature frame + five small frames, reflowed per aspect.
  if (W >= H) {
    const fw = Math.round(gridW * 0.44);
    const feature = { x: gridX, y: gridY, w: fw, h: gridH };
    const rx = gridX + fw + g;
    const rw = gridX + gridW - rx;
    const stripH = Math.round(gridH * 0.20);
    const sh = Math.floor((gridH - stripH - g) / 2);
    const sw = Math.floor((rw - g) / 2);
    const small = [
      { x: rx, y: gridY, w: sw, h: sh },
      { x: rx + sw + g, y: gridY, w: rw - sw - g, h: sh },
      { x: rx, y: gridY + sh + g, w: sw, h: sh },
      { x: rx + sw + g, y: gridY + sh + g, w: rw - sw - g, h: sh },
    ];
    const strip = { x: rx, y: gridY + 2 * sh + g, w: rw, h: gridH - 2 * sh - g };
    return { header, footer, panels: [feature, ...small, strip] };
  }
  const featureH = Math.round(gridH * 0.46);
  const feature = { x: gridX, y: gridY, w: gridW, h: featureH };
  const belowY = gridY + featureH + g;
  const belowH = gridH - featureH - g;
  const row3H = Math.round(belowH * 0.5);
  const row3W = Math.floor((gridW - 2 * g) / 3);
  const row3 = [0, 1, 2].map((i) => ({
    x: gridX + i * (row3W + g),
    y: belowY,
    w: i === 2 ? gridW - 2 * (row3W + g) : row3W,
    h: row3H,
  }));
  const row2Y = belowY + row3H + g;
  const row2H = belowH - row3H - g;
  const row2W = Math.floor((gridW - g) / 2);
  const row2 = [0, 1].map((i) => ({
    x: gridX + i * (row2W + g),
    y: row2Y,
    w: i === 1 ? gridW - row2W - g : row2W,
    h: row2H,
  }));
  return { header, footer, panels: [feature, ...row3, ...row2] };
}

/** Deterministic pseudo-random stream (mulberry32) for the grain. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws `img` into rect (x, y, w, h) crop-fit around the focus point
 * (fx, fy in 0..1 of the photo), zoomed by `zoom`. The photo is never
 * stretched and never blur-filled: the crop window just gets tighter.
 */
export function drawPanelPhoto(ctx, img, x, y, w, h, zoom, fx, fy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const sw = Math.min(iw, w / scale);
  const sh = Math.min(ih, h / scale);
  let sx = fx * iw - sw / 2;
  let sy = fy * ih - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitFont(ctx, text, family, weight, maxWidth, startSize, minSize = 10) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawTag(ctx, x, y, text, scale) {
  const padX = 10 * scale;
  const padY = 5 * scale;
  ctx.font = `700 ${Math.round(15 * scale)}px 'NeonCoastCondensed', 'Noto Sans Display', sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = Math.round(26 * scale);
  ctx.fillStyle = 'rgba(8, 4, 12, 0.78)';
  ctx.fillRect(x, y - bh, bw, bh);
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(x, y - bh, 3 * scale, bh);
  ctx.fillStyle = '#fff3d6';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX + 2 * scale, y - bh / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawBarcode(ctx, x, y, w, h) {
  const rand = seededRandom(7);
  let cx = x;
  ctx.fillStyle = '#f4ead8';
  while (cx < x + w - 2) {
    const bw = 1 + Math.floor(rand() * 3);
    if (rand() > 0.42) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1 + Math.floor(rand() * 2);
  }
}

function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffb62e';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4d00';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#1a0b1e';
  ctx.font = `900 ${Math.round(r * 0.72)}px 'NeonCoastDisplay', 'Noto Sans Display', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NC', 0, r * 0.04);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawGrain(ctx, W, H) {
  const rand = seededRandom(20261120);
  const count = Math.floor((W * H) / 1100);
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.02 + rand() * 0.05})` : `rgba(0,0,0,${0.02 + rand() * 0.06})`;
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,14,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `images` maps a photo key ('boulevard' | 'pier' | upload id) to a loaded
 * HTMLImageElement. Missing photos fall back to a dark panel with its tag.
 */
export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const scale = W / 1920;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const { header, footer, panels } = layoutRects(W, H, state.layout);

  ctx.save();
  ctx.filter = 'none';
  ctx.fillStyle = '#160a1c';
  ctx.fillRect(0, 0, W, H);

  // Header band: five stars, the quote, the volume ticket.
  ctx.fillStyle = '#10060f';
  ctx.fillRect(header.x, header.y, header.w, header.h);
  ctx.fillStyle = '#ffb62e';
  ctx.font = `${Math.round(header.h * 0.42)}px 'NeonCoastText', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const stars = '★★★★★';
  ctx.fillText(stars, W * 0.02, header.h / 2 + 1);
  const quote = `“${(state.quote || '').trim().toUpperCase()}” — ${state.paper}`;
  const qSize = fitFont(ctx, quote, "'NeonCoastCondensed', 'Noto Sans Display', sans-serif", 700, W * 0.62, Math.round(header.h * 0.44));
  ctx.fillStyle = '#f4ead8';
  ctx.textAlign = 'center';
  ctx.fillText(quote, W / 2, header.h / 2 + 1);
  ctx.textAlign = 'right';
  ctx.font = `700 ${Math.round(header.h * 0.4)}px 'NeonCoastCondensed', 'Noto Sans Display', sans-serif`;
  ctx.fillStyle = '#19e0c8';
  ctx.fillText('VOL. 01', W * 0.985, header.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';

  // Panels: photo, grade wash, cream frame, role tag.
  const used = state.layout === 'six' ? panels : state.layout === 'solo' ? [panels[0]] : panels;
  used.forEach((rect, i) => {
    const panel = state.panels[i] || state.panels[0];
    const shot = state.layout === 'strip' ? STRIP_SHOTS[i] : null;
    const photoKey = shot ? shot.photo : panel.photo;
    const img = panel ? images.get(photoKey) : null;
    const zoom = shot ? shot.zoom : panel.zoom;
    const fx = shot ? shot.fx : panel.fx;
    const fy = shot ? shot.fy : panel.fy;
    const tag = shot ? shot.tag : panel.tag;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      ctx.filter = grade.filter;
      drawPanelPhoto(ctx, img, rect.x, rect.y, rect.w, rect.h, zoom, fx, fy);
      ctx.filter = 'none';
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      wash.addColorStop(0, grade.wash[0]);
      wash.addColorStop(1, grade.wash[1]);
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } else {
      ctx.fillStyle = '#241428';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(244, 234, 216, 0.9)';
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    if (tag) drawTag(ctx, rect.x + 8 * scale, rect.y + rect.h - 8 * scale, tag, scale);
  });

  // Footer band: striped sunset disc, title lockup, tagline, seal, barcode.
  ctx.fillStyle = '#10060f';
  ctx.fillRect(footer.x, footer.y, footer.w, footer.h);
  ctx.fillStyle = '#ffb62e';
  ctx.fillRect(footer.x, footer.y, footer.w, Math.max(2, 3 * scale));
  const discR = footer.h * 0.86;
  const discX = W / 2;
  const discY = footer.y + footer.h * 0.98;
  const disc = ctx.createRadialGradient(discX, discY, discR * 0.1, discX, discY, discR);
  disc.addColorStop(0, 'rgba(255, 150, 40, 0.55)');
  disc.addColorStop(0.55, 'rgba(255, 60, 110, 0.28)');
  disc.addColorStop(1, 'rgba(255, 60, 110, 0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(discX, discY, discR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(16, 6, 15, 0.55)';
  for (let s = 0; s < 3; s++) {
    const sy = discY - discR * (0.15 + s * 0.24);
    ctx.fillRect(discX - discR, sy, discR * 2, discR * 0.05);
  }

  const title = (state.title || '').trim().toUpperCase();
  const titleSize = fitFont(
    ctx, title, "'NeonCoastDisplay', 'Noto Sans Display', sans-serif", 900,
    W * 0.66, Math.round(footer.h * 0.52),
  );
  const titleY = footer.y + footer.h * 0.56;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${titleSize}px 'NeonCoastDisplay', 'Noto Sans Display', sans-serif`;
  ctx.fillStyle = '#ff2e88';
  ctx.fillText(title, W / 2 + titleSize * 0.045, titleY + titleSize * 0.05);
  ctx.fillStyle = '#fff3d6';
  ctx.fillText(title, W / 2, titleY);
  ctx.textBaseline = 'alphabetic';

  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.font = `italic ${Math.round(footer.h * 0.17)}px 'NeonCoastSerif', Georgia, serif`;
    ctx.fillStyle = '#ffb62e';
    ctx.textAlign = 'center';
    ctx.fillText(sub, W / 2, footer.y + footer.h * 0.16);
  }
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    const tagSize = fitFont(ctx, tag, "'NeonCoastCondensed', 'Noto Sans Display', sans-serif", 700, W * 0.6, Math.round(footer.h * 0.13));
    ctx.font = `700 ${tagSize}px 'NeonCoastCondensed', 'Noto Sans Display', sans-serif`;
    ctx.fillStyle = '#b9a98f';
    ctx.textAlign = 'center';
    ctx.fillText(tag, W / 2, footer.y + footer.h * 0.88);
  }

  drawSeal(ctx, W * 0.045, footer.y + footer.h * 0.52, footer.h * 0.30);
  drawBarcode(ctx, W * 0.925, footer.y + footer.h * 0.62, W * 0.055, footer.h * 0.22);
  ctx.font = `600 ${Math.round(footer.h * 0.09)}px 'NeonCoastText', sans-serif`;
  ctx.fillStyle = '#b9a98f';
  ctx.textAlign = 'right';
  ctx.fillText('NEON COAST · 2026', W * 0.98, footer.y + footer.h * 0.52);

  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);
  ctx.restore();
}
