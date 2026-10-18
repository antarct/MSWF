const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = 'C:\\Users\\mariu\\.gemini\\antigravity\\brain\\22629168-71c8-4cf3-9271-4ceb748b84b3';

const img1 = fs.readFileSync(path.join(artifactDir, 'galaxy_watch_bespoke_v1.png')).toString('base64');
const img2 = fs.readFileSync(path.join(artifactDir, 'galaxy_watch_bare_hands.png')).toString('base64');
const img3 = fs.readFileSync(path.join(artifactDir, 'galaxy_watch_discreet_cap.png')).toString('base64');
const img4 = fs.readFileSync(path.join(artifactDir, 'galaxy_watch_minimal_10px.png')).toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    background: #090d16;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  h1 {
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 6px;
    color: #f8fafc;
  }
  p.subtitle {
    font-size: 14px;
    color: #94a3b8;
    margin-bottom: 24px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 280px);
    gap: 20px;
  }
  .card {
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .card.highlight {
    border-color: #3b82f6;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
  }
  .badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    border-radius: 9999px;
    margin-bottom: 12px;
  }
  .badge-orig { background: #374151; color: #9ca3af; }
  .badge-bare { background: #1e293b; color: #38bdf8; }
  .badge-discreet { background: #1e3a5f; color: #60a5fa; }
  .badge-minimal { background: #064e3b; color: #34d399; }

  .card-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
    text-align: center;
  }
  .card-desc {
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    height: 36px;
    margin-bottom: 14px;
  }
  .full-dial {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    margin-bottom: 16px;
  }
  .zoom-label {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }
  .zoom-box {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 2px solid #334155;
    overflow: hidden;
    position: relative;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
  }
  .zoom-img {
    position: absolute;
    width: 630px;
    height: 630px;
    left: -245px;
    top: -245px;
    image-rendering: -webkit-optimize-contrast;
  }
</style>
</head>
<body>
  <h1>Porównanie Wykończenia Osi Wskazówek (Pinion Cap)</h1>
  <p class="subtitle">Live Hardware Captures z Samsung Galaxy Watch 5 (450x450 AMOLED)</p>

  <div class="grid">
    <!-- Opcja A -->
    <div class="card">
      <span class="badge badge-orig">Opcja A (Dotychczasowa)</span>
      <div class="card-title">3-Warstwowy Kołpak (28px)</div>
      <div class="card-desc">Czarna obwódka + biały ring + pomarańczowy środek</div>
      <img class="full-dial" src="data:image/png;base64,${img1}">
      <div class="zoom-label">Zoom Centrum Wskazówek (300%)</div>
      <div class="zoom-box">
        <img class="zoom-img" src="data:image/png;base64,${img1}">
      </div>
    </div>

    <!-- Opcja B -->
    <div class="card">
      <span class="badge badge-bare">Opcja B (Surowe)</span>
      <div class="card-title">Same Wskazówki (0px)</div>
      <div class="card-desc">Brak kołpaka — widoczne nakładanie się osi wskazówek</div>
      <img class="full-dial" src="data:image/png;base64,${img2}">
      <div class="zoom-label">Zoom Centrum Wskazówek (300%)</div>
      <div class="zoom-box">
        <img class="zoom-img" src="data:image/png;base64,${img2}">
      </div>
    </div>

    <!-- Opcja C -->
    <div class="card">
      <span class="badge badge-discreet">Opcja C (Stal Szlachetna)</span>
      <div class="card-title">Dyskretny Kołpak (14px)</div>
      <div class="card-desc">Rodium/stal z ciemną obwódką i mikro-otworem osi</div>
      <img class="full-dial" src="data:image/png;base64,${img3}">
      <div class="zoom-label">Zoom Centrum Wskazówek (300%)</div>
      <div class="zoom-box">
        <img class="zoom-img" src="data:image/png;base64,${img3}">
      </div>
    </div>

    <!-- Opcja D -->
    <div class="card highlight">
      <span class="badge badge-minimal">Opcja D (Minimalizm)</span>
      <div class="card-title">Mikronit Zegarmistrzowski (10px)</div>
      <div class="card-desc">Czysty, subtelny stalowy nit dopasowany do wskazówek</div>
      <img class="full-dial" src="data:image/png;base64,${img4}">
      <div class="zoom-label">Zoom Centrum Wskazówek (300%)</div>
      <div class="zoom-box">
        <img class="zoom-img" src="data:image/png;base64,${img4}">
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('dist/pinion_comparison.html', html);
console.log('HTML written to dist/pinion_comparison.html');

async function renderScreenshot() {
  const edge = spawn(edgeExe, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--hide-scrollbars'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  const version = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9225/json/version', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      const handler = (evt) => {
        const res = JSON.parse(evt.data);
        if (res.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(res.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const fileUrl = 'file:///' + path.resolve('dist/pinion_comparison.html').replace(/\\/g, '/');
  const { targetId } = await send('Target.createTarget', { url: fileUrl });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      const handler = (evt) => {
        const res = JSON.parse(evt.data);
        if (res.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(res.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1220,
    height: 760,
    deviceScaleFactor: 1,
    mobile: false
  });

  await new Promise(r => setTimeout(r, 1000));

  const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  fs.writeFileSync('dist/pinion_comparison.png', buf);
  fs.writeFileSync(path.join(artifactDir, 'pinion_comparison.png'), buf);
  console.log('Saved comparison screenshot to dist/pinion_comparison.png and artifactDir');

  await send('Browser.close');
  edge.kill();
  process.exit(0);
}

renderScreenshot().catch(e => {
  console.error(e);
  process.exit(1);
});
