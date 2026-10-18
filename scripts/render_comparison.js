const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const scratchDir = 'C:\\Users\\mariu\\.gemini\\antigravity\\brain\\22629168-71c8-4cf3-9271-4ceb748b84b3\\scratch';

// We will render an HTML comparison page that renders:
// 1. Concept Preview 1:1 Dial (exactly as in watchface_concept_preview.html)
// 2. WFF Modular Dial (the exact assets and layers that will be compiled into APK)
// Both configured at:
// - Time: 16:25:28 (Hour 16, Min 25, Sec 28)
// - Date: SOB 17
// - Battery: 28%
// - Daytime progress: 01:45
// - Seconds track: 28 seconds illuminated

async function run() {
  console.log('Starting Edge headless for local preview rendering...');
  const edge = spawn(edgeExe, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--hide-scrollbars'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  const version = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9223/json/version', res => {
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

  await sendSession('Emulation.setDefaultBackgroundColorOverride', {
    color: { r: 10, g: 15, b: 12, a: 255 }
  });

  // Read Montserrat & Cinzel fonts as base64 to ensure 100% font rendering fidelity
  const montserratRegularB64 = fs.readFileSync(path.join(scratchDir, 'montserrat.ttf')).toString('base64');
  const montserratBoldB64 = fs.readFileSync(path.join(scratchDir, 'montserrat_bold.ttf')).toString('base64');
  const cinzelB64 = fs.readFileSync(path.join(scratchDir, 'cinzel.ttf')).toString('base64');

  // Generate the comparison HTML
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'Montserrat';
      src: url('data:font/ttf;base64,${montserratRegularB64}') format('truetype');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Montserrat';
      src: url('data:font/ttf;base64,${montserratBoldB64}') format('truetype');
      font-weight: 700;
    }
    @font-face {
      font-family: 'Montserrat';
      src: url('data:font/ttf;base64,${montserratBoldB64}') format('truetype');
      font-weight: 600;
    }
    @font-face {
      font-family: 'Cinzel';
      src: url('data:font/ttf;base64,${cinzelB64}') format('truetype');
      font-weight: 700;
    }
    body {
      margin: 0;
      padding: 30px;
      background: #080d0a;
      color: #e2e8f0;
      font-family: 'Montserrat', sans-serif;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 25px;
    }
    .header {
      text-align: center;
    }
    .header h1 {
      font-size: 22px;
      margin: 0 0 6px 0;
      color: #10b981;
      letter-spacing: 1px;
    }
    .header p {
      font-size: 13px;
      margin: 0;
      color: #94a3b8;
    }
    .comparison-grid {
      display: flex;
      gap: 40px;
      justify-content: center;
      align-items: flex-start;
    }
    .card {
      background: #0f1712;
      border: 1px solid #1e2922;
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .card-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 15px;
      color: #38bdf8;
      letter-spacing: 0.5px;
    }
    .dial-frame {
      width: 466px;
      height: 466px;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 0 30px rgba(0,0,0,0.9), inset 0 0 10px rgba(0,0,0,0.8);
      background: #000;
      position: relative;
    }
    .legend {
      margin-top: 15px;
      font-size: 12px;
      color: #64748b;
      max-width: 440px;
      text-align: center;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FUMÉ EMERALD • PORÓWNANIE 1:1 W LOKALNYM SILNIKU</h1>
      <p>Test stanu: Czas 16:25:28 • Data: SOB 17 • Bateria: 28% • Sekundnik obwodowy: 28s</p>
    </div>

    <div class="comparison-grid">
      <!-- 1. ACTIVE MODE -->
      <div class="card">
        <div class="card-title">1. TRYB AKTYWNY (SZMARAGD FUMÉ &bull; 100% BLASK)</div>
        <div class="dial-frame" id="frame-active">
          ${generateDialSvg({ isAod: false, sec: 28, batteryPct: 28, timeStr: '16:25', dayStr: 'SOB', dateNum: '17' })}
        </div>
        <div class="legend">
          Pełny szmaragdowy gradient fumé, dynamiczny sekundnik obwodowy (28s), dynamiczny łuk baterii (28%), słońce 9H (01:45), data SOB 17.
        </div>
      </div>

      <!-- 2. AOD MODE -->
      <div class="card">
        <div class="card-title">2. TRYB AOD (GŁĘBOKA CZERŃ AMOLED)</div>
        <div class="dial-frame" id="frame-aod">
          ${generateDialSvg({ isAod: true, sec: 0, batteryPct: 28, timeStr: '16:25', dayStr: 'SOB', dateNum: '17' })}
        </div>
        <div class="legend">
          Czysta czerń 100% AMOLED (zero gradientu, zero sub-tarcz, zero sekundnika). Widoczne tylko wskazówki 3D, indeksy godzinowe, monogram MS, data i czas.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  await sendSession('Page.enable');
  await sendSession('Page.setDocumentContent', { frameId: targetId, html });
  await new Promise(r => setTimeout(r, 600));

  // Set viewport to capture full grid
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });

  const { data } = await sendSession('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true
  });

  const outBuf = Buffer.from(data, 'base64');
  const outPath = path.join(scratchDir, 'local_comparison_v19.png');
  fs.writeFileSync(outPath, outBuf);
  console.log('Saved comparison render to:', outPath, 'Bytes:', outBuf.length);

  ws.close();
  edge.kill();
}

