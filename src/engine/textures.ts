import * as THREE from 'three/webgpu';

export type CC0TextureId =
  | 'brown_mud_02'
  | 'gravel_ground_01'
  | 'concrete_floor_worn_001'
  | 'asphalt_02'
  | 'corrugated_iron_02'
  | 'blue_metal_plate'
  | 'rust_coarse_01'
  | 'sparse_grass'
  | 'rough_wood'
  | 'blue_plaster_wall';

export interface PBRTextureSet {
  diff: THREE.Texture;
  nor: THREE.Texture;
  arm: THREE.Texture;
}

const ALL_CC0_IDS: CC0TextureId[] = [
  'brown_mud_02',
  'gravel_ground_01',
  'concrete_floor_worn_001',
  'asphalt_02',
  'corrugated_iron_02',
  'blue_metal_plate',
  'rust_coarse_01',
  'sparse_grass',
  'rough_wood',
  'blue_plaster_wall',
];

function makeFallbackTexture(hex: string, srgb: boolean): THREE.DataTexture {
  const c = new THREE.Color(hex);
  const data = new Uint8Array([
    Math.round(c.r * 255),
    Math.round(c.g * 255),
    Math.round(c.b * 255),
    255,
  ]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export class TextureLibrary {
  public readonly sets: Record<CC0TextureId, PBRTextureSet>;
  public readonly caneCardTex: THREE.CanvasTexture;
  public readonly grassCardTex: THREE.CanvasTexture;
  public readonly dustSpriteTex: THREE.CanvasTexture;
  public readonly groundMaskTex: THREE.CanvasTexture;
  public readonly groundMaskCanvas: HTMLCanvasElement;

  private constructor(
    sets: Record<CC0TextureId, PBRTextureSet>,
    caneCardTex: THREE.CanvasTexture,
    grassCardTex: THREE.CanvasTexture,
    dustSpriteTex: THREE.CanvasTexture,
    groundMaskTex: THREE.CanvasTexture,
    groundMaskCanvas: HTMLCanvasElement,
  ) {
    this.sets = sets;
    this.caneCardTex = caneCardTex;
    this.grassCardTex = grassCardTex;
    this.dustSpriteTex = dustSpriteTex;
    this.groundMaskTex = groundMaskTex;
    this.groundMaskCanvas = groundMaskCanvas;
  }

  public static async loadAll(): Promise<TextureLibrary> {
    const loader = new THREE.TextureLoader();

    const loadTex = (url: string, srgb: boolean, fallbackHex: string): Promise<THREE.Texture> =>
      new Promise((resolve) => {
        loader.load(
          url,
          (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            tex.anisotropy = 4;
            resolve(tex);
          },
          undefined,
          () => resolve(makeFallbackTexture(fallbackHex, srgb)),
        );
      });

    const entries = await Promise.all(
      ALL_CC0_IDS.map(async (id) => {
        const base = `/assets/cc0/${id}`;
        const [diff, nor, arm] = await Promise.all([
          loadTex(`${base}/diff.jpg`, true, '#7a523c'),
          loadTex(`${base}/nor.jpg`, false, '#8080ff'),
          loadTex(`${base}/arm.jpg`, false, '#ff8000'),
        ]);
        return [id, { diff, nor, arm }] as const;
      }),
    );

    const sets = Object.fromEntries(entries) as Record<CC0TextureId, PBRTextureSet>;
    const caneCardTex = TextureLibrary.createCaneCardTexture();
    const grassCardTex = TextureLibrary.createGrassCardTexture();
    const dustSpriteTex = TextureLibrary.createSoftSpriteTexture();
    const { tex: groundMaskTex, canvas: groundMaskCanvas } = TextureLibrary.createGroundMaskTexture();

    return new TextureLibrary(sets, caneCardTex, grassCardTex, dustSpriteTex, groundMaskTex, groundMaskCanvas);
  }

  private static createCaneCardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 1024);

    // Draw clustered stalks with internode rings
    for (let i = 0; i < 16; i++) {
      const cx = 75 + Math.random() * 362;
      const w = 13 + Math.random() * 11;
      const lean = (Math.random() - 0.5) * 44;
      const topY = 230 + Math.random() * 110;
      const grad = ctx.createLinearGradient(cx, 1024, cx + lean, topY);
      grad.addColorStop(0, '#4f5e24');
      grad.addColorStop(0.55, '#688332');
      grad.addColorStop(1, '#849f41');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5, 1024);
      ctx.lineTo(cx + lean - w * 0.35, topY);
      ctx.lineTo(cx + lean + w * 0.35, topY);
      ctx.lineTo(cx + w * 0.5, 1024);
      ctx.closePath();
      ctx.fill();

      // Internode joints
      for (let y = 980; y > topY + 40; y -= 62 + Math.random() * 24) {
        const t = (1024 - y) / (1024 - topY);
        const ix = cx + lean * t;
        const iw = w * (0.5 - 0.15 * t);
        ctx.fillStyle = 'rgba(222,226,158,0.48)';
        ctx.fillRect(ix - iw, y, iw * 2, 3.5);
      }

      // Dry lower trash sheaths
      if (i % 2 === 0) {
        ctx.strokeStyle = 'rgba(155,126,74,0.68)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, 920);
        ctx.quadraticCurveTo(cx + lean * 0.3 + (i % 4 === 0 ? -36 : 36), 860, cx + (i % 4 === 0 ? -54 : 54), 950);
        ctx.stroke();
      }
    }

    // Arching lance-shaped leaves
    for (let i = 0; i < 64; i++) {
      const bx = 95 + Math.random() * 322;
      const by = 240 + Math.random() * 520;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const len = 130 + Math.random() * 190;
      const arc = 48 + Math.random() * 88;
      const drop = (Math.random() - 0.1) * 90;
      const g = Math.floor(118 + Math.random() * 52);
      const r = Math.floor(88 + Math.random() * 42);
      ctx.fillStyle = i % 9 === 0 ? '#a9934c' : `rgb(${r},${g},42)`;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dir * len * 0.52, by - arc, bx + dir * len, by + drop);
      ctx.quadraticCurveTo(bx + dir * len * 0.5, by - arc + 14, bx, by + 11);
      ctx.closePath();
      ctx.fill();
    }

    // Feathery tops / panicles on a few stalks
    for (let i = 0; i < 8; i++) {
      const px = 120 + Math.random() * 272;
      const py = 50 + Math.random() * 140;
      ctx.strokeStyle = 'rgba(218,214,190,0.75)';
      ctx.lineWidth = 2;
      for (let j = 0; j < 9; j++) {
        ctx.beginPath();
        ctx.moveTo(px, py + 95);
        ctx.quadraticCurveTo(px + (j - 4) * 7, py + 42, px + (j - 4) * 14, py + Math.random() * 18);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  private static createGrassCardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 512);

    // Dense wild Cerrado braquiária / capim tufts
    for (let i = 0; i < 110; i++) {
      const bx = 42 + Math.random() * 428;
      const lean = (Math.random() - 0.5) * 140;
      const topY = 75 + Math.random() * 210;
      const w = 6 + Math.random() * 8;
      const g = Math.floor(110 + Math.random() * 64);
      const r = Math.floor(82 + Math.random() * 58);
      ctx.fillStyle = i % 6 === 0 ? '#b79d4b' : `rgb(${r},${g},36)`;

      ctx.beginPath();
      ctx.moveTo(bx - w * 0.5, 512);
      ctx.quadraticCurveTo(bx + lean * 0.45 - w * 0.2, 310, bx + lean, topY);
      ctx.quadraticCurveTo(bx + lean * 0.45 + w * 0.25, 310, bx + w * 0.5, 512);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  private static createSoftSpriteTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.42)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /**
   * Builds a 1760x880 splat control mask covering x in [-220, 220], z in [-110, 110].
   * RGBA channels:
   * - R: Gravel road (`estrada`) + tire ruts
   * - G: Grass (`capim`) verge & fallow margins
   * - B: Yard concrete (`concreto`) around industrial & port zones
   * - A: Asphalt (`asphalt`) road in industrial/office/port zones (plus morning dampness stored in B/A blends)
   * Base (0,0,0) = Red laterite Mato Grosso earth (`brown_mud_02` tinted red).
   */
  private static createGroundMaskTexture(): { tex: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
    const W = 1760;
    const H = 880;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const toPxX = (x: number) => ((x + 220) / 440) * W;
    const toPxZ = (z: number) => ((z + 110) / 220) * H;
    const toPxW = (m: number) => (m / 440) * W;

    // Base: Red earth everywhere
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, W, H);

    // Grass strips alongside rural field roads and outside industrial zone
    ctx.fillStyle = 'rgb(0, 200, 0)';
    ctx.fillRect(0, toPxZ(-12), toPxX(12), toPxZ(12) - toPxZ(-12));

    // Dirt/gravel rural road (x < 6)
    ctx.fillStyle = 'rgb(245, 0, 0)';
    ctx.fillRect(0, toPxZ(-3.5), toPxX(8), toPxZ(3.5) - toPxZ(-3.5));

    // Stop branches for Campo (Sede, Talhão 12, Frente, Oficina, Balança)
    const branches = [
      { x: -96, nz: -10.5, r: 12, isCon: false },
      { x: -72, nz: 10.5, r: 9, isCon: false },
      { x: -48, nz: -10.5, r: 10, isCon: false },
      { x: -24, nz: 10.5, r: 13, isCon: true },
      { x: 0, nz: -10.5, r: 11, isCon: true },
    ];
    for (const b of branches) {
      const x0 = toPxX(b.x);
      const z0 = toPxZ(Math.min(0, b.nz));
      const z1 = toPxZ(Math.max(0, b.nz));
      const w = toPxW(5.6);
      ctx.fillStyle = b.isCon ? 'rgb(80, 0, 220)' : 'rgb(240, 0, 0)';
      ctx.fillRect(x0 - w * 0.5, z0, w, z1 - z0);

      const rad = toPxW(b.r);
      const cy = toPxZ(b.nz);
      ctx.beginPath();
      ctx.arc(x0, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Industrial & port concrete aprons (x from 4 to 108)
    ctx.fillStyle = 'rgb(0, 0, 240)';
    ctx.fillRect(toPxX(4), toPxZ(-30), toPxX(108) - toPxX(4), toPxZ(30) - toPxZ(-30));

    // Paved asphalt avenue from x = 6 to Porto x = 104 (stored in R+B high bit via custom canvas pass -> let's use distinct R+B marker or alpha!)
    // Actually we can keep A = 255 everywhere and use:
    // R = gravel road, G = grass, B = concrete; where R > 0.5 && B > 0.5 => asphalt!
    ctx.fillStyle = 'rgb(220, 0, 220)';
    ctx.fillRect(toPxX(6), toPxZ(-4.2), toPxX(104) - toPxX(6), toPxZ(4.2) - toPxZ(-4.2));

    // Harvester work track in field (z = -27)
    ctx.fillStyle = 'rgb(190, 0, 0)';
    ctx.fillRect(toPxX(-70), toPxZ(-29.5), toPxX(-26) - toPxX(-70), toPxZ(-24.5) - toPxZ(-29.5));

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    return { tex, canvas };
  }

  public static createSignboardMaterial(
    lines: string[],
    bgHex = '#f2be38',
    fgHex = '#12302f',
  ): THREE.MeshStandardNodeMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = fgHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = fgHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 46px Archivo, Arial Narrow, sans-serif';
    ctx.fillText(lines[0] || '', 256, lines.length > 1 ? 90 : 128, 430);
    if (lines[1]) {
      ctx.font = '600 28px Inter, sans-serif';
      ctx.fillText(lines[1], 256, 166, 430);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.MeshStandardNodeMaterial({ map: tex, roughness: 0.68, metalness: 0.06 });
  }

  public static createDocumentBoardMaterial(
    lines: string[],
    bg = '#d8d5ca',
  ): THREE.MeshStandardNodeMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 384);
    ctx.fillStyle = '#1d2b2a';
    ctx.font = '800 38px Archivo, Arial Narrow, sans-serif';
    ctx.fillText(lines[0] || '', 24, 56, 464);
    ctx.fillStyle = '#b3402a';
    ctx.fillRect(24, 72, 464, 5);
    ctx.font = '600 25px Inter, sans-serif';
    ctx.fillStyle = '#2c3b3a';
    for (let i = 1; i < lines.length; i++) {
      ctx.fillText(lines[i], 24, 82 + i * 42, 464);
    }
    for (let r = 0; r < 4; r++) {
      ctx.strokeStyle = 'rgba(30,60,120,0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const y = 308 + r * 15;
      ctx.moveTo(24, y);
      for (let x = 24; x < 380; x += 22) {
        ctx.lineTo(x, y + (Math.sin(x * 0.2 + r) * 3));
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.MeshStandardNodeMaterial({ map: tex, roughness: 0.85, metalness: 0.02 });
  }
}
