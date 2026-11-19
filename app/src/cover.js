// Vice Coast Cover Studio — the cover renderer.
//
// Everything that makes a cover look like a poster lives here: the multi-panel
// layouts, the sunset/neon colour grades, the bold condensed caption lettering
// and the grain + vignette finish. Pure canvas 2D, no network, no fonts
// beyond the system stack. Every draw is deterministic: the grain comes from
// a seeded generator, never from Math.random, so the same state always paints
// the same pixels.
//
// v2: panels can show a faceless "scenic detail" window of a sample photo
// (palms and sunset, or open sea) instead of the whole frame, so no cover
// ever repeats the same face; the caption block is anchored inside the hero
// panel so the title never straddles a panel gutter; and the grade wash is
// stronger so every panel in one cover reads as the same warm sunset.
//
// v3: the palms window is the default scenic pick — it is warm sunset
// content, so it keeps a cover tonally one poster where the open-sea
// window read as empty cool sky. SCENIC_LABELS names each window for the
// editor's crop picker.

export const GRADE_PRESETS = {
  'vice-sunset': {
    label: 'Vice Sunset',
    tintTop: 'rgba(255, 166, 66, 0.42)',
    tintBottom: 'rgba(214, 51, 132, 0.48)',
    glowX: 0.16,
    glowY: 0.1,
    glow: 'rgba(255, 170, 60, 0.30)',
    subtitle: '#ffd166',
    scrim: 'rgba(26, 4, 32, 0.82)',
  },
  'neon-nights': {
    label: 'Neon Nights',
    tintTop: 'rgba(255, 46, 136, 0.42)',
    tintBottom: 'rgba(0, 210, 255, 0.42)',
    glowX: 0.84,
    glowY: 0.12,
    glow: 'rgba(255, 46, 200, 0.28)',
    subtitle: '#7df9ff',
    scrim: 'rgba(8, 2, 28, 0.82)',
  },
  'palm-dusk': {
    label: 'Palm Dusk',
    tintTop: 'rgba(150, 92, 255, 0.42)',
    tintBottom: 'rgba(20, 30, 90, 0.50)',
    glowX: 0.5,
    glowY: 0.08,
    glow: 'rgba(190, 130, 255, 0.26)',
    subtitle: '#c9a7ff',
    scrim: 'rgba(12, 4, 34, 0.82)',
  },
};

export const LAYOUT_PRESETS = {
  'hero-split': { label: 'Hero + Side Stack' },
  'triple-strip': { label: 'Triple Strip' },
  'full-bleed': { label: 'Full Bleed + Snapshot' },
};

/**
 * Faceless detail windows into the built-in samples, as fractions of each
 * photo. Slot 0 (boulevard): the palms, sunset and lifeguard tower at the
 * top-left corner, no face in frame. Slot 1 (pier): open sea, sky and the
 * fishing rod on the right, no face in frame. User uploads have no scenic
 * window and always show the full frame.
 */
export const SCENIC_CROPS = {
  // Palms, sunset and lifeguard tower. The window must be tall enough
  // that the sun and tower survive the cover-fit's middle-band slice in
  // a landscape panel (v2's shorter window showed only empty sky and one
  // trunk), and narrow enough to stay clear of the woman's hair and arm.
  // v3: widened and deepened 0.26x0.22 -> 0.30x0.30 after crop simulation.
  0: { sx: 0, sy: 0.10, sw: 0.30, sh: 0.30 },
  1: { sx: 0.68, sy: 0.02, sw: 0.32, sh: 0.60 },
};

/** Human names for the scenic windows, shown in the editor's crop picker. */
export const SCENIC_LABELS = {
  0: 'Palms & sunset',
  1: 'Open sea & rod',
};

/** The source window a panel draws: the whole frame, or its scenic detail. */
export function panelSourceWindow(photoIndex, crop) {
  if (crop === 'scenic' && SCENIC_CROPS[photoIndex]) return SCENIC_CROPS[photoIndex];
  return { sx: 0, sy: 0, sw: 1, sh: 1 };
}

/** A tiny seeded generator, so grain and speckle are identical on every run. */
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Panel rectangles for a layout, in fractions of the cover size. Landscape
 * covers stack the side panels down the right; square and portrait covers put
 * the hero on top and the side panels side by side underneath.
 */
