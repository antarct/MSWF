const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

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
  const androidJar = path.join(toolsDir, 'android.jar');

  if (!fs.existsSync(androidJar)) {
    console.log('Finding android.jar on Maven...');
    const html = await fetchText('https://repo1.maven.org/maven2/org/robolectric/android-all/');
    const versions = html.match(/href="([0-9\.\-_A-Za-z]+)\/"/g).map(s => s.replace(/href="|\/"/g, ''));
    const targetVer = versions.filter(v => v.startsWith('14-') || v.startsWith('13-')).pop();
    console.log('Selected version:', targetVer);
    
    const jarUrl = `https://repo1.maven.org/maven2/org/robolectric/android-all/${targetVer}/android-all-${targetVer}.jar`;
    console.log('Downloading android.jar from:', jarUrl);
    await download(jarUrl, androidJar);
    console.log('android.jar downloaded, size:', fs.statSync(androidJar).size);
  } else {
    console.log('android.jar already exists!');
  }
}

main().catch(console.error);
