// Vice Coast Cover Studio — the entry program for gta6-cover-art-01 (Node 22,
// standard library only).
//
// The app is plain static files in this directory's app/ folder: index.html
// plus its ES modules, system fonts only, no library and no network request
// anywhere. This program hands it in: it copies app/ and screenshots/ from
// beside this file into /output and writes /output/dossier.json — the summary
// the judge reads — with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: the scorer refuses an entry whose app is missing its entry
// point or whose screenshots break the caps, so fail loudly here instead.
// v3: fewer than 3 screenshots is refused too — the bounty asks for 3–4.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — the app cannot enter');
}
if (existsSync(join(here, 'screenshots'))) {
  const shots = readdirSync(join(here, 'screenshots'));
  if (shots.length < 3) throw new Error(`too few screenshots: ${shots.length} (need 3-4)`);
  if (shots.length > 4) throw new Error(`too many screenshots: ${shots.length} (max 4)`);
  for (const shot of shots) {
    const bytes = statSync(join(here, 'screenshots', shot)).size;
    if (bytes > 262144) throw new Error(`screenshot ${shot} is ${bytes} bytes (max 262144)`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps (reference/gate.json): text_max_bytes is the only one
// that shapes the dossier's bytes. The rest refuse an entry the scorer
// would refuse outright — more than 4 screenshots, one over 256 KiB, more
// than 993 files or 48 MiB under app/, or a path under app/ over 1000
// bytes. (app/ counts beside /output's own 1000-entry cap, together with
// screenshots/ and dossier.json.)
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
console.log(`wrote ${dossierPath} (${statSync(dossierPath).size} bytes)`);
