// Vice City Cover Studio — cover renderer (v7).
// Draws the multi-panel GTA-style cover onto any canvas: a hero duo split from the
// two sample photos + 4 supporting panels, a giant striped hand-lettered title,
// quote/tagline bands, gold seal, barcode and credits. Grades: Sunset, Neon Nights,
// Vice Gold, Teal Dusk and Comic Ink (posterize + halftone + ink outlines).
// Layouts: Hero Duo, Comic Spread (tilted ink panels + speech bubble), Triple Strip.

export const GRADES = ['Sunset', 'Neon Nights', 'Vice Gold', 'Teal Dusk', 'Comic Ink'];
export const LAYOUTS = ['Hero Duo', 'Comic Spread', 'Triple Strip'];
export const SIZES = {
  'Wide 1920 x 1080': [1920, 1080],
  'Square 1080 x 1080': [1080, 1080],
  'Portrait 1080 x 1350': [1080, 1350],
};

const GRADE_FILTER = {
  'Sunset': 'saturate(1.35) contrast(1.12) sepia(0.18)',
  'Neon Nights': 'saturate(1.65) contrast(1.22) hue-rotate(16deg) brightness(0.96)',
  'Vice Gold': 'saturate(1.25) contrast(1.08) sepia(0.38) brightness(1.05)',
  'Teal Dusk': 'saturate(1.3) contrast(1.15) hue-rotate(155deg) brightness(0.94)',
  'Comic Ink': 'saturate(1.55) contrast(1.4) brightness(1.03)',
};

export function defaultState() {
  return {
    title: 'VICE CITY',
    script: 'Jason & Lucia',
    quote: 'EVERY SUNSET ENDS IN A GETAWAY',
    quoteSource: 'THE VICE GAZETTE',
    tagline: 'TWO OUTLAWS · ONE COAST · NO WAY BACK',
    layout: 'Hero Duo',
    grade: 'Sunset',
    size: 'Wide 1920 x 1080',
    panels: [
      { photo: 'duo', zoom: 1.0, fx: 0.5, fy: 0.35, role: 'THE DRIVER' },
      { photo: 'boulevard', zoom: 1.25, fx: 0.5, fy: 0.1, role: 'THE LOOKOUT' },
      { photo: 'pier', zoom: 1.5, fx: 0.5, fy: 0.1, role: 'THE FIXER' },
      { photo: 'pier', zoom: 1.4, fx: 0.55, fy: 0.12, role: 'THE CAPTAIN' },
      { photo: 'boulevard', zoom: 1.35, fx: 0.5, fy: 0.1, role: 'THE GETAWAY' },
    ],
  };
}

/** Cover-fits `img` into (x, y, w, h) with zoom and a focus point (fx, fy in 0..1). */
function drawPhotoCover(ctx, img, x, y, w, h, zoom, fx, fy) {
  if (!img) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih) * zoom;
  const pw = iw * base;
  const ph = ih * base;
  const dx = x + (w - pw) * fx;
  const dy = y + (h - ph) * fy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Posterizes `img` into an offscreen canvas at (w, h), cover-fit with zoom/focus. */
function posterizePhoto(img, w, h, zoom, fx, fy, filter) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(w));
  off.height = Math.max(2, Math.round(h));
  const octx = off.getContext('2d');
  octx.filter = filter;
  drawPhotoCover(octx, img, 0, 0, off.width, off.height, zoom, fx, fy);
  octx.filter = 'none';
  const id = octx.getImageData(0, 0, off.width, off.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / 64) * 64;
    d[i + 1] = Math.round(d[i + 1] / 64) * 64;
    d[i + 2] = Math.round(d[i + 2] / 64) * 64;
  }
  octx.putImageData(id, 0, 0);
  return off;
}

let halftoneCache = null;
function halftonePattern() {
  if (halftoneCache) return halftoneCache;
  const p = document.createElement('canvas');
  p.width = 10;
  p.height = 10;
  const c = p.getContext('2d');
  c.fillStyle = '#14091f';
  c.beginPath();
  c.arc(5, 5, 2.3, 0, Math.PI * 2);
  c.fill();
  halftoneCache = p;
  return p;
}

