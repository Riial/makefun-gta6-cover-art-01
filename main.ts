// Neon Coast Cover Studio — the entrypoint (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json with the vendored make.fun
// library. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Refuse to hand in an entry with too few screenshots: the gate would
// fail it, and a missing cover means the judge has nothing to rank.
const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shots.length < 3) throw new Error(`expected at least 3 screenshots, found ${shots.length}`);

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`handed in ${shots.length} screenshots, app + dossier written to ${out}`);
