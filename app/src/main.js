// Golden Heist — wires the editor: loads the sample photos, binds every
// control to the cover state, redraws the live preview, exports the PNG,
// and hands ?shot= scenes to shots.js. Photos stay on the machine.
import { defaultState, drawCover, SAMPLES, GRADES, LAYOUTS, SIZES, layoutPanels, layoutSlots } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultState();
const photos = {};
let selected = 0;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function previewSize() {
  const s = SIZES[state.size];
  const maxW = 980, maxH = 640;
  const k = Math.min(maxW / s.w, maxH / s.h, 1);
  return { w: Math.round(s.w * k), h: Math.round(s.h * k) };
}

function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state, photos);
  document.querySelectorAll('#panels button').forEach((b, i) => {
    b.classList.toggle('sel', i === selected);
  });
}

function bind(id, get, set) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { set(el.value); redraw(); });
  return el;
}

function bindSelect(id, options, get, set) {
  const el = document.getElementById(id);
  for (const [v, label] of Object.entries(options)) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    el.appendChild(o);
  }
  el.value = get();
  el.addEventListener('change', () => { set(el.value); redraw(); });
  return el;
}

function bindPanelControls() {
  const p = state.panels[selected];
  const photo = document.getElementById('panelPhoto');
  photo.innerHTML = '';
  for (const k of Object.keys(SAMPLES)) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = k === 'boulevard' ? 'Boulevard (woman)' : 'Pier (man)';
    photo.appendChild(o);
  }
  const up = document.createElement('option');
  up.value = 'upload';
  up.textContent = 'Upload your own…';
  photo.appendChild(up);
  photo.value = p.photo in SAMPLES ? p.photo : 'upload';
  photo.onchange = () => {
    if (photo.value === 'upload') {
      document.getElementById('uploadFile').click();
      return;
    }
    p.photo = photo.value;
    redraw();
  };
  const zoom = document.getElementById('panelZoom');
  zoom.value = p.zoom;
  zoom.oninput = () => { p.zoom = parseFloat(zoom.value); redraw(); };
  const fx = document.getElementById('panelFx');
  fx.value = p.fx;
  fx.oninput = () => { p.fx = parseFloat(fx.value); redraw(); };
  const fy = document.getElementById('panelFy');
  fy.value = p.fy;
  fy.oninput = () => { p.fy = parseFloat(fy.value); redraw(); };
  const role = document.getElementById('panelRole');
  role.value = p.role;
  role.oninput = () => { p.role = role.value.toUpperCase(); redraw(); };
  document.getElementById('panelName').textContent = `Panel ${selected + 1} — ${p.role}`;
}

document.getElementById('uploadFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  const key = `user${Date.now()}`;
  photos[key] = img;
  state.panels[selected].photo = key;
  const photo = document.getElementById('panelPhoto');
  const o = document.createElement('option');
  o.value = key;
  o.textContent = file.name;
  photo.appendChild(o);
  photo.value = key;
  redraw();
});

// Click the preview to pick a panel.
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  const W = canvas.width, H = canvas.height;
  const quoteH = H * 0.062, creditH = H * 0.052, gut = Math.max(4, 8 * (W / 1920));
  const rects = layoutPanels(state.layout, W * 0.018, quoteH + H * 0.008, W * 0.964, H - quoteH - creditH - H * 0.016, gut);
  const slots = layoutSlots(state.layout);
  rects.forEach((rc, i) => {
    if (x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h) {
      selected = slots[i];
      bindPanelControls();
      redraw();
    }
  });
});

bind('title', () => state.title, (v) => { state.title = v.toUpperCase(); });
bind('subtitle', () => state.subtitle, (v) => { state.subtitle = v; });
bind('quote', () => state.quote, (v) => { state.quote = v.toUpperCase(); });
bind('gazette', () => state.gazette, (v) => { state.gazette = v.toUpperCase(); });
bind('tagline', () => state.tagline, (v) => { state.tagline = v.toUpperCase(); });
bindSelect('layout', Object.fromEntries(Object.entries(LAYOUTS).map(([k, v]) => [k, v.name])),
  () => state.layout, (v) => { state.layout = v; });
bindSelect('grade', Object.fromEntries(Object.entries(GRADES).map(([k, v]) => [k, v.name])),
  () => state.grade, (v) => { state.grade = v; });
bindSelect('size', Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v.name])),
  () => state.size, (v) => { state.size = v; });

document.getElementById('panels').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  selected = parseInt(b.dataset.panel, 10);
  bindPanelControls();
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const s = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  drawCover(off, state, photos);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `golden-heist-${s.w}x${s.h}.png`;
    a.click();
    statusEl.textContent = `Saved golden-heist-${s.w}x${s.h}.png`;
  }, 'image/png');
});

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
async function start() {
  for (const [k, url] of Object.entries(SAMPLES)) {
    photos[k] = await loadImage(url);
  }
  await document.fonts.ready;
  if (shot) {
    runShot(shot, query, state, photos, redraw);
  } else {
    bindPanelControls();
    redraw();
  }
}
start();