/** Draws one panel (photo + ink border + role tag), optionally tilted.
 * `tagPos` is 'top' or 'bottom' for the role chip. */
function drawPanel(ctx, img, rect, zoom, fx, fy, role, tilt, border, grade, filter, tagPos = 'top') {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(tilt);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  if (grade === 'Comic Ink' && img) {
    const off = posterizePhoto(img, rect.w, rect.h, zoom, fx, fy, filter);
    ctx.drawImage(off, 0, 0, rect.w, rect.h);
  } else {
    ctx.filter = filter;
    drawPhotoCover(ctx, img, 0, 0, rect.w, rect.h, zoom, fx, fy);
    ctx.filter = 'none';
  }
  if (grade === 'Comic Ink') {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = ctx.createPattern(halftonePattern(), 'repeat');
    ctx.fillRect(0, 0, rect.w, rect.h);
    ctx.restore();
  }
  ctx.lineWidth = border;
  ctx.strokeStyle = '#14091f';
  ctx.strokeRect(border / 2, border / 2, rect.w - border, rect.h - border);
  if (role) {
    const tagY = tagPos === 'bottom' ? rect.h - 44 : 10;
    drawRoleTag(ctx, role, 10, tagY, rect.w);
  }
  ctx.restore();
}

/** A black role chip with a gold leading bar, drawn at (x, y) in local coords. */
function drawRoleTag(ctx, role, x, y, maxW) {
  const h = 34;
  ctx.font = `26px Anton, 'Arial Narrow', sans-serif`;
  const tw = Math.min(ctx.measureText(role).width, maxW - 40);
  const w = tw + 34;
  ctx.fillStyle = '#14091f';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffcf3d';
  ctx.fillRect(x, y, 6, h);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, x + 16, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

/** The hero duo: the two sample photos split down the middle, back to back. */
function drawHeroDuo(ctx, photos, rect, zoom, fx, fy, tilt, border, grade, filter) {
  const half = { x: rect.x, y: rect.y, w: rect.w / 2, h: rect.h };
  const right = { x: rect.x + rect.w / 2, y: rect.y, w: rect.w / 2, h: rect.h };
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(tilt);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  const drawHalf = (img, r, focusX) => {
    if (grade === 'Comic Ink' && img) {
      const off = posterizePhoto(img, r.w, r.h, zoom, focusX, fy, filter);
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x - rect.x, r.y - rect.y, r.w, r.h);
      ctx.clip();
      ctx.drawImage(off, r.x - rect.x, r.y - rect.y, r.w, r.h);
      ctx.restore();
    } else {
      ctx.filter = filter;
      drawPhotoCover(ctx, img, r.x - rect.x, r.y - rect.y, r.w, r.h, zoom, focusX, fy);
      ctx.filter = 'none';
    }
  };
  drawHalf(photos.boulevard, half, 0.45);
  drawHalf(photos.pier, right, 0.55);
  if (grade === 'Comic Ink') {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = ctx.createPattern(halftonePattern(), 'repeat');
    ctx.fillRect(0, 0, rect.w, rect.h);
    ctx.restore();
  }
  ctx.fillStyle = '#14091f';
  ctx.fillRect(rect.w / 2 - 2, 0, 4, rect.h);
  ctx.lineWidth = border;
  ctx.strokeStyle = '#14091f';
  ctx.strokeRect(border / 2, border / 2, rect.w - border, rect.h - border);
  ctx.restore();
}

