// Golden Heist — the cover renderer. Draws a GTA-style multi-panel poster
// (giant striped title across the middle, script subtitle, role-tagged
// panels, quote + tagline bands, seal, barcode, credits) onto any canvas.
// Pure canvas 2D, no network, no dependencies. All layout is relative, so
// the same code draws the 1920x1080, 1080x1080 and 1080x1350 exports.

export const SAMPLES = {
  boulevard: 'samples/boulevard.jpg',
  pier: 'samples/pier.jpg',
};

export const GRADES = {
  sunset: { name: 'Sunset', wash: 'rgba(255,110,60,0.16)', deep: 'rgba(200,40,120,0.20)', glow: 'rgba(255,170,80,0.10)' },
  neon: { name: 'Neon Nights', wash: 'rgba(255,40,140,0.20)', deep: 'rgba(90,20,160,0.22)', glow: 'rgba(0,220,255,0.10)' },
  gold: { name: 'Vice Gold', wash: 'rgba(255,180,40,0.20)', deep: 'rgba(160,90,10,0.20)', glow: 'rgba(255,220,120,0.12)' },
  dusk: { name: 'Teal Dusk', wash: 'rgba(0,90,120,0.22)', deep: 'rgba(20,10,60,0.22)', glow: 'rgba(255,120,80,0.10)' },
};

export const LAYOUTS = {
  poster: { name: 'Poster Six', panels: 6 },
  duo: { name: 'Feature Duo', panels: 4 },
  strip: { name: 'Triple Strip', panels: 3 },
};

export const SIZES = {
  wide: { name: 'Wide 1920 x 1080', w: 1920, h: 1080 },
  square: { name: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { name: 'Story 1080 x 1350', w: 1080, h: 1350 },
};

/** The default cover state: title, bands and six panels. */
export function defaultState() {
  return {
    title: 'GOLDEN HEIST',
    subtitle: 'steal the sunset',
    quote: 'THE GOLDEN HOUR NEVER LOOKED THIS GOOD',
    gazette: 'THE SUNSET LEDGER',
    tagline: 'SIX CREW · ONE SCORE · NO WAY OUT',
    studio: 'GOLDEN HEIST PICTURES',
    layout: 'poster',
    grade: 'sunset',
    size: 'wide',
    panels: [
      { photo: 'boulevard', zoom: 1.0, fx: 0.52, fy: 0.20, role: 'THE DRIVER' },
      { photo: 'pier', zoom: 1.0, fx: 0.42, fy: 0.30, role: 'THE FIXER' },
      { photo: 'boulevard', zoom: 1.2, fx: 0.52, fy: 0.16, role: 'THE LOOKOUT' },
      { photo: 'pier', zoom: 1.3, fx: 0.42, fy: 0.27, role: 'THE BOSS' },
      { photo: 'boulevard', zoom: 1.0, fx: 0.5, fy: 0.06, role: 'THE BOULEVARD' },
      { photo: 'boulevard', zoom: 1.0, fx: 0.55, fy: 0.30, role: 'THE RIDER' },
    ],
  };
}

// Small deterministic PRNG (mulberry32) so the barcode and grain are stable.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cover-fit draw of img into (x,y,w,h), keeping focus (fx,fy) centred. */
function drawPhotoCover(ctx, img, x, y, w, h, zoom, fx, fy) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const dx = clamp(x + w / 2 - fx * dw, x + w - dw, x);
  const dy = clamp(y + h / 2 - fy * dh, y + h - dh, y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Warm grade wash over one panel rect. */
function gradePanel(ctx, x, y, w, h, grade) {
  const g = GRADES[grade] || GRADES.sunset;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = g.wash;
  ctx.fillRect(x, y, w, h);
  const tint = ctx.createLinearGradient(0, y + h * 0.4, 0, y + h);
  tint.addColorStop(0, 'rgba(0,0,0,0)');
  tint.addColorStop(1, g.deep);
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = g.glow;
  ctx.fillRect(x, y, w, h * 0.25);
  ctx.restore();
  // Thin inner frame so panels read as separate shots.
  ctx.strokeStyle = 'rgba(20,8,32,0.85)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(x, y, w, h);
}

/** Role tag chip. Bottom-left by default; top-left when `top` is set
 * (used where the middle title would cover a bottom tag). Size is capped
 * by the panel width so narrow strips keep a readable chip. */
function roleTag(ctx, x, y, w, h, role, top = false) {
  const fs = Math.max(11, Math.min(w * 0.05, h * 0.10));
  ctx.font = `${fs}px Anton, 'Arial Narrow', sans-serif`;
  const tw = ctx.measureText(role).width;
  const pad = fs * 0.7, bh = fs * 1.9, bw = tw + pad * 2 + fs * 0.45;
  const bx = x + w * 0.03;
  const by = top ? y + h * 0.05 : y + h - bh - h * 0.05;
  ctx.fillStyle = 'rgba(12,5,22,0.88)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(bx, by, fs * 0.45, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, bx + pad + fs * 0.45, by + bh / 2 + 1);
}

/** The giant striped title: bands of sunset colour inside a dark outline. */
function stripedTitle(ctx, text, cx, cy, maxW, size) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let s = size;
  ctx.font = `${s}px Anton, 'Arial Narrow', sans-serif`;
  while (ctx.measureText(text).width > maxW && s > 20) {
    s -= 4;
    ctx.font = `${s}px Anton, 'Arial Narrow', sans-serif`;
  }
  const tw = ctx.measureText(text).width;
  const th = s * 1.25;
  const off = document.createElement('canvas');
  off.width = Math.ceil(tw + s * 0.3);
  off.height = Math.ceil(th);
  const o = off.getContext('2d');
  o.font = `${s}px Anton, 'Arial Narrow', sans-serif`;
  o.textAlign = 'center';
  o.textBaseline = 'middle';
  o.fillStyle = '#ffffff';
  o.fillText(text, off.width / 2, off.height / 2);
  // Hard sunset bands clipped to the letters.
  const band = o.createLinearGradient(0, 0, 0, off.height);
  const stops = [
    [0.00, '#ffd94d'], [0.17, '#ffd94d'], [0.17, '#ff9a3d'], [0.36, '#ff9a3d'],
    [0.36, '#ff5e3a'], [0.54, '#ff5e3a'], [0.54, '#ff2e88'], [0.71, '#ff2e88'],
    [0.71, '#c724b1'], [0.87, '#c724b1'], [0.87, '#7b2ff7'], [1.00, '#7b2ff7'],
  ];
  for (const [p, c] of stops) band.addColorStop(p, c);
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = band;
  o.fillRect(0, 0, off.width, off.height);
  // Dark outline behind, striped letters on top, hard drop shadow.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = s * 0.10;
  ctx.strokeText(text, cx, cy);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = s * 0.10;
  ctx.shadowOffsetY = s * 0.035;
  ctx.drawImage(off, cx - off.width / 2, cy - off.height / 2);
  ctx.restore();
  return s;
}

/** Pink script subtitle, slightly tilted, tucked under the title. */
function scriptSubtitle(ctx, text, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.035);
  ctx.font = `${size}px Pacifico, cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,255,255,0.65)';
  ctx.shadowBlur = size * 0.35;
  ctx.lineWidth = size * 0.10;
  ctx.strokeStyle = '#160a24';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ff5da2';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Gold starburst seal with two lines of tiny text. */
function goldSeal(ctx, cx, cy, r, line1, line2) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const ang = (i / 32) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.84;
    const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffe98a');
  g.addColorStop(0.7, '#f5c542');
  g.addColorStop(1, '#c98f1b');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#8a6d1f';
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(138,109,31,0.8)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.stroke();
  ctx.fillStyle = '#3d2c05';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 0.20}px Anton, sans-serif`;
  ctx.fillText(line1, 0, -r * 0.16);
  ctx.fillText(line2, 0, r * 0.16);
  ctx.font = `${r * 0.24}px sans-serif`;
  ctx.fillText('★★★', 0, r * 0.44);
  ctx.restore();
}

