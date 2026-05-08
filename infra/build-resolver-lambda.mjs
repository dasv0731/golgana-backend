// Bundle del resolver AppSync para Lambda.
import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist-lambda-resolver');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: [resolve(root, 'infra/resolver-handler.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: resolve(out, 'handler.mjs'),
  external: ['@aws-sdk/*'],
  banner: {
    js: "import { createRequire as _gg_cr } from 'module'; const require = _gg_cr(import.meta.url);",
  },
  minify: false,
  sourcemap: false,
  legalComments: 'none',
});

const zipPath = resolve(out, 'resolver.zip');
const isWin = process.platform === 'win32';
if (isWin) {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${out}/handler.mjs' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
} else {
  execSync(`cd "${out}" && zip resolver.zip handler.mjs`, { stdio: 'inherit' });
}

// eslint-disable-next-line no-console
console.log(`✅ Resolver bundle ready: ${zipPath}`);