export function layoutPanels(layout, w, h) {
  const wide = w >= h;
  if (layout === 'triple-strip') {
    if (wide) {
      return [
        { x: 0, y: 0, w: 0.34, h: 1 },
        { x: 0.34, y: 0, w: 0.33, h: 1 },
        { x: 0.67, y: 0, w: 0.33, h: 1 },
      ];
    }
    return [
      { x: 0, y: 0, w: 1, h: 0.36 },
      { x: 0, y: 0.36, w: 1, h: 0.32 },
      { x: 0, y: 0.68, w: 1, h: 0.32 },
    ];
  }
  if (layout === 'full-bleed') {
    if (wide) {
      return [
        { x: 0, y: 0, w: 1, h: 1 },
        { x: 0.66, y: 0.52, w: 0.3, h: 0.42 },
      ];
    }
    return [
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 0.58, y: 0.6, w: 0.38, h: 0.28 },
    ];
  }
  // hero-split
  if (wide) {
    return [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ];
  }
  return [
    { x: 0, y: 0, w: 1, h: 0.58 },
    { x: 0, y: 0.58, w: 0.5, h: 0.42 },
    { x: 0.5, y: 0.58, w: 0.5, h: 0.42 },
  ];
}

/**
 * Where the caption block lives, in pixels. For hero-split and full-bleed
 * the title sits inside the largest panel (the hero), so it never straddles
 * a panel gutter; triple-strip is a full-width strip poster, so the title
 * keeps the whole cover.
 */
export function titleAnchor(layout, rects, w, h) {
  if (layout === 'triple-strip') return { x: 0, y: 0, w, h };
  let best = rects[0];
  for (const r of rects) {
    if (r.w * r.h > best.w * best.h) best = r;
  }
  return { x: best.x * w, y: best.y * h, w: best.w * w, h: best.h * h };
}

/** Cover-fits `photo` (or its scenic window) into a panel rect, honouring zoom and pan offsets. */
export function drawPanelPhoto(ctx, photo, rect, panel) {
  const src = panelSourceWindow(panel.photo, panel.crop);
  const iw = photo.naturalWidth * src.sw;
  const ih = photo.naturalHeight * src.sh;
  const sx = photo.naturalWidth * src.sx;
  const sy = photo.naturalHeight * src.sy;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
  let dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
  // Clamp the pan so the photo always covers its panel — no empty gaps.
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.drawImage(photo, sx, sy, iw, ih, dx, dy, dw, dh);
}