function generateDialSvg({ isAod, sec, batteryPct, timeStr, dayStr, dateNum }) {
  // Common geometry
  const cx = 233;
  const cy = 233;

  // 60 Swiss Ticks calculation (Only in active mode)
  let ticksSvg = '';
  if (!isAod) {
    for (let i = 0; i < 60; i++) {
      const angle = i * 6;
      const rad = (angle - 90) * Math.PI / 180;
      const isHour = (i % 5 === 0);
      const r1 = isHour ? 223 : 227;
      const r2 = 237;
      const x1 = cx + r1 * Math.cos(rad);
      const y1 = cy + r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad);
      const y2 = cy + r2 * Math.sin(rad);

      const isLit = (i <= sec);
      const stroke = isLit ? '#ffffff' : '#16231a';
      const opacity = isLit ? (i === sec ? '1' : '0.90') : '0.35';
      const strokeWidth = isHour ? (isLit ? '2.4' : '2.0') : (isLit ? (i === sec ? '2.0' : '1.4') : '1.2');

      ticksSvg += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${opacity}" />`;
    }
  }

  // 12 Applied Batons (Visible in both active and AOD!)
  let batonsSvg = '';
  for (let h = 0; h < 12; h++) {
    const angleH = h * 30;
    const isDouble = (h % 3 === 0);
    if (isDouble) {
      batonsSvg += `
        <g transform="translate(${cx}, ${cy}) rotate(${angleH})">
          <rect x="-7" y="-213" width="5" height="26" rx="1.5" fill="url(#handFacetLeft)" stroke="#0f172a" stroke-width="0.8" />
          <rect x="2" y="-213" width="5" height="26" rx="1.5" fill="url(#handFacetLeft)" stroke="#0f172a" stroke-width="0.8" />
        </g>`;
    } else {
      batonsSvg += `
        <g transform="translate(${cx}, ${cy}) rotate(${angleH})">
          <rect x="-3" y="-213" width="6" height="23" rx="1.5" fill="url(#handFacetLeft)" stroke="#0f172a" stroke-width="0.8" />
        </g>`;
    }
  }

  // Subdial 6H & 9H calculations
  const battDashFilled = (batteryPct / 100) * 263.89;
  const battDashRemaining = 263.89;
  const solarDashFilled = 0.72 * 263.89;
  const solarDashRemaining = 263.89;

  let slitsLines = '';
  for (let s = 0; s < 24; s++) {
    const angleDeg = s * 15;
    const rad = angleDeg * Math.PI / 180;
    const x1 = (36 * Math.cos(rad)).toFixed(2);
    const y1 = (36 * Math.sin(rad)).toFixed(2);
    const x2 = (48 * Math.cos(rad)).toFixed(2);
    const y2 = (48 * Math.sin(rad)).toFixed(2);
    slitsLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000000" stroke-width="3.2" stroke-linecap="square" />`;
  }

  // Time Angles
  const minVal = 25 + sec / 60;
  const hourVal = (16 % 12) + minVal / 60;
  const minDeg = minVal * 6;
  const hourDeg = hourVal * 30;

  const handFilter = isAod ? '' : 'filter="url(#handShadow)"';
  const minHandFilter = isAod ? '' : 'filter="url(#minuteHandShadow)"';

  return `
    <svg width="466" height="466" viewBox="0 0 466 466">
      <defs>
        <linearGradient id="handFacetLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
        <linearGradient id="handFacetRight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>

        <linearGradient id="monoFacetLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>

        <radialGradient id="gaugeRingGrad" cx="50%" cy="50%" r="50%">
          <stop offset="65%" stop-color="#f8fafc" />
          <stop offset="90%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </radialGradient>

        <radialGradient id="dialFumeEmerald" cx="233" cy="233" r="233" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#154224" stop-opacity="1" />
          <stop offset="34%" stop-color="#11361e" stop-opacity="0.96" />
          <stop offset="56%" stop-color="#0c2916" stop-opacity="0.85" />
          <stop offset="74%" stop-color="#071b0e" stop-opacity="0.62" />
          <stop offset="86%" stop-color="#030c06" stop-opacity="0.28" />
          <stop offset="94%" stop-color="#000000" stop-opacity="0" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <filter id="handShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.85" />
        </filter>
        <filter id="minuteHandShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="3.4" flood-color="#000000" flood-opacity="0.9" />
        </filter>
      </defs>

      <!-- 1. Deep Black Base -->
      <circle cx="${cx}" cy="${cy}" r="233" fill="#000000" />

      <!-- 2. Centered Fumé Gradient Bloom (Only in active mode!) -->
      ${isAod ? '' : `<circle cx="${cx}" cy="${cy}" r="233" fill="url(#dialFumeEmerald)" />`}

      <!-- 3. Dynamic Swiss Super-LumiNova Seconds Track (Only in active mode!) -->
      ${isAod ? '' : `<g id="swiss-seconds-track">${ticksSvg}</g>`}

      <!-- 4. Applied Batons -->
      ${batonsSvg}

      <!-- ================= 4-AXIAL COMPLICATIONS (SCALE 1.28) ================= -->

      <!-- 12H: Digital Time & MS Logo -->
      <g transform="translate(${cx}, ${cy - 110}) scale(1.28)">
        <text x="0" y="-21.2" text-anchor="middle" dominant-baseline="central" fill="#030805" font-size="29" font-weight="700" font-family="'Montserrat', sans-serif" letter-spacing="1.2" opacity="0.8">${timeStr}</text>
        <text x="0" y="-22" text-anchor="middle" dominant-baseline="central" fill="#ff6b00" font-size="29" font-weight="700" font-family="'Montserrat', sans-serif" letter-spacing="1.2">${timeStr}</text>
        
        <g transform="translate(0, 16)">
          <text x="0.8" y="0.8" text-anchor="middle" dominant-baseline="central" fill="#030805" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4" opacity="0.8">MS</text>
          <text x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="url(#monoFacetLeft)" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4">MS</text>
        </g>
      </g>

      <!-- 9H: Solar Subdial (Only in active mode!) -->
      ${isAod ? '' : `
      <g transform="translate(${cx - 108}, ${cy}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="42" fill="none" stroke="url(#gaugeRingGrad)" stroke-width="10" stroke-dasharray="${solarDashFilled.toFixed(1)} ${solarDashRemaining.toFixed(1)}" transform="rotate(-90)" />
        <circle cx="0" cy="0" r="47.5" fill="none" stroke="#334155" stroke-width="0.8" />
        
        <g id="solar-slits">
          ${slitsLines}
        </g>
        
        <circle cx="0" cy="0" r="36.5" fill="#050806" stroke="#1e293b" stroke-width="1.2" />
        
        <g transform="translate(0, -11)">
          <line x1="-12" y1="2" x2="12" y2="2" stroke="#94a3b8" stroke-width="1.2" />
          <path d="M-5,1 A5,5 0 0,1 5,1 Z" fill="#ff6b00" />
          <path d="M0,4 L0,7.5 M-2,5.5 L0,8 L2,5.5" stroke="#ff6b00" stroke-width="1.2" fill="none" stroke-linecap="round" />
        </g>

        <text x="0" y="13" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="16.5" font-weight="700" font-family="'Montserrat', sans-serif" letter-spacing="0.4">01:45</text>
      </g>`}

      <!-- 6H: Battery Subdial (Only in active mode!) -->
      ${isAod ? '' : `
      <g transform="translate(${cx}, ${cy + 110}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="42" fill="none" stroke="url(#gaugeRingGrad)" stroke-width="10" stroke-dasharray="${battDashFilled.toFixed(1)} ${battDashRemaining.toFixed(1)}" transform="rotate(-90)" />
        <circle cx="0" cy="0" r="47.5" fill="none" stroke="#334155" stroke-width="0.8" />
        
        <g id="battery-slits">
          ${slitsLines}
        </g>
        
        <circle cx="0" cy="0" r="36.5" fill="#050806" stroke="#1e293b" stroke-width="1.2" />
        
        <g transform="translate(0, -11)">
          <polygon points="0,5.5 -5.5,-4.5 5.5,-4.5" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" />
          <circle cx="0" cy="-0.5" r="1.4" fill="#ff6b00" />
        </g>

        <g transform="translate(0, 13)">
          <circle cx="-13.2" cy="4.5" r="1.5" fill="#ffffff" />
          <text x="-1.0" y="0" text-anchor="end" dominant-baseline="central" fill="#ffffff" font-size="16.5" font-weight="700" font-family="'Montserrat', sans-serif">2</text>
          <text x="1.0" y="0" text-anchor="start" dominant-baseline="central" fill="#ffffff" font-size="16.5" font-weight="700" font-family="'Montserrat', sans-serif">8</text>
        </g>
      </g>`}

      <!-- 3H: Date Window (Visible in both active and AOD!) -->
      <g transform="translate(${cx + 108}, ${cy}) scale(1.28)">
        <text x="-4" y="8.3" text-anchor="end" fill="#030704" font-size="22" font-weight="600" font-family="'Montserrat', sans-serif" letter-spacing="1">${dayStr}</text>
        <text x="4" y="8.3" text-anchor="start" fill="#030704" font-size="29" font-weight="700" font-family="'Montserrat', sans-serif">${dateNum}</text>
        
        <text x="-4" y="7.5" text-anchor="end" fill="#94a3b8" font-size="22" font-weight="600" font-family="'Montserrat', sans-serif" letter-spacing="1">${dayStr}</text>
        <text x="4" y="7.5" text-anchor="start" fill="#ffffff" font-size="29" font-weight="700" font-family="'Montserrat', sans-serif">${dateNum}</text>
      </g>

      <!-- ================= 3D HANDS ================= -->
      <g transform="translate(${cx}, ${cy}) rotate(${hourDeg})" ${handFilter}>
        <polygon points="0,22 -11,0 -2,-120 0,-135" fill="url(#handFacetLeft)" />
        <polygon points="0,22 11,0 2,-120 0,-135" fill="url(#handFacetRight)" />
        <line x1="0" y1="-25" x2="0" y2="-132" stroke="#ffffff" stroke-width="0.8" opacity="0.6" />
      </g>

      <g transform="translate(${cx}, ${cy}) rotate(${minDeg})" ${minHandFilter}>
        <polygon points="0,28 -9,0 -1.5,-180 0,-195" fill="url(#handFacetLeft)" />
        <polygon points="0,28 9,0 1.5,-180 0,-195" fill="url(#handFacetRight)" />
        <line x1="0" y1="-32" x2="0" y2="-192" stroke="#ffffff" stroke-width="0.8" opacity="0.6" />
      </g>

      <!-- Center Pinion Cap Assembly -->
      <circle cx="${cx}" cy="${cy}" r="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
      <circle cx="${cx}" cy="${cy}" r="9" fill="url(#monoFacetLeft)" stroke="#020617" stroke-width="0.8" />
      <circle cx="${cx}" cy="${cy}" r="4.5" fill="#ff6b00" />
      <circle cx="${cx}" cy="${cy}" r="1.5" fill="#ffffff" />
    </svg>`;
}

run().catch(console.error);