/** Giant striped hand-lettered title, slightly tilted, with a hard offset shadow. */
function drawTitle(ctx, text, cx, cy, maxW, baseSize) {
  let size = baseSize;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 24) {
    size -= 4;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  // Gradient in LOCAL coordinates (after translate/rotate): the text spans
  // y -size/2..+size/2, so the bands must span that range, not the page's.
  const g = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.5);
  g.addColorStop(0, '#ffe14d');
  g.addColorStop(0.26, '#ffb03a');
  g.addColorStop(0.3, '#ff7a3d');
  g.addColorStop(0.52, '#ff4d6d');
  g.addColorStop(0.56, '#ff2e88');
  g.addColorStop(0.78, '#c44dff');
  g.addColorStop(0.82, '#8a3ffc');
  g.addColorStop(1, '#5b2ee5');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.022);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#14091f';
  ctx.fillText(text, size * 0.05, size * 0.06);
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = '#14091f';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = g;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return size;
}

/** Pink neon script subtitle under the title. */
function drawScript(ctx, text, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.02);
  ctx.font = `${size}px Pacifico, cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.16;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14091f';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ff5da2';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Gold starburst seal with tiny text, bottom-right of the cover. */
function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffcf3d';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#14091f';
  ctx.stroke();
  ctx.fillStyle = '#14091f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${r * 0.22}px Anton, sans-serif`;
  ctx.fillText('ORIGINAL', 0, -r * 0.18);
  ctx.fillText('COVER ART', 0, r * 0.08);
  ctx.font = `${r * 0.2}px sans-serif`;
  ctx.fillText('★★★', 0, r * 0.36);
  ctx.restore();
}

