// Bundle del backend para Lambda · esbuild produce 1 archivo .mjs auto-contenido.
import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist-lambda');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/handler.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: resolve(out, 'handler.mjs'),
  // AWS SDK v3 viene preinstalado en Node 20 runtime; no lo bundleamos
  external: ['@aws-sdk/*'],
  // ESM en Node 20 + esbuild necesita banner para __require()
  banner: {
    js: "import { createRequire as _gg_cr } from 'module'; const require = _gg_cr(import.meta.url);",
  },
  minify: false,
  sourcemap: false,
  legalComments: 'none',
});

// Empaquetar zip (PowerShell Compress-Archive en Windows; zip en Linux/Mac)
const zipPath = resolve(out, 'lambda.zip');
const isWin = process.platform === 'win32';
if (isWin) {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${out}/handler.mjs' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
} else {
  execSync(`cd "${out}" && zip lambda.zip handler.mjs`, { stdio: 'inherit' });
}

// eslint-disable-next-line no-console
console.log(`✅ Lambda bundle ready: ${zipPath}`);
