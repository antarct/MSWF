const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const projectDir = path.join(repoRoot, 'wff-project');
const toolsDir = path.join(repoRoot, 'tools');
const distDir = path.join(repoRoot, 'dist');

// Tool paths with automatic local fallback
const aapt2 = path.join(toolsDir, 'aapt2.exe');
const signerJar = path.join(toolsDir, 'uber-apk-signer.jar');

// android.jar: check repo tools first, then local build cache
let androidJar = path.join(toolsDir, 'android.jar');
if (!fs.existsSync(androidJar)) {
  const localCache = 'C:\\Users\\mariu\\.gemini\\antigravity\\brain\\22629168-71c8-4cf3-9271-4ceb748b84b3\\scratch\\build-tools\\android.jar';
  if (fs.existsSync(localCache)) {
    androidJar = localCache;
  }
}

// Java runtime: check local JRE, JAVA_HOME, or PATH
let javaExe = 'java';
const localJre = 'C:\\Users\\mariu\\.gemini\\antigravity\\brain\\22629168-71c8-4cf3-9271-4ceb748b84b3\\scratch\\build-tools\\jre\\bin\\java.exe';
if (fs.existsSync(localJre)) {
  javaExe = localJre;
} else if (process.env.JAVA_HOME) {
  javaExe = path.join(process.env.JAVA_HOME, 'bin', 'java.exe');
}

// ADB: check PATH or local platform-tools
let adb = 'adb';
const localAdb = 'C:\\Users\\mariu\\.gemini\\antigravity\\scratch\\platform-tools\\adb.exe';
if (fs.existsSync(localAdb)) {
  adb = localAdb;
}

const target = process.env.ADB_TARGET || '192.168.1.41:36687';

console.log('=== Fumé Emerald Build System ===');
console.log('Project dir:', projectDir);
console.log('Tools dir:  ', toolsDir);

// 1. Compile resources
console.log('[1/4] Compiling resources with AAPT2...');
const compiledDir = path.join(projectDir, 'compiled');
if (!fs.existsSync(compiledDir)) fs.mkdirSync(compiledDir, { recursive: true });
const resZip = path.join(compiledDir, 'resources.zip');
if (fs.existsSync(resZip)) fs.unlinkSync(resZip);

execFileSync(aapt2, ['compile', '--dir', path.join(projectDir, 'res'), '-o', resZip]);

// 2. Link APK
console.log('[2/4] Linking APK with AAPT2...');
const unsignedApk = path.join(distDir, 'fume-emerald-unsigned.apk');
if (fs.existsSync(unsignedApk)) fs.unlinkSync(unsignedApk);

execFileSync(aapt2, [
  'link',
  '-I', androidJar,
  '--manifest', path.join(projectDir, 'AndroidManifest.xml'),
  '-o', unsignedApk,
  resZip,
  '--auto-add-overlay'
]);

// 3. Sign APK
console.log('[3/4] Signing APK with uber-apk-signer...');
execFileSync(javaExe, ['-jar', signerJar, '--apks', unsignedApk, '--out', distDir]);

const manifestContent = fs.readFileSync(path.join(projectDir, 'AndroidManifest.xml'), 'utf8');
const versionMatch = manifestContent.match(/android:versionName="([^"]+)"/);
const versionName = versionMatch ? versionMatch[1] : 'latest';
const versionClean = versionName.replace('.', '');

const generatedSignedApk = path.join(distDir, 'fume-emerald-aligned-debugSigned.apk');
const generatedSignedApk2 = path.join(distDir, 'fume-emerald-unsigned-aligned-debugSigned.apk');
const finalApk = path.join(distDir, `fume-emerald-v${versionName}.apk`);

const actualSigned = fs.existsSync(generatedSignedApk) ? generatedSignedApk : (fs.existsSync(generatedSignedApk2) ? generatedSignedApk2 : null);
if (actualSigned) {
  if (fs.existsSync(finalApk)) fs.unlinkSync(finalApk);
  fs.copyFileSync(actualSigned, finalApk);
  fs.unlinkSync(actualSigned);
  const idsigSrc = actualSigned + '.idsig';
  const idsigDest = finalApk + '.idsig';
  if (fs.existsSync(idsigSrc)) {
    if (fs.existsSync(idsigDest)) fs.unlinkSync(idsigDest);
    fs.copyFileSync(idsigSrc, idsigDest);
    fs.unlinkSync(idsigSrc);
  }
}

console.log('Final APK built at:', finalApk);

// 4. Deploy to watch if requested
const shouldDeploy = process.argv.includes('--deploy') || process.argv.includes('-d');
if (shouldDeploy) {
  console.log('[4/4] Deploying to watch at', target, '...');
  try {
    execFileSync(adb, ['connect', target]);
  } catch (e) {
    console.log('Connect notice:', e.message);
  }
  const installRes = execFileSync(adb, ['-s', target, 'install', '-r', '-d', finalApk]).toString();
  console.log('Install Result:', installRes.trim());

  // Reload watch face
  try {
    execFileSync(adb, [
      '-s', target, 'shell', 'am', 'broadcast',
      '-a', 'com.google.android.wearable.action.SET_WATCH_FACE',
      '--es', 'component', 'com.luxury.fume.emerald/com.luxury.fume.emerald.WatchFaceService'
    ]);
  } catch (e) {
    console.log('Reload broadcast notice:', e.message);
  }

  // Wake display
  try {
    execFileSync(adb, ['-s', target, 'shell', 'input', 'keyevent', '224']);
    execFileSync(adb, ['-s', target, 'shell', 'input', 'keyevent', '3']);
  } catch (e) {
    console.log('Keyevent notice:', e.message);
  }

  // Live screenshot
  setTimeout(() => {
    try {
      const cap = execFileSync(adb, ['-s', target, 'exec-out', 'screencap', '-p']);
      const capPath = path.join(distDir, `watch_live_capture_v${versionClean}.png`);
      fs.writeFileSync(capPath, cap);
      // Also update latest preview
      fs.writeFileSync(path.join(distDir, 'watch_live_capture.png'), cap);
      console.log('Live hardware screen capture saved to:', capPath);
    } catch (err) {
      console.error('Screenshot notice:', err.message);
    }
  }, 2000);
} else {
  console.log('Skipping deploy (use --deploy to install directly on watch).');
}
