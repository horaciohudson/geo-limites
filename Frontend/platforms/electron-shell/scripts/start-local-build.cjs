const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const shellRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(shellRoot, '..', '..');
const frontendDistEntry = path.resolve(frontendRoot, 'dist', 'index.html');
const electronBinary = process.platform === 'win32'
  ? path.resolve(shellRoot, 'node_modules', '.bin', 'electron.cmd')
  : path.resolve(shellRoot, 'node_modules', '.bin', 'electron');

if (!fs.existsSync(frontendDistEntry)) {
  console.error('[electron-shell] Build do frontend nao encontrado em:', frontendDistEntry);
  console.error('[electron-shell] Rode "npm run build:desktop" em Frontend antes de iniciar o shell local.');
  process.exit(1);
}

if (!fs.existsSync(electronBinary)) {
  console.error('[electron-shell] Binario local do Electron nao encontrado em:', electronBinary);
  process.exit(1);
}

const sharedEnv = {
  ...process.env,
  SIGEVE_FRONTEND_URL: frontendDistEntry
};

console.log('[electron-shell] Frontend desktop encontrado em:', frontendDistEntry);
console.log('[electron-shell] Compilando o shell Electron...');

const shellBuild = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'build'],
  {
    cwd: shellRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: sharedEnv
  }
);

shellBuild.on('exit', (buildCode) => {
  if (buildCode && buildCode !== 0) {
    process.exit(buildCode);
    return;
  }

  console.log('[electron-shell] Build concluido. Abrindo Sigeve Desktop...');
  const electronProcess = spawn(
    electronBinary,
    ['.'],
    {
      cwd: shellRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: sharedEnv
    }
  );

  electronProcess.on('exit', (electronCode) => {
    process.exit(electronCode ?? 0);
  });
});