/** Deterministic barcode from the title's letters. */
function drawBarcode(ctx, x, y, w, h, seedText) {
  let seed = 7;
  for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#14091f';
  let bx = x;
  while (bx < x + w) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const bw = 2 + (seed % 3);
    if (seed % 3 !== 0) ctx.fillRect(bx, y, bw, h);
    bx += bw + 2;
  }
  ctx.font = `11px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('0 19672 06592 8', x + w / 2, y + h + 12);
}

/** Speech bubble with a tail, for the Comic Spread layout. */
function drawSpeechBubble(ctx, text, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  const r = 18;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + 70, y + h);
  ctx.lineTo(x + 34, y + h + 26);
  ctx.lineTo(x + 52, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#14091f';
  ctx.stroke();
  ctx.fillStyle = '#14091f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = h * 0.34;
  ctx.font = `bold ${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > w - 36 && size > 12) {
    size -= 2;
    ctx.font = `bold ${size}px Anton, sans-serif`;
  }
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (its width/height set the export size).
 * `photos` maps 'boulevard' | 'pier' to loaded Image elements.
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const comic = state.grade === 'Comic Ink';
  const border = comic ? 12 : 6;
  const filter = GRADE_FILTER[state.grade] || GRADE_FILTER.Sunset;
  const P = state.panels;
  const img = (name) => (name === 'duo' ? null : photos[name] || null);

  ctx.fillStyle = '#150a24';
  ctx.fillRect(0, 0, W, H);

  // Quote band (top). Skipped in Comic Spread: the speech bubble up top
  // carries the quote there instead, and the band's text would fight it.
  const bandH = H * 0.055;
  if (state.layout !== 'Comic Spread') {
    ctx.fillStyle = '#1d0f33';
    ctx.fillRect(0, H * 0.012, W, bandH);
    ctx.fillStyle = '#ffcf3d';
    ctx.font = `bold ${bandH * 0.42}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('★★★★★', W * 0.02, H * 0.012 + bandH / 2 + 1);
    // Quote shrinks to fit between the stars and the VOL badge, never touching either.
    const quoteText = `"${state.quote}"`;
    let qSize = bandH * 0.42;
    ctx.font = `${qSize}px Anton, sans-serif`;
    while (ctx.measureText(quoteText).width > W * 0.72 && qSize > 10) {
      qSize -= 1;
      ctx.font = `${qSize}px Anton, sans-serif`;
    }
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText(quoteText, W * 0.125, H * 0.012 + bandH / 2 + 1);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffcf3d';
  ctx.font = `bold ${bandH * 0.34}px Anton, sans-serif`;
  ctx.fillText('VOL. VI', W * 0.985, H * 0.012 + bandH / 2 + 1);

  const gridTop = H * 0.082;
  const gridBottom = H * 0.86;
  const m = W * 0.014;
  const gap = W * 0.01;

  if (state.layout === 'Comic Spread') {
    // Hero strip across the top, tilted; 4 panels in a row below, alternating tilts.
    const hero = { x: m, y: gridTop, w: W - 2 * m, h: (gridBottom - gridTop) * 0.52 };
    drawHeroDuo(ctx, photos, hero, P[0].zoom, P[0].fx, P[0].fy, -0.012, border, state.grade, filter);
    const rowY = gridTop + (gridBottom - gridTop) * 0.58;
    const rowH = gridBottom - rowY;
    const pw = (W - 2 * m - 3 * gap) / 4;
    const tilts = [0.02, -0.018, 0.015, -0.012];
    for (let i = 0; i < 4; i++) {
      const r = { x: m + i * (pw + gap), y: rowY, w: pw, h: rowH };
      // Tags at the bottom here: the title and script cross the panels' tops.
      drawPanel(ctx, img(P[i + 1].photo), r, P[i + 1].zoom, P[i + 1].fx, P[i + 1].fy, P[i + 1].role, tilts[i], border, state.grade, filter, 'bottom');
    }
    // The speech bubble is drawn AFTER the title (see below), on top of it.
  } else if (state.layout === 'Triple Strip') {
    // Three tall strips: supporting panel, hero duo, supporting panel; strip below.
    const sw = (W - 2 * m - 2 * gap) / 3;
    const stripTop = gridTop;
    const stripBottom = H * 0.8;
    const left = { x: m, y: stripTop, w: sw, h: stripBottom - stripTop };
    const mid = { x: m + sw + gap, y: stripTop, w: sw, h: stripBottom - stripTop };
    const right = { x: m + 2 * (sw + gap), y: stripTop, w: sw, h: stripBottom - stripTop };
    drawPanel(ctx, img(P[1].photo), left, P[1].zoom, P[1].fx, P[1].fy, P[1].role, 0, border, state.grade, filter);
    // Single-photo hero here: the strip is too narrow for the split duo (each
    // face would be cut in half by the seam). Tighter crop than the LOOKOUT so
    // the two boulevard panels do not read as the same shot.
    drawPanel(ctx, photos.boulevard, mid, 1.6, 0.35, 0.25, P[0].role, 0, border, state.grade, filter);
    drawPanel(ctx, img(P[2].photo), right, P[2].zoom, P[2].fx, P[2].fy, P[2].role, 0, border, state.grade, filter);
    const strip = { x: m, y: H * 0.815, w: W - 2 * m, h: gridBottom - H * 0.815 };
    drawPanel(ctx, img(P[4].photo), strip, 1.0, 0.5, 0.02, 'THE BOULEVARD', 0, border, state.grade, filter);
  } else {
    // Hero Duo (default): tall hero centre, two panels each side, panorama strip.
    const heroW = W * 0.31;
    const colW = (W - 2 * m - heroW - 2 * gap) / 2;
    const hero = { x: m + colW + gap, y: gridTop, w: heroW, h: gridBottom - gridTop - H * 0.075 };
    const leftTop = { x: m, y: gridTop, w: colW, h: (hero.h - gap) / 2 };
    const leftBottom = { x: m, y: gridTop + (hero.h + gap) / 2, w: colW, h: (hero.h - gap) / 2 };
    const rightTop = { x: m + colW + gap + heroW + gap, y: gridTop, w: colW, h: (hero.h - gap) / 2 };
    const rightBottom = { x: m + colW + gap + heroW + gap, y: gridTop + (hero.h + gap) / 2, w: colW, h: (hero.h - gap) / 2 };
    drawPanel(ctx, img(P[1].photo), leftTop, P[1].zoom, P[1].fx, P[1].fy, P[1].role, 0, border, state.grade, filter);
    drawPanel(ctx, img(P[2].photo), leftBottom, P[2].zoom, P[2].fx, P[2].fy, P[2].role, 0, border, state.grade, filter);
    drawPanel(ctx, img(P[3].photo), rightTop, P[3].zoom, P[3].fx, P[3].fy, P[3].role, 0, border, state.grade, filter);
    drawPanel(ctx, img(P[4].photo), rightBottom, P[4].zoom, P[4].fx, P[4].fy, P[4].role, 0, border, state.grade, filter);
    drawHeroDuo(ctx, photos, hero, P[0].zoom, P[0].fx, P[0].fy, 0, border, state.grade, filter);
    drawRoleTag(ctx, P[0].role, hero.x + 10, hero.y + hero.h - 46, hero.w);
    const strip = { x: m, y: gridBottom - H * 0.06, w: W - 2 * m, h: H * 0.06 };
    // Palm-skyline crop, not a torso: the strip is thin, so show sky and palms.
    drawPanel(ctx, img(P[4].photo), strip, 1.0, 0.5, 0.02, 'THE BOULEVARD', 0, border, state.grade, filter);
  }

  // Giant striped title across the middle, overlapping the panels. Comic Spread
  // runs a slightly smaller, higher title so the script clears the bottom row.
  const comicSpread = state.layout === 'Comic Spread';
  const titleCy = comicSpread ? H * 0.44 : H * 0.46;
  const titleBase = comicSpread ? H * 0.17 : H * 0.19;
  const titleSize = drawTitle(ctx, state.title, W / 2, titleCy, W * 0.88, titleBase);
  // Neon script subtitle, tight under the title.
  drawScript(ctx, state.script, W / 2, titleCy + titleSize * 0.62, H * 0.052);
  // Tagline band under the script — skipped in Comic Spread, where it would
  // cross the bottom row's faces (the bubble carries the words there).
  if (!comicSpread) {
    const tagH = H * 0.045;
    const tagY = titleCy + titleSize * 0.62 + H * 0.045;
    ctx.fillStyle = '#ff2e88';
    ctx.font = `${tagH * 0.52}px Anton, sans-serif`;
    const tagW = ctx.measureText(state.tagline).width + tagH * 1.6;
    ctx.fillRect((W - tagW) / 2, tagY, tagW, tagH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.tagline, W / 2, tagY + tagH / 2 + 1);
  }

  // Gold seal, bottom-right over the panorama strip.
  drawSeal(ctx, W - m - W * 0.045, gridBottom - H * 0.028, H * 0.045);

  // Footer: credits + COMING SOON + barcode. Credits shrink to fit the middle
  // so they never run under the barcode or over COMING SOON.
  const footY = H * 0.935;
  ctx.fillStyle = '#ff5da2';
  ctx.font = `bold ${H * 0.02}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('— COMING SOON', m, footY);
  const line1 = 'A VICE CITY COVER STUDIO PICTURE  ·  STARRING YOU AND YOUR CREW  ·  SHOT ON YOUR OWN CAMERA';
  const line2 = 'GRADED AT SUNSET  ·  LETTERED BY HAND  ·  NO PHOTO EVER LEAVES YOUR DEVICE';
  let cSize = H * 0.016;
  ctx.font = `${cSize}px sans-serif`;
  while (Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) > W * 0.58 && cSize > 8) {
    cSize -= 0.5;
    ctx.font = `${cSize}px sans-serif`;
  }
  ctx.fillStyle = '#cbb8e8';
  ctx.textAlign = 'center';
  ctx.fillText(line1, W / 2, footY - H * 0.012);
  ctx.fillText(line2, W / 2, footY + H * 0.012);
  drawBarcode(ctx, W - m - W * 0.085, footY - H * 0.02, W * 0.075, H * 0.028, state.title);

  // Comic Spread's speech bubble, drawn last so it sits on top.
  // It lives in the top band, above the hero: on the hero itself it covered
  // the woman's eyes. The quote band is skipped in this layout (see above),
  // so the bubble IS the quote here.
  if (state.layout === 'Comic Spread') {
    drawSpeechBubble(ctx, state.quote, W * 0.2, H * 0.008, W * 0.6, H * 0.06);
  }
}
