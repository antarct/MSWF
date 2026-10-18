const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const repoRoot = path.resolve(__dirname, '..');
const projectDir = path.join(repoRoot, 'wff-project');
const resDir = path.join(projectDir, 'res');
const drawableNodpi = path.join(resDir, 'drawable-nodpi');
const drawableDir = path.join(resDir, 'drawable');

if (!fs.existsSync(drawableNodpi)) fs.mkdirSync(drawableNodpi, { recursive: true });

async function generateAll() {
  console.log('Launching Edge headless for asset generation...');
  const edge = spawn(edgeExe, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--hide-scrollbars'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  const version = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9224/json/version', res => {
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
    color: { r: 0, g: 0, b: 0, a: 0 }
  });

  const cinzelB64 = fs.readFileSync(path.join(scratchDir, 'cinzel.ttf')).toString('base64');
  const montserratBoldB64 = fs.readFileSync(path.join(scratchDir, 'montserrat_bold.ttf')).toString('base64');

  async function renderSvgToPng(svg, width, height, destFile) {
    const html = `<!DOCTYPE html><html>
      <head>
        <style>
          @font-face {
            font-family: 'Cinzel';
            src: url('data:font/ttf;base64,${cinzelB64}') format('truetype');
            font-weight: 700;
          }
          @font-face {
            font-family: 'Montserrat';
            src: url('data:font/ttf;base64,${montserratBoldB64}') format('truetype');
            font-weight: 700;
          }
          body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
        </style>
      </head>
      <body>${svg}</body>
    </html>`;

    await sendSession('Page.enable');
    await sendSession('Page.setDocumentContent', { frameId: targetId, html });
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(r => setTimeout(r, 200));

    const { data } = await sendSession('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    });
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(destFile, buf);
    console.log('Saved:', path.basename(destFile), width + 'x' + height, buf.length, 'bytes');
  }

  const cx = 233, cy = 233;

  // Batons SVG
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

  // 60 Dark Ticks SVG (Unlit state: #16231a, opacity 0.35)
  let darkTicksSvg = '';
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
    const strokeWidth = isHour ? '2.0' : '1.2';
    darkTicksSvg += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#16231a" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.35" />`;
  }

  // Common DEFS
  const commonDefs = `
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
  `;

  // 1. DIAL BG AOD (Deep AMOLED Black + Batons + MS Monogram)
  const svgAod = `
    <svg width="466" height="466" viewBox="0 0 466 466">
      ${commonDefs}
      <circle cx="233" cy="233" r="233" fill="#000000" />
      ${batonsSvg}
      <g transform="translate(${cx}, ${cy - 110}) scale(1.28)">
        <g transform="translate(0, 16)">
          <text x="0.8" y="0.8" text-anchor="middle" dominant-baseline="central" fill="#030805" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4" opacity="0.8">MS</text>
          <text x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="url(#monoFacetLeft)" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4">MS</text>
        </g>
      </g>
    </svg>
  `;
  await renderSvgToPng(svgAod, 466, 466, path.join(drawableNodpi, 'dial_bg_aod.png'));

  // 2. DIAL BG EMERALD (Emerald Vignette + Batons + MS Monogram + Dark Ticks + Subdial Dark Bases)
  const svgEmerald = `
    <svg width="466" height="466" viewBox="0 0 466 466">
      ${commonDefs}
      <!-- Emerald Fumé Bloom -->
      <circle cx="233" cy="233" r="233" fill="url(#dialFumeEmerald)" />

      <!-- 60 Unlit Dark Swiss Ticks -->
      ${darkTicksSvg}

      <!-- Applied Batons -->
      ${batonsSvg}

      <!-- 12H MS Monogram -->
      <g transform="translate(${cx}, ${cy - 110}) scale(1.28)">
        <g transform="translate(0, 16)">
          <text x="0.8" y="0.8" text-anchor="middle" dominant-baseline="central" fill="#030805" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4" opacity="0.8">MS</text>
          <text x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="url(#monoFacetLeft)" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4">MS</text>
        </g>
      </g>

      <!-- 9H Solar Subdial Dark Empty Track -->
      <g transform="translate(${cx - 108}, ${cy}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="47.5" fill="none" stroke="#334155" stroke-width="0.8" />
      </g>

      <!-- 6H Battery Subdial Dark Empty Track -->
      <g transform="translate(${cx}, ${cy + 110}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="47.5" fill="none" stroke="#334155" stroke-width="0.8" />
      </g>
    </svg>
  `;
  await renderSvgToPng(svgEmerald, 466, 466, path.join(drawableNodpi, 'dial_bg_emerald.png'));

  // 3. DIAL BG ONYX
  const svgOnyx = `
    <svg width="466" height="466" viewBox="0 0 466 466">
      ${commonDefs}
      <circle cx="233" cy="233" r="233" fill="#000000" />
      ${darkTicksSvg}
      ${batonsSvg}
      <g transform="translate(${cx}, ${cy - 110}) scale(1.28)">
        <g transform="translate(0, 16)">
          <text x="0.8" y="0.8" text-anchor="middle" dominant-baseline="central" fill="#030805" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4" opacity="0.8">MS</text>
          <text x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="url(#monoFacetLeft)" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4">MS</text>
        </g>
      </g>
      <g transform="translate(${cx - 108}, ${cy}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="47.5" fill="none" stroke="#334155" stroke-width="0.8" />
      </g>
      <g transform="translate(${cx}, ${cy + 110}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="47.5" fill="none" stroke="#334155" stroke-width="0.8" />
      </g>
    </svg>
  `;
  await renderSvgToPng(svgOnyx, 466, 466, path.join(drawableNodpi, 'dial_bg_onyx.png'));

  // 4. TICKS MASK (466x466): Transparent slits where ticks are, opaque black wedges between ticks!
  // At r from 221 to 238:
  let maskSvg = `<svg width="466" height="466" viewBox="0 0 466 466">
    <defs>
      <mask id="tickHoles">
        <!-- White base: keep everything -->
        <rect x="0" y="0" width="466" height="466" fill="#ffffff" />
        <!-- Black cuts where ticks are -->
  `;
  for (let i = 0; i < 60; i++) {
    const angle = i * 6;
    const rad = (angle - 90) * Math.PI / 180;
    const isHour = (i % 5 === 0);
    const r1 = isHour ? 222 : 226;
    const r2 = 238;
    const x1 = cx + r1 * Math.cos(rad);
    const y1 = cy + r1 * Math.sin(rad);
    const x2 = cx + r2 * Math.cos(rad);
    const y2 = cy + r2 * Math.sin(rad);
    const w = isHour ? '3.0' : '2.0';
    maskSvg += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#000000" stroke-width="${w}" stroke-linecap="round" />`;
  }
  maskSvg += `
      </mask>
    </defs>
    <!-- Black ring covering r=221 to 238, with holes cut where the ticks are -->
    <circle cx="233" cy="233" r="230" fill="none" stroke="#000000" stroke-width="18" mask="url(#tickHoles)" />
  </svg>`;
  await renderSvgToPng(maskSvg, 466, 466, path.join(drawableNodpi, 'ticks_mask.png'));

  // 5. 6H SUBDIAL SLITS & OVERLAY (128x128): Center at (64, 64)
  // Scale factor = 1.28.
  let slits6H = '';
  for (let s = 0; s < 24; s++) {
    const angleDeg = s * 15;
    const rad = (angleDeg - 90) * Math.PI / 180;
    const x1 = (64 + 36 * 1.28 * Math.cos(rad)).toFixed(2);
    const y1 = (64 + 36 * 1.28 * Math.sin(rad)).toFixed(2);
    const x2 = (64 + 48 * 1.28 * Math.cos(rad)).toFixed(2);
    const y2 = (64 + 48 * 1.28 * Math.sin(rad)).toFixed(2);
    slits6H += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000000" stroke-width="3.8" stroke-linecap="square" />`;
  }
  const svgSlits6H = `
    <svg width="128" height="128" viewBox="0 0 128 128">
      <!-- 24 Slits -->
      ${slits6H}
      <!-- Inner dark disc -->
      <circle cx="64" cy="64" r="${(36.5 * 1.28).toFixed(2)}" fill="#050806" stroke="#1e293b" stroke-width="1.2" />
      <!-- Delta Icon -->
      <g transform="translate(64, ${64 - 11 * 1.28}) scale(1.28)">
        <polygon points="0,5.5 -5.5,-4.5 5.5,-4.5" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" />
        <circle cx="0" cy="-0.5" r="1.4" fill="#ff6b00" />
      </g>
    </svg>
  `;
  await renderSvgToPng(svgSlits6H, 128, 128, path.join(drawableNodpi, 'subdial_slits.png'));

  // 6. 9H SUBDIAL SLITS & OVERLAY (128x128): Center at (64, 64)
  const svgSlits9H = `
    <svg width="128" height="128" viewBox="0 0 128 128">
      <!-- 24 Slits -->
      ${slits6H}
      <!-- Inner dark disc -->
      <circle cx="64" cy="64" r="${(36.5 * 1.28).toFixed(2)}" fill="#050806" stroke="#1e293b" stroke-width="1.2" />
      <!-- Sun Horizon Icon -->
      <g transform="translate(64, ${64 - 11 * 1.28}) scale(1.28)">
        <line x1="-12" y1="2" x2="12" y2="2" stroke="#94a3b8" stroke-width="1.2" />
        <path d="M-5,1 A5,5 0 0,1 5,1 Z" fill="#ff6b00" />
        <path d="M0,4 L0,7.5 M-2,5.5 L0,8 L2,5.5" stroke="#ff6b00" stroke-width="1.2" fill="none" stroke-linecap="round" />
      </g>
    </svg>
  `;
  await renderSvgToPng(svgSlits9H, 128, 128, path.join(drawableNodpi, 'subdial_solar_slits.png'));

  // 7. 3D HANDS (Genuine 32-bit RGBA with smooth shadows)
  // Hour hand: 24x160, pivot at (12, 140)
  const svgHour = `
    <svg width="24" height="160" viewBox="0 0 24 160">
      ${commonDefs}
      <g transform="translate(12, 140)" filter="url(#handShadow)">
        <polygon points="0,20 -11,0 -2,-120 0,-135" fill="url(#handFacetLeft)" />
        <polygon points="0,20 11,0 2,-120 0,-135" fill="url(#handFacetRight)" />
        <line x1="0" y1="-25" x2="0" y2="-132" stroke="#ffffff" stroke-width="0.8" opacity="0.6" />
      </g>
    </svg>
  `;
  await renderSvgToPng(svgHour, 24, 160, path.join(drawableNodpi, 'hand_hour.png'));

  // Minute hand: 20x215, pivot at (10, 193)
  const svgMin = `
    <svg width="20" height="215" viewBox="0 0 20 215">
      ${commonDefs}
      <g transform="translate(10, 193)" filter="url(#minuteHandShadow)">
        <polygon points="0,22 -9,0 -1.5,-178 0,-193" fill="url(#handFacetLeft)" />
        <polygon points="0,22 9,0 1.5,-178 0,-193" fill="url(#handFacetRight)" />
        <line x1="0" y1="-30" x2="0" y2="-190" stroke="#ffffff" stroke-width="0.8" opacity="0.6" />
      </g>
    </svg>
  `;
  await renderSvgToPng(svgMin, 20, 215, path.join(drawableNodpi, 'hand_minute.png'));

  // 8. PREVIEW THUMBNAIL (200x200): Saved to BOTH drawable-nodpi and drawable
  // Max size allowed by Wear OS is 400x400. 200x200 is perfectly safe!
  const svgPreview = `
    <svg width="200" height="200" viewBox="0 0 466 466">
      ${commonDefs}
      <circle cx="233" cy="233" r="233" fill="#000000" />
      <circle cx="233" cy="233" r="233" fill="url(#dialFumeEmerald)" />
      ${darkTicksSvg}
      ${batonsSvg}
      <g transform="translate(${cx}, ${cy - 110}) scale(1.28)">
        <g transform="translate(0, 16)">
          <text x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="url(#monoFacetLeft)" font-family="'Cinzel', serif" font-size="33" font-weight="900" font-style="italic" letter-spacing="4">MS</text>
        </g>
      </g>
      <!-- Subdials preview -->
      <g transform="translate(${cx - 108}, ${cy}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="36.5" fill="#050806" stroke="#1e293b" stroke-width="1.2" />
      </g>
      <g transform="translate(${cx}, ${cy + 110}) scale(1.28)">
        <circle cx="0" cy="0" r="42" fill="none" stroke="#121814" stroke-width="10" />
        <circle cx="0" cy="0" r="36.5" fill="#050806" stroke="#1e293b" stroke-width="1.2" />
      </g>
      <!-- Sample Hands 10:10 -->
      <g transform="translate(233, 233) rotate(305)">
        <polygon points="0,20 -11,0 -2,-120 0,-135" fill="url(#handFacetLeft)" />
        <polygon points="0,20 11,0 2,-120 0,-135" fill="url(#handFacetRight)" />
      </g>
      <g transform="translate(233, 233) rotate(60)">
        <polygon points="0,22 -9,0 -1.5,-178 0,-193" fill="url(#handFacetLeft)" />
        <polygon points="0,22 9,0 1.5,-178 0,-193" fill="url(#handFacetRight)" />
      </g>
      <circle cx="233" cy="233" r="14" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
      <circle cx="233" cy="233" r="4.5" fill="#ff6b00" />
    </svg>
  `;
  await renderSvgToPng(svgPreview, 200, 200, path.join(drawableNodpi, 'preview.png'));
  // Overwrite in drawable as well with the safe 200x200 size
  fs.copyFileSync(path.join(drawableNodpi, 'preview.png'), path.join(drawableDir, 'preview.png'));

  ws.close();
  edge.kill();
  console.log('All final assets successfully generated!');
}

generateAll().catch(console.error);
