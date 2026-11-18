import {chromium} from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const lista = fs.readFileSync('lista.txt','utf8').trim().split('\n').map(s => s.split('/').pop());
const b = await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--allow-file-access-from-files','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); p.on('console', m => { const t = m.text(); if (!/ERR_FILE_NOT_FOUND|specular/.test(t)) console.log('[pg]', t.slice(0,200)); });
await p.goto('file:///home/claude/modelos/rbx/conv.html');
fs.mkdirSync('out', {recursive: true});
for (const n of lista) {
  const anim = n === 'Wood_Male_01' ? 'm_idle.fbx' : n === 'Female_Adult_04' ? 'f_idle.fbx' : null;
  const b64 = await p.evaluate(async ([n, anim]) => {
    const {THREE, FBXLoader, TGALoader, GLTFExporter} = window.CONV;
    const man = new THREE.LoadingManager(); man.addHandler(/\.tga$/i, new TGALoader(man));
    man.setURLModifier(u => u.startsWith('data:') || u.startsWith('blob:') || u.endsWith('.fbx') ? u : `${n}/${u.split(/[\\/]/).pop()}`);
    const obj = await new FBXLoader(man).loadAsync(`${n}/${n}.fbx`);
    await new Promise(r => setTimeout(r, 1500)); // texturas tga
    const cache = new Map();
    const paraCanvas = t => {
      if (!t || !t.image || !t.image.data) return t;
      if (cache.has(t)) return cache.get(t);
      const {width: w, height: h, data} = t.image; const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const id = new ImageData(new Uint8ClampedArray(data.buffer, data.byteOffset, w * h * 4), w, h); cv.getContext('2d').putImageData(id, 0, 0);
      const c2 = document.createElement('canvas'); const S = Math.min(1024, w); c2.width = S; c2.height = Math.round(h * S / w); c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height);
      const ct = new THREE.CanvasTexture(c2); ct.flipY = t.flipY; ct.wrapS = t.wrapS; ct.wrapT = t.wrapT; cache.set(t, ct); return ct;
    };
    obj.traverse(o => {
      if (!o.isMesh) return;
      const mats = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
        const op = /opacity/i.test(m.name);
        const s = new THREE.MeshStandardMaterial({ name: m.name, map: paraCanvas(m.map) || null, normalMap: paraCanvas(m.normalMap) || null, roughness: 0.82, metalness: 0,
          transparent: false, alphaTest: op ? 0.45 : 0, side: op ? THREE.DoubleSide : THREE.FrontSide });
        if (s.map) s.map.colorSpace = THREE.SRGBColorSpace;
        return s;
      });
      o.material = Array.isArray(o.material) ? mats : mats[0];
    });
    obj.animations = [];
    let clips = [];
    if (anim) { const a = await new FBXLoader(man).loadAsync(anim); clips = a.animations.slice(0, 1); clips[0].name = 'idle'; }
    const glb = await new GLTFExporter().parseAsync(obj, { binary: true, maxTextureSize: 1024, animations: clips, onlyVisible: true });
    let s = ''; const u = new Uint8Array(glb); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }, [n, anim]);
  fs.writeFileSync(`out/${n}.glb`, Buffer.from(b64, 'base64'));
  console.log(n, (fs.statSync(`out/${n}.glb`).size / 1024 | 0) + ' KB');
}
await b.close();
