// Fixed scenes for screenshots: ?shot=cover-landscape shows the exported
// 1920x1080 cover alone, ?shot=editor the editor with a photo loaded,
// ?shot=cover-square the 1080x1080 cover and ?shot=cover-portrait the
// 1080x1350 cover. Each scene is deterministic — same state, same seeded
// grain — and window.__shotReady is set once the paint is done.
//
// v2: no cover repeats a face. Every cover mixes the two samples with a
// faceless scenic detail (palms and sunset from the boulevard photo, or open
// sea and rod from the pier photo), so each of the three panels reads as a
// different image.

/** Applies a scene's state to the editor and paints it once. */
function paintScene(editor, { layout, grade, title, subtitle, panels, aspect, w, h }) {
  const state = editor.state;
  state.layout = layout;
  state.grade = grade;
  state.title = title;
  state.subtitle = subtitle;
  if (panels) state.panels = panels.map((p) => ({ ...p }));
  editor.canvas.width = w;
  editor.canvas.height = h;
  editor.selectionVisible = false;
  editor.repaint();
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
      resolve();
    }));
  });
}

export async function runShot(shot, query, editor) {
  if (shot === 'cover-landscape') {
    document.body.classList.add('shot-cover');
    await paintScene(editor, {
      layout: 'hero-split',
      grade: 'vice-sunset',
      title: 'VICE COAST',
      subtitle: 'Sunset Heist',
      panels: [
        { photo: 0, zoom: 1.0, ox: 0, oy: 0.12 },
        { photo: 1, zoom: 1.1, ox: 0, oy: 0.15 },
        { photo: 1, crop: 'scenic', zoom: 1.0, ox: 0, oy: 0 },
      ],
      w: 1280,
      h: 720,
    });
  } else if (shot === 'cover-square') {
    document.body.classList.add('shot-cover');
    await paintScene(editor, {
      layout: 'hero-split',
      grade: 'neon-nights',
      title: 'VICE COAST',
      subtitle: 'Night Shift',
      panels: [
        { photo: 0, zoom: 1.1, ox: 0, oy: 0.06 },
        { photo: 1, zoom: 1.15, ox: 0, oy: 0.12 },
        { photo: 1, crop: 'scenic', zoom: 1.0, ox: 0, oy: 0 },
      ],
      w: 1024,
      h: 1024,
    });
  } else if (shot === 'cover-portrait') {
    document.body.classList.add('shot-cover');
    await paintScene(editor, {
      layout: 'hero-split',
      grade: 'palm-dusk',
      title: 'VICE COAST',
      subtitle: 'Pier Pressure',
      panels: [
        { photo: 1, zoom: 1.05, ox: 0, oy: 0.12 },
        { photo: 0, zoom: 1.2, ox: 0, oy: 0.1 },
        { photo: 0, crop: 'scenic', zoom: 1.0, ox: 0, oy: 0 },
      ],
      w: 1024,
      h: 1280,
    });
  } else {
    // editor: the live page with both samples loaded, the same distinct
    // panels as the landscape cover, and panel 1 selected.
    editor.state.title = 'VICE COAST';
    editor.state.subtitle = 'Sunset Heist';
    editor.state.panels = [
      { photo: 0, zoom: 1.0, ox: 0, oy: 0.12 },
      { photo: 1, zoom: 1.1, ox: 0, oy: 0.15 },
      { photo: 1, crop: 'scenic', zoom: 1.0, ox: 0, oy: 0 },
    ];
    editor.selected = 0;
    editor.setAspect('landscape');
    editor.repaint();
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.__shotReady = true;
        resolve();
      }));
    });
  }
}
