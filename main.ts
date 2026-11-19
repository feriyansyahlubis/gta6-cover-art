// Vice City Cover Studio — the entry program (Node 22, standard library only).
//
// It hands the app in: it copies this repository's app/ and screenshots/ into
// /output and writes /output/dossier.json with the vendored make.fun library,
// so the gate can check the app and the judge can read it. Run it twice and
// the two outputs are byte for byte identical.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies a directory tree when it exists, creating the target first. */
function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });

// The entry is meaningless without the app itself: fail loudly instead of
// silently producing an empty output directory.
if (!existsSync(join(repoRoot, 'app'))) {
  throw new Error(`app/ directory not found under ${repoRoot}`);
}

copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the other limits refuse an entry the scorer would refuse —
// more than 4 screenshots or one over 256 KiB, more than 993 files in app/
// or 48 MiB of app files in all, or a path under app/ over 1000 bytes. app/
// counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// One line on stdout so a local run shows what it produced.
console.log(`wrote ${join(outputDir, 'dossier.json')} (${dossier.length} bytes)`);
