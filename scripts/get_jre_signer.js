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
  const jreDir = path.join(toolsDir, 'jre');
  const javaExe = path.join(jreDir, 'bin', 'java.exe');

  if (!fs.existsSync(javaExe)) {
    console.log('Downloading Temurin JRE 21...');
    const jreZip = path.join(toolsDir, 'jre.zip');
    await download('https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jre_x64_windows_hotspot_21.0.12.1_1.zip', jreZip);
    console.log('Extracting JRE...');
    execSync(`powershell -Command "Expand-Archive -Path '${jreZip}' -DestinationPath '${toolsDir}' -Force"`);
    if (fs.existsSync(jreZip)) fs.unlinkSync(jreZip);
    
    // Find extracted folder (e.g. jdk-21.0.12.1+1-jre) and rename to jre
    const entries = fs.readdirSync(toolsDir);
    const jdkFolder = entries.find(e => e.includes('jre') && e !== 'jre' && fs.statSync(path.join(toolsDir, e)).isDirectory());
    if (jdkFolder) {
      fs.renameSync(path.join(toolsDir, jdkFolder), jreDir);
    }
  }

  const ver = execSync(`"${javaExe}" -version 2>&1`).toString().trim();
  console.log('Java ready:\n', ver);

  // Also download uber-apk-signer (standalone APK signer with auto-debug key and v1/v2/v3 support!)
  const signerJar = path.join(toolsDir, 'uber-apk-signer.jar');
  if (!fs.existsSync(signerJar)) {
    console.log('Downloading uber-apk-signer...');
    await download('https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar', signerJar);
    console.log('uber-apk-signer downloaded!');
  }
}

main().catch(console.error);
