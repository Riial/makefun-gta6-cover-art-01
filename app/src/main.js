// Neon Coast Cover Studio — wires the page: pick photos, write words, choose
// a layout, a grade and a size, and export the cover as a PNG. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, SIZES, LAYOUTS, GRADES, SAMPLE_PHOTOS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultState();
const images = new Map();
let uploadCount = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadDefaults() {
  for (const [key, photo] of Object.entries(SAMPLE_PHOTOS)) {
    if (!images.has(key)) images.set(key, await loadImage(photo.file));
  }
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('900 100px "NeonCoastDisplay"'),
      document.fonts.load('700 40px "NeonCoastCondensed"'),
      document.fonts.load('600 20px "NeonCoastText"'),
      document.fonts.load('italic 40px "NeonCoastSerif"'),
    ]);
  } catch {
    // A missing face falls back to the system sans; the cover still draws.
  }
  await document.fonts.ready;
}

/** Draws the current state into the preview canvas at half export size. */
function drawPreview() {
  const size = SIZES[state.size];
  canvas.width = Math.round(size.w / 2);
  canvas.height = Math.round(size.h / 2);
  drawCover(canvas, state, images);
}

function redraw() {
  drawPreview();
}

function choiceButtons(el, options, current, onPick) {
  el.innerHTML = '';
  for (const [key, opt] of Object.entries(options)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(key === current));
    b.innerHTML = `${opt.label}<small>${opt.sub}</small>`;
    b.addEventListener('click', () => {
      onPick(key);
      choiceButtons(el, options, key, onPick);
      redraw();
    });
    el.appendChild(b);
  }
}

function buildChoices() {
  choiceButtons(document.getElementById('layoutChoices'), LAYOUTS, state.layout, (k) => { state.layout = k; });
  choiceButtons(document.getElementById('gradeChoices'), GRADES, state.grade, (k) => { state.grade = k; });
  choiceButtons(document.getElementById('sizeChoices'), SIZES, state.size, (k) => { state.size = k; });
}

function photoOptions(select, current) {
  select.innerHTML = '';
  for (const [key, photo] of Object.entries(SAMPLE_PHOTOS)) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = photo.label;
    select.appendChild(o);
  }
  for (const key of images.keys()) {
    if (key.startsWith('up')) {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = `Uploaded photo ${key.slice(2)}`;
      select.appendChild(o);
    }
  }
  select.value = current;
}

function buildPanelEditors() {
  const host = document.getElementById('panelEditors');
  host.innerHTML = '';
  const roles = ['feature', 'small 1', 'small 2', 'small 3', 'small 4', 'strip'];
  state.panels.forEach((panel, i) => {
    const box = document.createElement('div');
    box.className = 'panel-editor';
    const head = document.createElement('h3');
    head.innerHTML = `Panel ${i + 1} <em>— ${roles[i] || 'frame'}</em>`;
    box.appendChild(head);

    const photoLabel = document.createElement('label');
    photoLabel.textContent = 'Photo';
    const select = document.createElement('select');
    photoOptions(select, panel.photo);
    select.addEventListener('change', () => {
      panel.photo = select.value;
      redraw();
    });
    photoLabel.appendChild(select);
    box.appendChild(photoLabel);

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.title = 'Or upload your own photo for this panel';
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      uploadCount += 1;
      const id = `up${uploadCount}`;
      images.set(id, await loadImage(URL.createObjectURL(f)));
      panel.photo = id;
      photoOptions(select, id);
      redraw();
    });
    box.appendChild(file);

    const row1 = document.createElement('div');
    row1.className = 'row';
    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = `Zoom ${panel.zoom.toFixed(2)}×`;
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.2';
    zoom.step = '0.05';
    zoom.value = String(panel.zoom);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      zoomLabel.textContent = `Zoom ${panel.zoom.toFixed(2)}×`;
      redraw();
    });
    zoomLabel.appendChild(zoom);
    row1.appendChild(zoomLabel);
    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Role tag';
    const tag = document.createElement('input');
    tag.type = 'text';
    tag.maxLength = 18;
    tag.value = panel.tag;
    tag.addEventListener('input', () => {
      panel.tag = tag.value;
      redraw();
    });
    tagLabel.appendChild(tag);
    row1.appendChild(tagLabel);
    box.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'row';
    for (const axis of ['fx', 'fy']) {
      const lab = document.createElement('label');
      lab.textContent = axis === 'fx' ? 'Focus left–right' : 'Focus top–bottom';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '1';
      range.step = '0.01';
      range.value = String(panel[axis]);
      range.addEventListener('input', () => {
        panel[axis] = Number(range.value);
        redraw();
      });
      lab.appendChild(range);
      row2.appendChild(lab);
    }
    box.appendChild(row2);
    host.appendChild(box);
  });
}

function bindWords() {
  const map = [
    ['titleInput', 'title'],
    ['subtitleInput', 'subtitle'],
    ['taglineInput', 'tagline'],
    ['quoteInput', 'quote'],
  ];
  for (const [id, key] of map) {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      redraw();
    });
  }
}

async function exportPNG() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  await ensureFonts();
  drawCover(off, state, images);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-${state.size}-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved neon-coast-${state.size}-${size.w}x${size.h}.png`;
  }, 'image/png');
}

buildChoices();
buildPanelEditors();
bindWords();
document.getElementById('exportBtn').addEventListener('click', exportPNG);

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state,
    images,
    loadDefaults,
    ensureFonts,
    drawPreview,
    syncChoices: buildChoices,
    setState(patch) {
      Object.assign(state, patch);
    },
    drawCoverFull() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawCover(canvas, state, images);
    },
  });
} else {
  await ensureFonts();
  await loadDefaults();
  redraw();
}
