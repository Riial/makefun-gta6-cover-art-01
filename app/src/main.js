// Vice Coast Cover Studio — wires the page: photo slots, layout and grade
// presets, caption controls, per-panel crop controls, the three PNG exports
// and pointer drag-to-pan on the preview. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).

import { CoverEditor, SAMPLE_PHOTOS, EXPORT_SIZES } from './editor.js';
import { GRADE_PRESETS, LAYOUT_PRESETS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const editor = new CoverEditor(canvas);

/** Builds a row of preset buttons from a preset map into a container. */
function buildPresetButtons(container, presets, current, onPick) {
  container.textContent = '';
  for (const [key, preset] of Object.entries(presets)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset' + (key === current ? ' active' : '');
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      onPick(key);
      for (const b of container.children) b.classList.remove('active');
      button.classList.add('active');
    });
    container.appendChild(button);
  }
}

/** Builds the photo-picker <select> for one panel. */
function buildPanelPhotoSelect(index) {
  const select = document.createElement('select');
  select.id = `panel-photo-${index}`;
  select.setAttribute('aria-label', `Photo for panel ${index + 1}`);
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = 'Empty';
  select.appendChild(empty);
  for (const sample of SAMPLE_PHOTOS) {
    const option = document.createElement('option');
    option.value = String(sample.id);
    option.textContent = sample.label;
    select.appendChild(option);
  }
  for (let slot = 2; slot <= 4; slot++) {
    const option = document.createElement('option');
    option.value = String(slot);
    option.textContent = `Your photo ${slot - 1}`;
    select.appendChild(option);
  }
  select.value = String(editor.state.panels[index].photo);
  select.addEventListener('change', () => editor.setPanelPhoto(index, Number(select.value)));
  return select;
}

/** Renders the per-panel controls for the selected panel. */
function renderPanelControls() {
  const box = document.getElementById('panel-controls');
  box.textContent = '';
  const index = editor.selected;
  const panel = editor.state.panels[index];
  const heading = document.createElement('h3');
  heading.textContent = `Panel ${index + 1} — crop & position`;
  box.appendChild(heading);

  const photoLabel = document.createElement('label');
  photoLabel.textContent = 'Photo';
  photoLabel.appendChild(buildPanelPhotoSelect(index));
  box.appendChild(photoLabel);

  const zoomLabel = document.createElement('label');
  zoomLabel.textContent = 'Zoom';
  const zoom = document.createElement('input');
  zoom.type = 'range';
  zoom.min = '1';
  zoom.max = '3';
  zoom.step = '0.05';
  zoom.value = String(panel.zoom);
  zoom.setAttribute('aria-label', 'Zoom the selected panel photo');
  zoom.addEventListener('input', () => editor.setPanelZoom(index, Number(zoom.value)));
  zoomLabel.appendChild(zoom);
  box.appendChild(zoomLabel);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Drag the photo on the preview to pan it. Click another panel to select it.';
  box.appendChild(hint);

  const row = document.createElement('div');
  row.className = 'row';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset crop';
  reset.addEventListener('click', () => {
    editor.resetPanel(index);
    renderPanelControls();
  });
  const fillAll = document.createElement('button');
  fillAll.type = 'button';
  fillAll.textContent = 'Use this photo everywhere';
  fillAll.addEventListener('click', () => {
    editor.fillAllWith(panel.photo);
    renderPanelControls();
  });
  row.appendChild(reset);
  row.appendChild(fillAll);
  box.appendChild(row);
}

editor.onChange(() => renderPanelControls());

// Photo slots: the two samples plus three user uploads.
const photoSlots = document.getElementById('photo-slots');
for (let slot = 2; slot <= 4; slot++) {
  const label = document.createElement('label');
  label.textContent = `Your photo ${slot - 1}`;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await editor.loadUserPhoto(slot, file);
      status.textContent = `Loaded ${file.name} as photo ${slot - 1}. Pick it in a panel.`;
      renderPanelControls();
    } catch {
      status.textContent = 'That file could not be read as a photo.';
    }
  });
  label.appendChild(input);
  photoSlots.appendChild(label);
}
document.getElementById('load-samples').addEventListener('click', async () => {
  await editor.loadSamples();
  status.textContent = 'Sample photos loaded.';
  renderPanelControls();
});

buildPresetButtons(
  document.getElementById('layout-presets'),
  LAYOUT_PRESETS,
  editor.state.layout,
  (key) => editor.setLayout(key),
);
buildPresetButtons(
  document.getElementById('grade-presets'),
  GRADE_PRESETS,
  editor.state.grade,
  (key) => editor.setGrade(key),
);

// Caption controls.
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
titleInput.addEventListener('input', () => editor.setTitle(titleInput.value));
subtitleInput.addEventListener('input', () => editor.setSubtitle(subtitleInput.value));
const titleSize = document.getElementById('title-size');
titleSize.addEventListener('input', () => editor.setTitleSize(Number(titleSize.value)));
const titleColor = document.getElementById('title-color');
titleColor.addEventListener('input', () => editor.setTitleColor(titleColor.value));
const outline = document.getElementById('title-outline');
outline.addEventListener('change', () => editor.setOutline(outline.checked));

// Preview aspect switcher.
for (const button of document.querySelectorAll('[data-aspect]')) {
  button.addEventListener('click', () => {
    editor.setAspect(button.dataset.aspect);
    for (const b of document.querySelectorAll('[data-aspect]')) b.classList.toggle('active', b === button);
  });
}

// Pointer drag-to-pan on the preview.
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  editor.pointerDown(p.x, p.y);
});
canvas.addEventListener('pointermove', (e) => {
  if (!editor.drag) return;
  const p = canvasPoint(e);
  editor.pointerMove(p.x, p.y);
});
canvas.addEventListener('pointerup', () => editor.pointerUp());

// One export button per post size.
const exportBox = document.getElementById('exports');
for (const size of EXPORT_SIZES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `Export PNG ${size.label}`;
  button.addEventListener('click', () => editor.exportPng(size, status));
  exportBox.appendChild(button);
}

// Boot: samples in, then either a fixed screenshot scene or the live editor.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
await editor.loadSamples();
renderPanelControls();
if (shot) {
  await runShot(shot, query, editor);
} else {
  editor.setAspect('landscape');
  editor.repaint();
}
