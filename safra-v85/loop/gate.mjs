// Portão de qualidade: node loop/gate.mjs <dir>  (dir contém src/ ; gera dir/dist/index.html)
// Sai com JSON {ok, checks:[...], erros:[...], bytes}
import fs from 'fs'; import path from 'path';
const pwPath = fs.existsSync('/opt/npm-tools/node_modules/playwright/index.mjs')
  ? '/opt/npm-tools/node_modules/playwright/index.mjs'
  : '/usr/local/share/bun-global/node_modules/playwright/index.mjs';
const {chromium, devices} = await import(pwPath);
const dir = path.resolve(process.argv[2] || '/app/applet/safra-v85');
const src = dir + '/src', out = dir + '/dist/index.html';
fs.mkdirSync(dir + '/dist', {recursive: true});
const order = fs.readFileSync(src + '/_order.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const html = [fs.readFileSync(src + '/_head.html', 'utf8'), ...order.map(f => fs.readFileSync(src + '/' + f, 'utf8')), fs.readFileSync(src + '/_tail.html', 'utf8')].join('');
fs.writeFileSync(out, html);
const R = {ok: true, bytes: html.length, checks: [], erros: []};
const check = (nome, ok, info = '') => { R.checks.push({nome, ok, info}); if (!ok) R.ok = false; };
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
const chromeBin = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
const b = await chromium.launch({...(chromeBin ? {executablePath: chromeBin} : {}), args});
async function abrir(ctxOpts) {
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', e => erros.push('PAGEERROR ' + String(e.message).slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error') erros.push('console ' + m.text().slice(0, 300)); });
  await p.goto('file://' + out, {waitUntil: 'domcontentloaded'});
  const carregou = await p.waitForFunction(() => window.__SAFRA_DEBUG__, null, {timeout: 120000}).then(() => true).catch(() => false);
  await p.waitForTimeout(1500); return {p, erros, carregou, ctx};
}
try {
  // 1. desktop: carrega, joga, abre as 10 paradas, demo até o relatório
  const d = await abrir({viewport: {width: 960, height: 540}});
  check('desktop carrega', d.carregou);
  if (d.carregou) {
    const r = await d.p.evaluate(async () => {
      const D = window.__SAFRA_DEBUG__; D.startPlaying(); const n = D.data.PARADAS.length; let abriu = 0;
      for (let i = 0; i < n; i++) { try { D.openStop(i); abriu++; } catch (e) {} D.closeModal && D.closeModal(); }
      return {n, abriu, ev: D.data.EVIDENCIAS.length, eggs: (D.data.EASTER || []).length};
    });
    check('10 paradas abrem', r.abriu === r.n && r.n === 10, JSON.stringify(r));
    const pos0 = await d.p.evaluate(() => { const P = window.__SAFRA_DEBUG__.getPlayer(); return [P.x, P.z]; });
    await d.p.evaluate(() => window.__SAFRA_DEBUG__.closeModal()); await d.p.mouse.click(480, 270); await d.p.keyboard.down('KeyW'); await d.p.waitForTimeout(1500); await d.p.keyboard.up('KeyW');
    const pos1 = await d.p.evaluate(() => { const P = window.__SAFRA_DEBUG__.getPlayer(); return [P.x, P.z]; });
    check('jogador anda', Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]) > 0.3, JSON.stringify({pos0, pos1}));
    await d.p.evaluate(() => { window.__SAFRA_DEBUG__.setPaused?.(true); window.__SAFRA_DEBUG__.renderNow?.(); });
    await d.p.screenshot({path: dir + '/dist/gate_desktop.png', animations: 'disabled', timeout: 90000});
  }
  R.erros.push(...d.erros.slice(0, 15)); check('desktop sem erros JS', d.erros.length === 0, d.erros.length + ' erros');
  await d.ctx.close();
  // 1b. demo em página limpa
  {
  const d = await abrir({viewport: {width: 960, height: 540}});
    await d.p.evaluate(() => window.__SAFRA_DEBUG__.startDemo());
    const fim = await d.p.waitForFunction(() => { const L = window.__SAFRA_DEBUG__.state.ligacao; return L && (L.venceu != null || L.caiu); }, null, {timeout: 420000, polling: 3000}).then(() => true).catch(() => false);
    check('demo chega na ligação', fim, await d.p.evaluate(() => JSON.stringify(window.__SAFRA_DEBUG__.state.ligacao || {}).slice(0, 200)));
  R.erros.push(...d.erros.slice(0, 15)); await d.ctx.close();
  }
  // 2. mobile
  const m = await abrir({...devices['iPhone 14 Pro landscape']});
  check('mobile carrega', m.carregou);
  if (m.carregou) {
    const t = await m.p.evaluate(() => { window.__SAFRA_DEBUG__.startPlaying(); return {toque: document.body.classList.contains('toque'), q: window.__SAFRA_DEBUG__.getMetrics?.().quality}; });
    check('mobile em modo toque', t.toque, JSON.stringify(t));
    await m.p.waitForTimeout(1000);
    await m.p.evaluate(() => { window.__SAFRA_DEBUG__.setPaused?.(true); window.__SAFRA_DEBUG__.renderNow?.(); });
    await m.p.screenshot({path: dir + '/dist/gate_mobile.png', animations: 'disabled', timeout: 90000});
  }
  R.erros.push(...m.erros.slice(0, 15)); check('mobile sem erros JS', m.erros.length === 0, m.erros.length + ' erros');
  await m.ctx.close();
} catch (e) { check('gate executou', false, String(e).slice(0, 300)); }
await b.close();
console.log(JSON.stringify(R, null, 1));
process.exit(R.ok ? 0 : 1);
