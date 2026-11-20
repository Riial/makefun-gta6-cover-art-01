# Vice City Cover Studio

A free offline web app that turns your photos and a caption into GTA-style
poster cover art: a hero duo split across the cover, four supporting panels,
a giant striped hand-lettered title, a neon script subtitle, a quote band and
a tagline — exported as a PNG in 1920×1080, 1080×1080 or 1080×1350.

New in this revision: a **Comic Ink** grade (posterized photos, halftone dots
and bold ink outlines) and a **Comic Spread** layout (tilted ink panels with
a speech-bubble caption).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a layout and a grade, edit the title, quote and tagline, crop each panel
with the zoom and focus sliders, upload your own photos, and export a PNG.
Everything runs in the browser; no photo ever leaves your machine.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## License

MIT. Fonts Anton and Pacifico are under the SIL Open Font License
(see `app/fonts/OFL.txt`). Sample photos were made for make.fun with an image
model and are free to use. No Rockstar Games logo, artwork or font is used.