/** Warms/cools a panel with the grade's sunset-to-neon wash. */
export function gradePanel(ctx, rect, grade) {
  ctx.save();
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.tintTop);
  wash.addColorStop(1, grade.tintBottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // The overlay pass is the one that unifies the panels: a bright midday
  // panel and a sunset panel must come out reading as one warm poster.
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // A light warm hue shift, so a midday-blue panel stops reading as a
  // different time of day from the sunset panels beside it.
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = grade.tintTop;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** A warm glow, a dark vignette and seeded film grain over the whole cover. */
export function finishCover(ctx, w, h, grade) {
  const glow = ctx.createRadialGradient(
    w * grade.glowX, h * grade.glowY, 0,
    w * grade.glowX, h * grade.glowY, Math.max(w, h) * 0.75,
  );
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(5, 0, 12, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const rand = seededRandom(20261120);
  const dots = Math.round((w * h) / 900);
  for (let i = 0; i < dots; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
}

/**
 * The caption block: a dark scrim rising from the foot of the anchor panel,
 * the title in huge condensed white capitals with a thick dark outline and
 * neon shadow, the subtitle in italic letter-spaced capitals above it. The
 * text is centred on the anchor panel and sized to fit inside it, so it
 * never crosses into a neighbouring panel.
 */
export function drawTitleBlock(ctx, w, h, title, subtitle, grade, titleSize, titleColor, outline, anchor) {
  const a = anchor || { x: 0, y: 0, w, h };
  const bandH = a.h * 0.3;
  const scrim = ctx.createLinearGradient(0, a.y + a.h - bandH, 0, a.y + a.h);
  scrim.addColorStop(0, 'rgba(10, 0, 18, 0)');
  scrim.addColorStop(1, grade.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(a.x, a.y + a.h - bandH, a.w, bandH);

  const text = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  const cx = a.x + a.w / 2;
  const baseline = a.y + a.h - h * 0.055;

  if (sub) {
    let subSize = Math.max(14, h * 0.028 * titleSize);
    ctx.font = `italic 800 ${subSize}px 'Liberation Sans', 'DejaVu Sans', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.42)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(sub).width > a.w * 0.86 && subSize > 10) {
      subSize -= 1;
      ctx.font = `italic 800 ${subSize}px 'Liberation Sans', 'DejaVu Sans', sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = grade.subtitle;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.4;
    ctx.fillText(sub, cx, baseline - h * 0.115 * titleSize - subSize * 0.4);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  if (!text) return;
  let size = h * 0.12 * titleSize;
  const squash = 0.84;
  ctx.font = `900 ${size}px 'Liberation Sans', 'DejaVu Sans', sans-serif`;
  while (ctx.measureText(text).width * squash > a.w * 0.92 && size > 12) {
    size -= 2;
    ctx.font = `900 ${size}px 'Liberation Sans', 'DejaVu Sans', sans-serif`;
  }
  ctx.save();
  ctx.translate(cx, baseline);
  ctx.scale(squash, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255, 46, 136, 0.65)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.03;
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = titleColor || '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * Paints the whole cover: panels with white gutters and thin white frames,
 * the grade wash, the finish and the caption block. `state` carries layout,
 * grade, title, subtitle, titleSize, titleColor, outline and panels; `photos`
 * is an array of images (or null) indexed by each panel's `photo`. A panel
 * may carry `crop: 'scenic'` to show its photo's faceless detail window.
 */
export function renderCover(ctx, w, h, state, photos) {
  const grade = GRADE_PRESETS[state.grade] || GRADE_PRESETS['vice-sunset'];
  const rects = layoutPanels(state.layout, w, h);
  const gutter = Math.max(3, Math.round(Math.min(w, h) * 0.006));

  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((frac, i) => {
    // The full-bleed layout's snapshot is drawn separately, tilted.
    if (state.layout === 'full-bleed' && i === 1) return;
    const rect = {
      x: frac.x * w + (frac.x > 0 ? gutter / 2 : gutter),
      y: frac.y * h + (frac.y > 0 ? gutter / 2 : gutter),
      w: frac.w * w - gutter,
      h: frac.h * h - gutter,
    };
    const panel = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = panel.photo >= 0 ? photos[panel.photo] : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (photo) {
      drawPanelPhoto(ctx, photo, rect, panel);
    } else {
      const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      empty.addColorStop(0, '#3a1c52');
      empty.addColorStop(1, '#160a24');
      ctx.fillStyle = empty;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradePanel(ctx, rect, grade);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // The inset snapshot of the full-bleed layout sits tilted, like a polaroid:
  // its photo clipped inside a white frame, the whole card rotated a touch.
  if (state.layout === 'full-bleed' && rects.length > 1) {
    const inset = rects[1];
    const panel = state.panels[1] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = panel.photo >= 0 ? photos[panel.photo] : null;
    const rect = {
      x: inset.x * w,
      y: inset.y * h,
      w: inset.w * w,
      h: inset.h * h,
    };
    const frame = Math.max(4, Math.min(w, h) * 0.008);
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(-0.045);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-rect.w / 2 - frame, -rect.h / 2 - frame, rect.w + frame * 2, rect.h + frame * 2);
    ctx.beginPath();
    ctx.rect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.clip();
    if (photo) {
      drawPanelPhoto(ctx, photo, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, panel);
    } else {
      ctx.fillStyle = '#3a1c52';
      ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    }
    gradePanel(ctx, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, grade);
    ctx.restore();
  }

  finishCover(ctx, w, h, grade);
  const anchor = titleAnchor(state.layout, rects, w, h);
  drawTitleBlock(ctx, w, h, state.title, state.subtitle, grade, state.titleSize || 1, state.titleColor || '#ffffff', state.outline !== false, anchor);

  // Poster frame: a thin white line just inside the edge.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.0015);
  ctx.strokeRect(gutter * 1.5, gutter * 1.5, w - gutter * 3, h - gutter * 3);
}
