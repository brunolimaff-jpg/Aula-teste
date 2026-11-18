import {chromium} from '/opt/npm-tools/node_modules/playwright/index.mjs';
const steps=JSON.parse(process.argv[2]||'[]');
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const p=await b.newPage({viewport:{width:960,height:540}});
const logs=[];p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text().slice(0,400));});p.on('pageerror',e=>logs.push('PAGEERROR: '+String(e.stack||e).slice(0,600)));
await p.goto('file:///home/claude/s6f/dist/index.html');
await p.waitForFunction(()=>window.__SAFRA_DEBUG__,{timeout:120000}).catch(e=>logs.push('TIMEOUT __dia'));
await p.waitForTimeout(3000);
for(const s of steps){ if(s.js)console.log('>',await p.evaluate(s.js).catch(e=>'EVAL: '+e.message.slice(0,300))); await p.waitForTimeout(s.wait||1500); if(s.shot){console.log(logs.join('\n'));await p.screenshot({path:'shots/'+s.shot+'.png',timeout:240000});}; }
console.log(logs.slice(0,25).join('\n')||'sem erros');
await b.close();
