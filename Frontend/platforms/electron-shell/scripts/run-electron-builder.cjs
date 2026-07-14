const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const shellRoot = path.resolve(__dirname, '..');
const cacheRoot = path.resolve(shellRoot, '.cache');
const electronCache = path.resolve(cacheRoot, 'electron');
const electronBuilderCache = path.resolve(cacheRoot, 'electron-builder');
const electronBuilderBinary = process.platform === 'win32'
  ? path.resolve(shellRoot, 'node_modules', '.bin', 'electron-builder.cmd')
  : path.resolve(shellRoot, 'node_modules', '.bin', 'electron-builder');

for (const directory of [cacheRoot, electronCache, electronBuilderCache]) {
  fs.mkdirSync(directory, { recursive: true });
}

if (!fs.existsSync(electronBuilderBinary)) {
  console.error('[electron-shell] Binario do electron-builder nao encontrado em:', electronBuilderBinary);
  console.error('[electron-shell] Rode "npm install" em Frontend/platforms/electron-shell antes de empacotar.');
  process.exit(1);
}

const child = spawn(
  electronBuilderBinary,
  process.argv.slice(2),
  {
    cwd: shellRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ELECTRON_CACHE: electronCache,
      ELECTRON_BUILDER_CACHE: electronBuilderCache
    }
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
