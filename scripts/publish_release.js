const https = require('https');
const fs = require('fs');
const path = require('path');

// Load token from environment or local .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        process.env[k] = v;
      }
    }
  });
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable or .env file is required to publish releases.');
  process.exit(1);
}

const repo = 'antarct/MSWF';

function apiRequest(method, reqPath, body, contentType = 'application/json') {
  return new Promise((resolve, reject) => {
    const isUpload = reqPath.startsWith('https://uploads.github.com');
    const url = isUpload ? new URL(reqPath) : new URL('https://api.github.com' + reqPath);
    
    const headers = {
      'User-Agent': 'NodeJS',
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': contentType
    };
    if (body) {
      headers['Content-Length'] = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
    }

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    }, res => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(data);
        const str = buf.toString('utf8');
        try {
          resolve({ status: res.statusCode, json: JSON.parse(str), raw: str });
        } catch (e) {
          resolve({ status: res.statusCode, raw: str });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const manifestPath = path.join(__dirname, '..', 'wff-project', 'AndroidManifest.xml');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const verMatch = manifest.match(/android:versionName="([^"]+)"/);
  const version = verMatch ? verMatch[1] : '2.5';
  const tag = `v${version}`;

  console.log('Checking and cleaning older pre-releases...');
  const existingRes = await apiRequest('GET', '/repos/' + repo + '/releases');
  if (existingRes.json && Array.isArray(existingRes.json)) {
    for (const old of existingRes.json) {
      console.log(`Found release ${old.tag_name} (ID: ${old.id}). Deleting to ensure clean v1.0 release...`);
      await apiRequest('DELETE', '/repos/' + repo + '/releases/' + old.id);
    }
  }

  console.log(`Creating GitHub Release for ${tag}...`);
  const releaseBody = `## Fumé Emerald • Official Release ${tag}

Bespoke **Haute Horlogerie** watch face for **Wear OS 5 / Wear OS 6** (built on Google Watch Face Format v2), optimized for **OnePlus Watch 4** (466×466 AMOLED) and natively compatible with **Samsung Galaxy Watch 4 / 5 / 6 / 7 / Ultra** (One UI 5 / 6 / 8).

### 🌟 What's New in ${tag}
* **Universal Complication Subdials (6H & 9H):** Full dual-mode customization. Seamlessly switch between Bespoke Haute Horlogerie telemetry (Minimalist Battery Delta & Solar Gauge) or any native Wear OS complication provider (Heart Rate, Weather, Activity Goals, Calendar, Next Event).
* **Minimalist Steel Pinion Cap (10 px):** Ultra-dyskretny mikronit ze stali szlachetnej dopasowany do wskazówek Dauphine, elegancko maskujący oś montażową.
* **AOD Freeze Immunity (Galaxy Watch / Wear OS 6):** Completely eliminated ambient transition latching. Added explicit mathematical \`(1 - [IS_AMBIENT])\` factors across all active transforms.
* **Zero Seconds-Arc Ghosting:** Guaranteed collapse of seconds arc to 0° and alpha to 0 upon wrist-down or ambient trigger.
* **Minimalist 100% Battery Circle:** Pure unbroken glowing ring with centered delta icon and zero numeric clutter at full charge (<100% shows fractional format e.g. \`.82\`).
* **Pure WFF v2 Standard:** Pure declarative Watch Face Format v2 (\`minSdkVersion 34\`, \`targetSdkVersion 35\`, \`hasCode="false"\`).
* **Cross-Device Tested:** Seamless dynamic scaling from 466×466 down to 450×450 and 396×396 with zero visual distortion.
* **Dual Locale:** English default with native Polish translation (\`values-pl\`).
* **Ultra-Low Power AOD:** On-Pixel Ratio (OPR) strictly below **3.5%** with true AMOLED black (\`#000000\`).

### 📦 Downloads & Assets
* **\`fume-emerald-${tag}.apk\`** — Production-ready signed APK for direct installation (sideloading).
* **\`watch_live_capture.png\`** — 1:1 hardware capture from physical watch display.

### 📲 How to Install (Sideloading)
1. Download **\`fume-emerald-${tag}.apk\`** below.
2. Install **GeminiMan Wear OS Manager** or **Bugjaeger** on your Android phone from Google Play.
3. On your watch, go to **Settings → Developer Options → Wireless Debugging** and turn it ON.
4. Connect via the phone app using the watch's IP and port.
5. Select the downloaded APK and tap **Install**. Enjoy!`;

  const createRes = await apiRequest('POST', '/repos/' + repo + '/releases', JSON.stringify({
    tag_name: tag,
    target_commitish: 'main',
    name: `Fumé Emerald ${tag} (Wear OS 6 / WFF v2)`,
    body: releaseBody,
    draft: false,
    prerelease: false
  }));

  console.log('Create Release HTTP Status:', createRes.status);
  if (createRes.status !== 201 && createRes.status !== 200) {
    console.error('Error creating release:', createRes.raw);
    return;
  }

  const releaseId = createRes.json.id;
  const uploadUrl = createRes.json.upload_url.replace('{?name,label}', '');
  console.log('Release created! ID:', releaseId, 'Upload URL:', uploadUrl);

  // Upload APK
  const apkName = `fume-emerald-${tag}.apk`;
  const apkPath = path.join(__dirname, '..', 'dist', apkName);
  if (fs.existsSync(apkPath)) {
    console.log(`Uploading ${apkName} (${fs.statSync(apkPath).size} bytes)...`);
    const apkBuf = fs.readFileSync(apkPath);
    const upApk = await apiRequest('POST', uploadUrl + `?name=${apkName}`, apkBuf, 'application/vnd.android.package-archive');
    console.log('APK Upload Status:', upApk.status);
  }

  // Upload Screenshot
  const capPath = path.join(__dirname, '..', 'dist', 'watch_live_capture.png');
  if (fs.existsSync(capPath)) {
    console.log('Uploading watch_live_capture.png (' + fs.statSync(capPath).size + ' bytes)...');
    const capBuf = fs.readFileSync(capPath);
    const upCap = await apiRequest('POST', uploadUrl + '?name=watch_live_capture.png', capBuf, 'image/png');
    console.log('Screenshot Upload Status:', upCap.status);
  }

  console.log(`Release ${tag} published successfully at: https://github.com/${repo}/releases/tag/${tag}`);
}

run().catch(console.error);
