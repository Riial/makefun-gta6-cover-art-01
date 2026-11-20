// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, drawn at the window's
// size. Query keys: layout, grade, size, title, subtitle.
// window.__shotReady is set once the scene is painted and the fonts are in.
export async function runShot(shot, query, env) {
  const pick = (name, fallback) => query.get(name) ?? fallback;
  await env.ensureFonts();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    env.setState({
      layout: pick('layout', 'six'),
      grade: pick('grade', 'sunset'),
      size: pick('size', 'wide'),
      title: pick('title', 'NEON COAST'),
      subtitle: pick('subtitle', 'Sunset County'),
    });
    await env.loadDefaults();
    if (env.syncChoices) env.syncChoices();
    env.drawCoverFull();
  } else {
    env.setState({
      layout: pick('layout', 'six'),
      grade: pick('grade', 'neon'),
      size: pick('size', 'wide'),
    });
    await env.loadDefaults();
    if (env.syncChoices) env.syncChoices();
    env.drawPreview();
  }
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
