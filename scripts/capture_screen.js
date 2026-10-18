const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const adb = 'C:\\Users\\mariu\\.gemini\\antigravity\\scratch\\platform-tools\\adb.exe';
const target = process.argv[2] || 'adb-RFAW313T69Z-XNK0Yx._adb-tls-connect._tcp';
const outPath = process.argv[3] || path.join(__dirname, '..', 'dist', 'galaxy_watch_live.png');

try {
  console.log(`Connecting to ${target}...`);
  try { execFileSync(adb, ['connect', target]); } catch (e) {}
  console.log(`Capturing screen from ${target}...`);
  const buf = execFileSync(adb, ['-s', target, 'exec-out', 'screencap', '-p'], { maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync(outPath, buf);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  console.log(`Captured ${buf.length} bytes -> ${outPath} (${w}x${h} px)`);
} catch (e) {
  console.error('Capture error:', e.message);
  process.exit(1);
}