/** Deterministic barcode: white plate, black bars, tiny number. */
function barcode(ctx, x, y, w, h) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  const rand = rng(20261120);
  let bx = x + w * 0.06;
  ctx.fillStyle = '#111111';
  while (bx < x + w * 0.94) {
    const bw = 2 + rand() * 4;
    const bh = h * 0.72;
    ctx.fillRect(bx, y + h * 0.08, bw, bh);
    bx += bw + 1 + rand() * 3;
  }
  ctx.fillStyle = '#111111';
  ctx.font = `${Math.max(9, h * 0.16)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('0 19672 06591 8', x + w / 2, y + h * 0.95);
}

/** Panel rects for a layout, as fractions of the grid area. */
export function layoutPanels(layout, gx, gy, gw, gh, gut) {
  const R = (fx, fy, fw, fh) => ({
    x: gx + fx * gw, y: gy + fy * gh, w: fw * gw - gut, h: fh * gh - gut,
  });
  if (layout === 'duo') {
    return [
      R(0.00, 0.00, 0.58, 1.00), // hero left, full height
      R(0.58, 0.00, 0.42, 0.33),
      R(0.58, 0.33, 0.42, 0.33),
      R(0.58, 0.66, 0.42, 0.34),
    ];
  }
  if (layout === 'strip') {
    return [
      R(0.34, 0.00, 0.32, 1.00), // hero centre
      R(0.00, 0.00, 0.34, 1.00),
      R(0.66, 0.00, 0.34, 1.00),
    ];
  }
  // poster: tall hero centre column, two stacked panels each side,
  // and a wide car-panorama strip along the bottom.
  return [
    R(0.34, 0.00, 0.32, 0.84), // hero
    R(0.00, 0.00, 0.34, 0.42),
    R(0.66, 0.00, 0.34, 0.42),
    R(0.00, 0.42, 0.34, 0.42),
    R(0.66, 0.42, 0.34, 0.42),
    R(0.00, 0.84, 1.00, 0.16), // getaway strip
  ];
}

/** Panel order per layout: which state panel fills each rect. */
export function layoutSlots(layout) {
  if (layout === 'duo') return [0, 1, 2, 4];
  if (layout === 'strip') return [0, 1, 2];
  return [0, 1, 2, 3, 5, 4];
}

/** Draws the whole cover onto canvas using state + loaded photos. */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const u = W / 1920; // unit scale, wide = 1
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);

  const quoteH = H * 0.062;
  const creditH = H * 0.052;
  const gut = Math.max(4, 8 * u);
  const gx = W * 0.018, gy = quoteH + H * 0.008;
  const gw = W * 0.964, gh = H - quoteH - creditH - H * 0.016;

  // Panels.
  const rects = layoutPanels(state.layout, gx, gy, gw, gh, gut);
  const slots = layoutSlots(state.layout);
  rects.forEach((r, i) => {
    const p = state.panels[slots[i]];
    const img = photos[p.photo];
    if (img) drawPhotoCover(ctx, img, r.x, r.y, r.w, r.h, p.zoom, p.fx, p.fy);
    else { ctx.fillStyle = '#3a2350'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    gradePanel(ctx, r.x, r.y, r.w, r.h, state.grade);
    roleTag(ctx, r.x, r.y, r.w, r.h, p.role, state.layout === 'poster');
  });

  // Title block across the middle seam.
  const seamY = state.layout === 'poster' ? gy + gh * 0.44 : H * 0.58;
  const titleSize = W * 0.115;
  const ts = stripedTitle(ctx, state.title, W / 2, seamY, W * 0.86, titleSize);
  scriptSubtitle(ctx, state.subtitle, W / 2 + W * 0.06, seamY + ts * 0.72, ts * 0.30);

  // Tagline ribbon under the script.
  ctx.font = `${Math.max(12, W * 0.016)}px Anton, sans-serif`;
  const tw = ctx.measureText(state.tagline).width;
  const rw = tw + W * 0.05, rh = Math.max(20, H * 0.038);
  const rx = W / 2 - rw / 2, ry = seamY + ts * 0.95;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.tagline, W / 2, ry + rh / 2 + 1);

  // Quote band (top).
  ctx.fillStyle = '#1d0d33';
  ctx.fillRect(0, 0, W, quoteH);
  ctx.fillStyle = '#f5c542';
  ctx.font = `${Math.max(12, quoteH * 0.42)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('★★★★★', W * 0.02, quoteH * 0.52);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = `${Math.max(11, quoteH * 0.34)}px Anton, sans-serif`;
  ctx.fillText(`"${state.quote}"  —  ${state.gazette}`, W * 0.02 + quoteH * 2.6, quoteH * 0.52);
  const vol = 'VOL. 01';
  ctx.font = `${Math.max(11, quoteH * 0.34)}px Anton, sans-serif`;
  const vw = ctx.measureText(vol).width + quoteH * 0.7;
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(W - vw - W * 0.015, quoteH * 0.18, vw, quoteH * 0.64);
  ctx.fillStyle = '#160a24';
  ctx.textAlign = 'center';
  ctx.fillText(vol, W - vw / 2 - W * 0.015, quoteH * 0.52);

  // Gold seal, bottom-right overlapping the grid.
  goldSeal(ctx, W * 0.925, H - creditH - H * 0.045, Math.max(26, W * 0.038), 'ORIGINAL', 'COVER ART');

  // Credits strip (bottom).
  ctx.fillStyle = '#1d0d33';
  ctx.fillRect(0, H - creditH, W, creditH);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = `${Math.max(9, W * 0.0072)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `A ${state.studio} PICTURE  ·  STARRING YOU AND YOUR CREW  ·  SHOT ON YOUR OWN CAMERA`,
    W / 2, H - creditH * 0.68);
  ctx.fillStyle = '#c9a86a';
  ctx.fillText(
    'GRADED AT SUNSET  ·  LETTERED BY HAND  ·  NO PHOTO EVER LEAVES YOUR DEVICE',
    W / 2, H - creditH * 0.26);
  ctx.fillStyle = '#ff5da2';
  ctx.font = `${Math.max(11, W * 0.011)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('— COMING SOON', W * 0.018, H - creditH * 0.5);
  barcode(ctx, W * 0.90, H - creditH * 0.82, W * 0.075, creditH * 0.68);

  // Vignette + grain for the print feel.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  vg.addColorStop(0, 'rgba(10,4,20,0)');
  vg.addColorStop(1, 'rgba(10,4,20,0.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  const rand = rng(20261121);
  ctx.fillStyle = 'rgba(255,255,255,0.028)';
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(rand() * W, rand() * H, 1.6 * u + 0.6, 1.6 * u + 0.6);
  }
}
