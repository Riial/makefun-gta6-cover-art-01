[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Riial/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Riial/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice City Cover Studio

A GTA 6-style cover art maker that runs offline in a desktop browser.
Drop in your own photos, pick a layout and a grade, tune each panel,
and export a PNG to share — in the post sizes 1080×1080, 1080×1350
and 1920×1080.

## What it makes

One dominant hero composition — Jason & Lucia back-to-back against a
Vice City neon skyline at dusk — plus four supporting panels with role
tags (THE LOOKOUT, THE FIXER, THE CAPTAIN, THE GETAWAY), a giant
striped sunset-gradient **VICE CITY** title with a gold **VI**, a neon
script subtitle, a five-star quote bar, a tagline strip and a billing
block with COMING SOON, a barcode and a gold seal.

## How to use it

1. Serve the app: `node serve.ts`, then open http://localhost:8080.
2. Pick a layout (Vice Duo / Full Bleed / Triple Strip), a grade
   (Sunset / Neon Nights / Vice Gold / Teal Dusk) and an export size.
3. For each panel, choose a sample photo or upload your own, then drag
   the zoom and position sliders and edit the role tag.
4. Edit the title, script subtitle, quote and tagline.
5. Press **Export PNG** — the cover is written at full post size.

## How it works

Everything is drawn on one 2D canvas (`app/cover.js`): each photo is
cover-fit into its panel with a zoom and focal point, the title is
drawn on a throwaway canvas so its diagonal stripes clip to the
letters alone, and the grade is a translucent wash over the photo
area only, so the lettering stays crisp. A `?shot=cover` mode renders
just the cover at screenshot size; `?shot=editor` shows the editor.

## Files

- `app/index.html` — the editor page
- `app/style.css` — dark plum editor theme, gold frames
- `app/cover.js` — the cover renderer and the editor wiring
- `app/samples/` — four sample photos made with an image model
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License
- `main.ts` — hands app/ and screenshots/ in, writes dossier.json
- `serve.ts` — tiny static server for local use

## Originality

All art, lettering and photos here are original or made with an image
model for this entry. No Rockstar Games logo, artwork or fonts are
used. The fonts are Anton and Pacifico (SIL Open Font License, texts
in `app/fonts/`). The sample photos show no real people.

## License

MIT — see LICENSE.
