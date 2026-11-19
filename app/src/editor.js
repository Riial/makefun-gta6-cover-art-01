// Vice Coast Cover Studio — editor state and panel interaction.
//
// Holds the cover state (layout, grade, caption, one entry per panel), the
// photo slots (two built-in samples plus three user uploads), panel picking
// by click, drag-to-pan and zoom, and the three-size PNG export. The render
// itself lives in cover.js; this file only decides *what* gets drawn.

import { renderCover, layoutPanels, GRADE_PRESETS, LAYOUT_PRESETS } from './cover.js';

export const SAMPLE_PHOTOS = [
  { id: 0, label: 'Sample · Boulevard', url: 'samples/boulevard.jpg' },
  { id: 1, label: 'Sample · Pier', url: 'samples/pier.jpg' },
];

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080, name: 'vice-coast-1080x1080.png' },
  { label: '1080 × 1350', w: 1080, h: 1350, name: 'vice-coast-1080x1350.png' },
  { label: '1920 × 1080', w: 1920, h: 1080, name: 'vice-coast-1920x1080.png' },
];

/** A fresh cover: hero-split layout, Vice Sunset grade, both samples placed. */
export function freshState() {
  return {
    layout: 'hero-split',
    grade: 'vice-sunset',
    title: 'VICE COAST',
    subtitle: 'Sunset Heist',
    titleSize: 1,
    titleColor: '#ffffff',
    outline: true,
    aspect: 'landscape',
    panels: [
      { photo: 0, zoom: 1, ox: 0, oy: 0.12 },
      { photo: 1, zoom: 1.1, ox: 0, oy: 0.15 },
      { photo: 0, zoom: 1.3, ox: 0.11, oy: 0.63 },
    ],
  };
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/**
 * The editor: owns the preview canvas, the photo slots and the selected
 * panel, and repaints on every state change.
 */
export class CoverEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = freshState();
    this.photos = [null, null, null, null, null];
    this.selected = 0;
    this.selectionVisible = true;
    this.listeners = new Set();
    this.drag = null;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  /** Loads the two built-in samples into slots 0 and 1. */
  async loadSamples() {
    const [boulevard, pier] = await Promise.all(
      SAMPLE_PHOTOS.map((s) => loadImage(s.url)),
    );
    this.photos[0] = boulevard;
    this.photos[1] = pier;
    this.repaint();
  }

  /** Reads a user file into a photo slot (2, 3 or 4). */
  async loadUserPhoto(slot, file) {
    const url = URL.createObjectURL(file);
    try {
      this.photos[slot] = await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    this.repaint();
  }

  /** Fills every panel with the same photo slot. */
  fillAllWith(photoIndex) {
    for (const panel of this.state.panels) panel.photo = photoIndex;
    this.repaint();
    this.emit();
  }

  setLayout(layout) {
    if (!LAYOUT_PRESETS[layout]) return;
    this.state.layout = layout;
    this.repaint();
    this.emit();
  }

  setGrade(grade) {
    if (!GRADE_PRESETS[grade]) return;
    this.state.grade = grade;
    this.repaint();
    this.emit();
  }

  setTitle(title) {
    this.state.title = title;
    this.repaint();
  }

  setSubtitle(subtitle) {
    this.state.subtitle = subtitle;
    this.repaint();
  }

  setTitleSize(size) {
    this.state.titleSize = size;
    this.repaint();
  }

  setTitleColor(color) {
    this.state.titleColor = color;
    this.repaint();
  }

  setOutline(on) {
    this.state.outline = on;
    this.repaint();
  }

  setPanelPhoto(index, photoIndex) {
    this.state.panels[index].photo = photoIndex;
    this.repaint();
    this.emit();
  }

  setPanelZoom(index, zoom) {
    this.state.panels[index].zoom = zoom;
    this.repaint();
  }

  resetPanel(index) {
    this.state.panels[index] = { photo: this.state.panels[index].photo, zoom: 1, ox: 0, oy: 0 };
    this.repaint();
    this.emit();
  }

  /** Sizes the preview canvas to an aspect and repaints. */
  setAspect(aspect) {
    this.state.aspect = aspect;
    const sizes = {
      landscape: [960, 540],
      square: [720, 720],
      portrait: [648, 810],
    };
    const [w, h] = sizes[aspect] || sizes.landscape;
    this.canvas.width = w;
    this.canvas.height = h;
    this.repaint();
  }

  /** Which panel, if any, sits under a point in canvas pixels. */
  panelAt(x, y) {
    const { width: w, height: h } = this.canvas;
    const rects = layoutPanels(this.state.layout, w, h);
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (x >= r.x * w && x < (r.x + r.w) * w && y >= r.y * h && y < (r.y + r.h) * h) return i;
    }
    return -1;
  }

  /** Starts a drag; dragging pans the selected panel's photo. */
  pointerDown(x, y) {
    const hit = this.panelAt(x, y);
    if (hit >= 0) {
      this.selected = hit;
      this.emit();
    }
    this.drag = { x, y, panel: hit, ox: 0, oy: 0 };
    if (hit >= 0) {
      const panel = this.state.panels[hit];
      this.drag.ox = panel.ox;
      this.drag.oy = panel.oy;
    }
    this.repaint();
  }

  pointerMove(x, y) {
    if (!this.drag || this.drag.panel < 0) return;
    const { width: w, height: h } = this.canvas;
    const panel = this.state.panels[this.drag.panel];
    panel.ox = this.drag.ox + (x - this.drag.x) / w;
    panel.oy = this.drag.oy + (y - this.drag.y) / h;
    this.repaint();
  }

  pointerUp() {
    if (this.drag && this.drag.panel >= 0) this.emit();
    this.drag = null;
  }

  /** Draws the state onto an offscreen canvas at export size. */
  renderExport(w, h) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    renderCover(off.getContext('2d'), w, h, this.state, this.photos);
    return off;
  }

  /** Downloads the cover as a PNG at one of the three post sizes. */
  exportPng(size, status) {
    const off = this.renderExport(size.w, size.h);
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = size.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      if (status) status.textContent = `Saved ${size.name}`;
    }, 'image/png');
  }

  /** Repaints the preview, plus a dashed outline around the selected panel. */
  repaint() {
    const { width: w, height: h } = this.canvas;
    renderCover(this.ctx, w, h, this.state, this.photos);
    if (!this.selectionVisible) return;
    const rects = layoutPanels(this.state.layout, w, h);
    const sel = rects[this.selected];
    if (!sel) return;
    this.ctx.save();
    this.ctx.setLineDash([10, 6]);
    this.ctx.strokeStyle = '#7df9ff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(sel.x * w + 3, sel.y * h + 3, sel.w * w - 6, sel.h * h - 6);
    this.ctx.restore();
  }
}
