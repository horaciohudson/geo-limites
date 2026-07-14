const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const shellRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(shellRoot, '..', '..');
const frontendDistSource = path.resolve(frontendRoot, 'dist');
const packagedFrontendDir = path.resolve(shellRoot, 'frontend-dist');
const releaseRoot = path.resolve(shellRoot, 'release');
const releaseStageDir = path.resolve(releaseRoot, '.portable-stage');
const cacheRoot = path.resolve(shellRoot, '.cache');
const electronCacheDir = path.resolve(cacheRoot, 'electron');
const tempDir = path.resolve(frontendRoot, '.tmp', 'electron-shell-packager');
const packageJsonPath = path.resolve(shellRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const productName = packageJson.build?.productName || 'GeoLimites Desktop';
const version = packageJson.version || '0.1.0';
const packageFolderName = `${productName}-win32-x64`;
const portableZipPath = path.resolve(releaseRoot, `GeoLimites-Desktop-${version}-win-x64-portable.zip`);
const electronPackagerScript = path.resolve(shellRoot, 'node_modules', 'electron-packager', 'bin', 'electron-packager.js');
const shouldZip = !process.argv.includes('--dir');

const copyDirectory = (source, target) => {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
};

const runCommand = (command, args, options = {}) => (
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: shellRoot,
      stdio: 'inherit',
      shell: options.shell ?? false,
      env: {
        ...process.env,
        ...options.env
      }
    });

    child.on('exit', (code) => {
      if ((code ?? 0) === 0) {
        resolve();
        return;
      }

      reject(new Error(`Comando falhou com codigo ${code ?? 'desconhecido'}`));
    });
  })
);

const main = async () => {
  if (!fs.existsSync(frontendDistSource)) {
    console.error('[electron-shell] Build desktop do frontend nao encontrado em:', frontendDistSource);
    console.error('[electron-shell] Rode "npm run build:desktop" em Frontend antes de empacotar.');
    process.exit(1);
  }

  if (!fs.existsSync(electronPackagerScript)) {
    console.error('[electron-shell] Script do electron-packager nao encontrado em:', electronPackagerScript);
    console.error('[electron-shell] Rode "npm install" em Frontend/platforms/electron-shell antes de empacotar.');
    process.exit(1);
  }

  copyDirectory(frontendDistSource, packagedFrontendDir);
  fs.mkdirSync(releaseRoot, { recursive: true });
  fs.mkdirSync(electronCacheDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
  const tempPortableOutParent = path.resolve(tempDir, 'portable-output');
  fs.rmSync(tempPortableOutParent, { recursive: true, force: true });
  fs.mkdirSync(tempPortableOutParent, { recursive: true });

  const tempPortableOutDir = fs.mkdtempSync(path.join(tempPortableOutParent, 'app-'));
  const packagedAppDir = path.resolve(tempPortableOutDir, packageFolderName);
  const stagedPackagedAppDir = path.resolve(releaseStageDir, packageFolderName);

  try {
    await runCommand(process.execPath, [
      electronPackagerScript,
      '.',
      productName,
      '--platform=win32',
      '--arch=x64',
      `--out=${tempPortableOutDir}`,
      `--download.cacheRoot=${electronCacheDir}`,
      '--overwrite',
      '--ignore=^/release($|/)',
      '--ignore=^/\\.cache($|/)',
      '--ignore=^/scripts($|/)',
      '--ignore=^/node_modules($|/)',
      '--ignore=^/README\\.md$',
      '--ignore=^/tsconfig\\.json$',
      '--ignore=^/package-lock\\.json$',
      '--ignore=^/main($|/)',
      '--ignore=^/preload($|/)',
      '--ignore=^/renderer-bridge($|/)'
    ], {
      env: {
        TEMP: tempDir,
        TMP: tempDir
      }
    });

    copyDirectory(packagedAppDir, stagedPackagedAppDir);

    if (!shouldZip || process.platform !== 'win32') {
      return;
    }

    fs.rmSync(portableZipPath, { force: true });
    await runCommand('powershell', [
      '-NoLogo',
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${stagedPackagedAppDir}\\*' -DestinationPath '${portableZipPath}' -Force`
    ], { shell: process.platform === 'win32' });
  } finally {
    fs.rmSync(packagedFrontendDir, { recursive: true, force: true });
    fs.rmSync(path.resolve(tempDir, 'portable-output'), { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error('[electron-shell] Falha ao gerar pacote portatil:', error instanceof Error ? error.message : error);
  process.exit(1);
});
