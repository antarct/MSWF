const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outPath = path.join(__dirname, '..', 'wff-project', 'res', 'drawable-nodpi', 'subdial_clean.png');

async function run() {
  const edge = spawn(edgeExe, [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--hide-scrollbars'
  ]);
  await new Promise(r => setTimeout(r, 1200));

  const version = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9226/json/version', res => {
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

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
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

  await sendSession('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await sendSession('Emulation.setDeviceMetricsOverride', { width: 128, height: 128, deviceScaleFactor: 1, mobile: false });

  let slits = '';
  for (let s = 0; s < 24; s++) {
    const angleDeg = s * 15;
    const rad = (angleDeg - 90) * Math.PI / 180;
    const x1 = (64 + 36 * 1.28 * Math.cos(rad)).toFixed(2);
    const y1 = (64 + 36 * 1.28 * Math.sin(rad)).toFixed(2);
    const x2 = (64 + 48 * 1.28 * Math.cos(rad)).toFixed(2);
    const y2 = (64 + 48 * 1.28 * Math.sin(rad)).toFixed(2);
    slits += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000000" stroke-width="3.8" stroke-linecap="square" />`;
  }

  const svg = `
    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      ${slits}
      <circle cx="64" cy="64" r="46.72" fill="#050806" stroke="#1e293b" stroke-width="1.2" />
    </svg>
  `;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;">${svg}</body></html>`;
  await sendSession('Page.enable');
  await sendSession('Page.setDocumentContent', { frameId: targetId, html });
  await new Promise(r => setTimeout(r, 200));

  const shot = await sendSession('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Successfully generated subdial_clean.png:', fs.statSync(outPath).size, 'bytes');

  ws.close();
  edge.kill();
}

run().catch(console.error);
