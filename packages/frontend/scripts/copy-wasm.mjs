// Copies the MediaPipe WASM runtime into public/wasm so FilesetResolver can
// load it at /wasm without a CDN dependency. Runs on postinstall.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'wasm');

if (!existsSync(src)) {
  console.warn('copy-wasm: @mediapipe/tasks-vision not installed, skipping');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('copy-wasm: @mediapipe/tasks-vision wasm -> public/wasm');
