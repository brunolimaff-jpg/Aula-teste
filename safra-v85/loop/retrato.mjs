// Retratos dos personagens: node loop/retrato.mjs <dir> <prefixo>
// Gera <dir>/dist/<prefixo>_<n>.png : close de 3 NPCs (Helena, Tião, Rui) e um plano médio com cenário.
import {chromium} from '/opt/npm-tools/node_modules/playwright/index.mjs';
import path from 'path';
const dir = path.resolve(process.argv[2] || '.'), pre = process.argv[3] || 'ret';
const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox']});
const p = await b.newPage({viewport: {width: 960, height: 540}});
const erros = []; p.on('pageerror', e => erros.push(String(e.message).slice(0, 200)));
await p.goto('file://' + dir + '/dist/index.html');
await p.waitForFunction(() => window.__SAFRA_DEBUG__, null, {timeout: 120000});
await p.evaluate(() => { window.__NO_TAB = true; window.__SAFRA_DEBUG__.startPlaying(); document.body.classList.add('retrato'); const s = document.createElement('style'); s.textContent = 'body.retrato *{visibility:hidden!important} body.retrato canvas{visibility:visible!important}'; document.head.appendChild(s); });
const planos = [[0, 2.4, 'close'], [3, 2.4, 'close'], [4, 2.4, 'close'], [5, 6.5, 'medio']];
let n = 0;
for (const [i, dist, tipo] of planos) {
  await p.evaluate(([i, dist]) => {
    const D = window.__SAFRA_DEBUG__, s = D.data.PARADAS[i], P = s.person;
    const r = P.userData.anim.yaw ?? P.rotation.y, px = P.position.x, pz = P.position.z;
    D.teleport(px + Math.sin(r) * dist + 0.25, pz + Math.cos(r) * dist, r, dist < 3 ? -0.08 : -0.03);
  }, [i, dist]);
  await p.waitForTimeout(3500);
  await p.screenshot({path: `${dir}/dist/${pre}_${++n}_${tipo}.png`});
}
console.log(erros.length ? erros.join('\n') : 'ok');
await b.close();
