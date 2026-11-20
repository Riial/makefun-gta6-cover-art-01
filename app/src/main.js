// Wires the page: edit the cover's words, layout, grade and panels; upload your own
// photos; export the cover as a PNG. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import { drawCover, defaultState, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
const photos = { boulevard: null, pier: null, uploaded: null };
let selectedPanel = 0;

function $(id) {
  return document.getElementById(id);
}

function fillSelect(id, values) {
  const el = $(id);
  for (const v of values) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    el.appendChild(o);
  }
  el.value = values[0];
}

fillSelect('layout', LAYOUTS);
fillSelect('grade', GRADES);
fillSelect('size', Object.keys(SIZES));
fillSelect('panelPhoto', ['boulevard', 'pier', 'uploaded']);

function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state, photos);
}

function syncPanelControls() {
  const p = state.panels[selectedPanel];
  $('panelTitle').textContent = `PANEL ${selectedPanel + 1} — ${p.role}`;
  $('panelPhoto').value = p.photo;
  $('panelPhoto').disabled = selectedPanel === 0;
  $('zoom').value = p.zoom;
  $('fx').value = p.fx;
  $('fy').value = p.fy;
  $('role').value = p.role;
  for (const b of document.querySelectorAll('#panelButtons button')) {
    b.classList.toggle('active', Number(b.dataset.i) === selectedPanel);
  }
}

const panelButtons = $('panelButtons');
state.panels.forEach((p, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = String(i + 1);
  b.dataset.i = String(i);
  b.addEventListener('click', () => {
    selectedPanel = i;
    syncPanelControls();
  });
  panelButtons.appendChild(b);
});

function bindText(id, key) {
  $(id).addEventListener('input', () => {
    state[key] = $(id).value;
    redraw();
  });
}
bindText('title', 'title');
bindText('script', 'script');
bindText('quote', 'quote');
bindText('quoteSource', 'quoteSource');
bindText('tagline', 'tagline');

$('layout').addEventListener('change', () => {
  state.layout = $('layout').value;
  redraw();
});
$('grade').addEventListener('change', () => {
  state.grade = $('grade').value;
  redraw();
});
$('size').addEventListener('change', () => {
  state.size = $('size').value;
  redraw();
});
$('panelPhoto').addEventListener('change', () => {
  state.panels[selectedPanel].photo = $('panelPhoto').value;
  redraw();
});
$('zoom').addEventListener('input', () => {
  state.panels[selectedPanel].zoom = Number($('zoom').value);
  redraw();
});
$('fx').addEventListener('input', () => {
  state.panels[selectedPanel].fx = Number($('fx').value);
  redraw();
});
$('fy').addEventListener('input', () => {
  state.panels[selectedPanel].fy = Number($('fy').value);
  redraw();
});
$('role').addEventListener('input', () => {
  state.panels[selectedPanel].role = $('role').value.toUpperCase();
  syncPanelControls();
  redraw();
});

$('upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  photos.uploaded = await loadImage(URL.createObjectURL(file));
  state.panels[selectedPanel].photo = 'uploaded';
  syncPanelControls();
  redraw();
  status.textContent = `Loaded ${file.name} into panel ${selectedPanel + 1}.`;
});

$('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, photos);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved vice-city-cover-${w}x${h}.png`;
  }, 'image/png');
});

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  photos.boulevard = await loadImage('samples/boulevard.jpg');
  photos.pier = await loadImage('samples/pier.jpg');
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    // Fall back to system fonts if the vendored ones cannot load.
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (scene) => {
    Object.assign(state, scene);
    $('layout').value = state.layout;
    $('grade').value = state.grade;
    $('size').value = state.size;
    await ensureFonts();
    await loadSamples();
    redraw();
  });
} else {
  (async () => {
    await ensureFonts();
    await loadSamples();
    syncPanelControls();
    redraw();
  })();
}
