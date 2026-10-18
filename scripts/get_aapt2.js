const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const toolsDir = path.join(__dirname, 'build-tools');
  if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });

  const aapt2Exe = path.join(toolsDir, 'aapt2.exe');
  if (!fs.existsSync(aapt2Exe)) {
    console.log('Downloading aapt2...');
    const aapt2Jar = path.join(toolsDir, 'aapt2.zip');
    await download('https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/8.5.2-11315950/aapt2-8.5.2-11315950-windows.jar', aapt2Jar);
    console.log('Extracting aapt2...');
    execSync(`powershell -Command "Expand-Archive -Path '${aapt2Jar}' -DestinationPath '${toolsDir}' -Force"`);
    if (fs.existsSync(aapt2Jar)) fs.unlinkSync(aapt2Jar);
  }

  const ver = execSync(`"${aapt2Exe}" version`).toString().trim();
  console.log('aapt2 ready:', ver);
}

main().catch(console.error);
