// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone; square and portrait show the other layouts.
// window.__shotReady is set once painted.
export async function runShot(shot, query, apply) {
  const scenes = {
    cover: { layout: 'Hero Duo', grade: 'Sunset', size: 'Wide 1920 x 1080' },
    editor: { layout: 'Hero Duo', grade: 'Sunset', size: 'Wide 1920 x 1080' },
    square: { layout: 'Comic Spread', grade: 'Comic Ink', size: 'Square 1080 x 1080' },
    portrait: { layout: 'Triple Strip', grade: 'Vice Gold', size: 'Portrait 1080 x 1350' },
  };
  const scene = scenes[shot] || scenes.cover;
  if (shot !== 'editor') document.body.classList.add('shot-cover');
  await apply(scene);
  try {
    await document.fonts.ready;
  } catch (e) {
    // Continue with fallback fonts.
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
