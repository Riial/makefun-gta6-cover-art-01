# Vice Coast Cover Studio — makefun-gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Riial/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Riial/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style
multi-panel cover art — hero panel plus side panels, a Vice City sunset or
neon colour grade, bold condensed lettering — exported as a PNG in
1080 × 1080, 1080 × 1350 or 1920 × 1080. Everything runs in the browser
from static files; photos never leave your machine. An AI judge compares
the apps two at a time, places go by win rate, and the 50 best share $250.

## What it does

- **Any photo** — upload up to three of your own, or use the two built-in
  samples. Each panel takes its own photo, or one photo can fill every
  panel; click a panel to select it, drag its photo to pan, zoom with the
  slider. Pan is clamped so the photo always covers its panel. A panel's
  **Scenic detail** crop shows a faceless palms-and-sunset or open-sea
  window of a sample, so a cover can hold three different images from
  two photos — no face is ever repeated. The palms window is the default
  scenic pick: it is warm sunset content, while the open-sea window reads
  as mostly empty cool sky in a small landscape panel.
- **Three layouts** — Hero + Side Stack, Triple Strip, and Full Bleed +
  Snapshot (a tilted polaroid-style inset).
- **Three colour grades** — Vice Sunset, Neon Nights, Palm Dusk: a warm
  wash, a glow, a vignette and seeded film grain over every panel. The
  wash is strong enough that a bright midday shot and a sunset shot in
  the same cover read as one warm poster.
- **Caption** — title and subtitle with size, colour and dark-outline
  controls; the title is drawn in huge condensed capitals with a thick
  dark outline and neon shadow over a scrim at the foot of the hero
  panel, so it never straddles a panel gutter.
- **Fast and easy** — load a sample, type a caption, hit one export
  button. Live preview in landscape, square and portrait aspects.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, system fonts only.

---

<sub>Entered on [make.fun](https://make.fun/?ref=mrbstn7p&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
