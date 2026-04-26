/**
 * Keep embedded shared sources and renderer-agnostic implementation files in sync.
 * Runtime-specific adapters, README/package metadata, and spec mocks stay package-local.
 *
 * Run after changing shared code:
 *   node scripts/sync-rive-angular-core-embedded.mjs
 */
import { cp, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'libs/rive-angular-core/src');
const targets = [
  join(root, 'libs/rive-angular-canvas/src/rive-angular-core'),
  join(root, 'libs/rive-angular-webgl2/src/rive-angular-core'),
];

for (const t of targets) {
  await rm(t, { recursive: true, force: true });
  await cp(src, t, { recursive: true });
}

const rendererSharedFiles = [
  'src/lib/components/index.ts',
  'src/lib/components/rive-canvas.component.ts',
  'src/lib/models/index.ts',
  'src/lib/models/rive.model.ts',
  'src/lib/services/index.ts',
  'src/lib/services/rive-file.service.ts',
  'src/lib/utils/index.ts',
  'src/lib/utils/rive-runtime.ts',
  'src/lib/utils/runtime-config.ts',
];

const canvasRoot = join(root, 'libs/rive-angular-canvas');
const webgl2Root = join(root, 'libs/rive-angular-webgl2');

for (const file of rendererSharedFiles) {
  await copyFile(join(canvasRoot, file), join(webgl2Root, file));
}

console.log(
  'Embedded rive-angular-core and shared renderer sources synced to canvas and webgl2 packages.',
);
