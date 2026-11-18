import * as THREE from 'three';

export interface TextureBank {
  detail: THREE.DataTexture;
  detailNormal: THREE.DataTexture;
  corrugatedAlbedo: THREE.CanvasTexture;
  corrugatedNormal: THREE.DataTexture;
  tireTread: THREE.DataTexture;
  hazard: THREE.CanvasTexture;
  gaugeDial: THREE.CanvasTexture;
  plateQgbt: THREE.CanvasTexture;
  plateSwitch: THREE.CanvasTexture;
  plateValve: THREE.CanvasTexture;
  plateFrota: THREE.CanvasTexture;
  plateDanger: THREE.CanvasTexture;
  smokePuff: THREE.CanvasTexture;
  dispose: () => void;
}

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function tileableValueNoise(u: number, v: number, period: number): number {
  const x = u * period;
  const y = v * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const x0 = ((ix % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y0 = ((iy % period) + period) % period;
  const y1 = (y0 + 1) % period;
  const a = hash2(x0, y0);
  const b = hash2(x1, y0);
  const c = hash2(x0, y1);
  const d = hash2(x1, y1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function buildDetailTextures(): {
  detail: THREE.DataTexture;
  detailNormal: THREE.DataTexture;
} {
  const size = 256;
  const height = new Float32Array(size * size);
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n =
        0.52 * tileableValueNoise(u, v, 8) +
        0.28 * tileableValueNoise(u, v, 16) +
        0.13 * tileableValueNoise(u, v, 32) +
        0.07 * tileableValueNoise(u, v, 64);
      const idx = y * size + x;
      height[idx] = n;
      const c = Math.max(0, Math.min(255, Math.round(115 + (n - 0.5) * 140)));
      data[idx * 4] = c;
      data[idx * 4 + 1] = c;
      data[idx * 4 + 2] = c;
      data[idx * 4 + 3] = 255;
    }
  }

  const detail = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  detail.wrapS = THREE.RepeatWrapping;
  detail.wrapT = THREE.RepeatWrapping;
  detail.needsUpdate = true;

  // Sobel normal map
  const ndata = new Uint8Array(size * size * 4);
  const strength = 2.6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
      const dy = (height[yp * size + x] - height[ym * size + x]) * strength;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const nx = -dx * invLen;
      const ny = -dy * invLen;
      const nz = invLen;
      const i4 = (y * size + x) * 4;
      ndata[i4] = Math.round((nx * 0.5 + 0.5) * 255);
      ndata[i4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      ndata[i4 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      ndata[i4 + 3] = 255;
    }
  }
  const detailNormal = new THREE.DataTexture(ndata, size, size, THREE.RGBAFormat);
  detailNormal.wrapS = THREE.RepeatWrapping;
  detailNormal.wrapT = THREE.RepeatWrapping;
  detailNormal.needsUpdate = true;

  return { detail, detailNormal };
}

function buildCorrugatedTextures(): {
  corrugatedAlbedo: THREE.CanvasTexture;
  corrugatedNormal: THREE.DataTexture;
} {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#6f7476';
  ctx.fillRect(0, 0, size, size);

  const ribs = 14;
  for (let x = 0; x < size; x++) {
    const wave = Math.sin((x / size) * ribs * Math.PI * 2);
    const shade = Math.round(104 + wave * 24);
    ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 5})`;
    ctx.fillRect(x, 0, 1, size);
  }
  // Vertical rust drips along troughs
  for (let i = 0; i < 42; i++) {
    const x = Math.floor(hash2(i * 3.1, 1.7) * size);
    const y = Math.floor(hash2(i * 1.9, 9.2) * size * 0.6);
    const len = 30 + hash2(i * 7.3, 4.1) * 110;
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, 'rgba(122, 56, 26, 0.58)');
    g.addColorStop(1, 'rgba(92, 42, 20, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, y, 5, len);
  }

  const corrugatedAlbedo = new THREE.CanvasTexture(c);
  corrugatedAlbedo.colorSpace = THREE.SRGBColorSpace;
  corrugatedAlbedo.wrapS = THREE.RepeatWrapping;
  corrugatedAlbedo.wrapT = THREE.RepeatWrapping;
  corrugatedAlbedo.repeat.set(3, 2);

  // Corrugated normal map
  const ndata = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const slope = Math.cos((x / size) * ribs * Math.PI * 2) * 0.72;
      const micro = (tileableValueNoise(x / size, y / size, 24) - 0.5) * 0.16;
      const dx = slope + micro;
      const dy = (tileableValueNoise(x / size, y / size, 16) - 0.5) * 0.12;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i4 = (y * size + x) * 4;
      ndata[i4] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      ndata[i4 + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      ndata[i4 + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      ndata[i4 + 3] = 255;
    }
  }
  const corrugatedNormal = new THREE.DataTexture(ndata, size, size, THREE.RGBAFormat);
  corrugatedNormal.wrapS = THREE.RepeatWrapping;
  corrugatedNormal.wrapT = THREE.RepeatWrapping;
  corrugatedNormal.repeat.set(3, 2);
  corrugatedNormal.needsUpdate = true;

  return { corrugatedAlbedo, corrugatedNormal };
}

function buildTireTreadTexture(): THREE.DataTexture {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Chevron heavy-duty lug pattern across tread width (u in 0.1..0.9)
      const sideFade = Math.max(0, 1 - Math.pow(Math.abs(u - 0.5) * 2.1, 6));
      const chev = Math.sin((v * 14 + Math.abs(u - 0.5) * 3.2) * Math.PI * 2);
      const lug = chev > -0.15 ? 1 : 0.15;
      const centerGroove = Math.abs(u - 0.5) < 0.04 ? 0.2 : 1;
      const h = Math.round(Math.max(0, Math.min(255, sideFade * lug * centerGroove * 240)));
      const i4 = (y * size + x) * 4;
      data[i4] = h;
      data[i4 + 1] = h;
      data[i4 + 2] = h;
      data[i4 + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function buildHazardStripeTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cf8a18';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#18191b';
  for (let i = -size; i < size * 2; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 24, 0);
    ctx.lineTo(i + 24 - size, size);
    ctx.lineTo(i - size, size);
    ctx.closePath();
    ctx.fill();
  }
  // Grime & chips
  for (let i = 0; i < 160; i++) {
    const x = hash2(i, 2.3) * size;
    const y = hash2(i, 7.9) * size;
    const r = 1 + hash2(i, 5.1) * 5;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(90, 32, 16, 0.35)' : 'rgba(20, 20, 20, 0.38)';
    ctx.fillRect(x, y, r, r);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildGaugeDialTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ddd7c5';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#332f28';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Red danger zone
  ctx.beginPath();
  ctx.arc(128, 128, 92, -0.35, 0.65);
  ctx.strokeStyle = '#b93622';
  ctx.lineWidth = 12;
  ctx.stroke();

  // Ticks
  ctx.save();
  ctx.translate(128, 128);
  for (let i = 0; i <= 16; i++) {
    const a = (-2.3 + (i / 16) * 4.6) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 80, Math.sin(a) * 80);
    ctx.lineTo(Math.cos(a) * (i % 4 === 0 ? 104 : 94), Math.sin(a) * (i % 4 === 0 ? 104 : 94));
    ctx.strokeStyle = i >= 12 ? '#9a2818' : '#1b1d1e';
    ctx.lineWidth = i % 4 === 0 ? 3.5 : 1.5;
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#222426';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BAR · VAPOR', 128, 178);
  ctx.font = 'bold 14px monospace';
  ctx.fillText('V-07', 128, 198);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildStenciledPlate(
  title: string,
  subtitle: string,
  bgHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = accentHex;
  ctx.fillRect(24, 24, w - 48, 34);

  ctx.fillStyle = '#141718';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('USINA HORIZONTE · MANUTENÇÃO', 36, 48);

  ctx.fillStyle = '#f0ede4';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, 36, 134);

  ctx.fillStyle = '#d3cdc0';
  ctx.font = '600 24px monospace';
  ctx.fillText(subtitle, 36, 192);

  // Subtle rust spots & scratches
  for (let i = 0; i < 60; i++) {
    const rx = hash2(i * 2.1, title.length) * w;
    const ry = hash2(i * 4.7, subtitle.length) * h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(110, 44, 18, 0.32)' : 'rgba(20, 22, 24, 0.25)';
    ctx.fillRect(rx, ry, 4 + (i % 7), 3 + (i % 5));
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildSmokePuffTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = (u - 0.5) * 2;
      const dy = (v - 0.5) * 2;
      const r = Math.hypot(dx, dy);
      const n =
        0.55 * tileableValueNoise(u, v, 5) +
        0.3 * tileableValueNoise(u, v, 10) +
        0.15 * tileableValueNoise(u, v, 20);
      const alpha = Math.max(0, Math.min(1, (1 - Math.pow(r / (0.72 + n * 0.35), 2.1)) * (0.65 + n * 0.5)));
      const i = (y * size + x) * 4;
      img.data[i] = 244;
      img.data[i + 1] = 240;
      img.data[i + 2] = 236;
      img.data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTextureBank(): TextureBank {
  const { detail, detailNormal } = buildDetailTextures();
  const { corrugatedAlbedo, corrugatedNormal } = buildCorrugatedTextures();
  const tireTread = buildTireTreadTexture();
  const hazard = buildHazardStripeTexture();
  const gaugeDial = buildGaugeDialTexture();
  const plateQgbt = buildStenciledPlate('QGBT-04', 'QUADRO GERAL · 440V', '#192927', '#e09d24');
  const plateSwitch = buildStenciledPlate('SECC. S-02', 'CHAVE ISOLADORA', '#1e2426', '#d98c1c');
  const plateValve = buildStenciledPlate('V-07', 'PURGA DE CONDENSADO', '#25211e', '#d66d28');
  const plateFrota = buildStenciledPlate('FROTA 18', 'TRANSPORTE DE CANA', '#122624', '#00b3a4');
  const plateDanger = buildStenciledPlate('PERIGO', 'ALTA TENSÃO · ARCO', '#2d1c19', '#e55436');
  const smokePuff = buildSmokePuffTexture();

  const all: THREE.Texture[] = [
    detail,
    detailNormal,
    corrugatedAlbedo,
    corrugatedNormal,
    tireTread,
    hazard,
    gaugeDial,
    plateQgbt,
    plateSwitch,
    plateValve,
    plateFrota,
    plateDanger,
    smokePuff,
  ];

  return {
    detail,
    detailNormal,
    corrugatedAlbedo,
    corrugatedNormal,
    tireTread,
    hazard,
    gaugeDial,
    plateQgbt,
    plateSwitch,
    plateValve,
    plateFrota,
    plateDanger,
    smokePuff,
    dispose: () => {
      for (const t of all) t.dispose();
    },
  };
}
