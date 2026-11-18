import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MaterialBank, MaterialKind } from './materials';
import type { TextureLibrary } from './textures';
import type { CollisionWorld } from '../game/worldMath';

export interface AnimatedPerson {
  group: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  head: THREE.Mesh;
  baseY: number;
}

export interface AnimatedWheel {
  mesh: THREE.Object3D;
  radius: number;
  axis: 'x' | 'z';
}

export interface HarvesterRig {
  group: THREE.Group;
  cutter: THREE.Group;
  headlights: THREE.Mesh[];
  dustMotes: THREE.Mesh[];
  wheels: AnimatedWheel[];
}

export interface TransbordoRig {
  group: THREE.Group;
  headlights: THREE.Mesh[];
  wheels: AnimatedWheel[];
}

export function addRBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  radius = 0.04,
  castShadow = true,
): THREE.Mesh {
  const geo = new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w * 0.25, h * 0.25, d * 0.25));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function addCyl(
  parent: THREE.Object3D,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  segs = 12,
  castShadow = true,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

interface WheelGeoBundle {
  tire: THREE.BufferGeometry;
  rim: THREE.BufferGeometry;
  hub: THREE.BufferGeometry;
  lugs: THREE.BufferGeometry;
  treads: THREE.BufferGeometry;
}

const WHEEL_GEO_CACHE = new Map<string, WheelGeoBundle>();

function getWheelGeoBundle(radius: number, width: number): WheelGeoBundle {
  const key = `${radius.toFixed(3)}:${width.toFixed(3)}`;
  const cached = WHEEL_GEO_CACHE.get(key);
  if (cached) return cached;

  const tire = new THREE.CylinderGeometry(radius, radius, width, 16);
  tire.rotateZ(Math.PI / 2);

  const rim = new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width * 1.04, 12);
  rim.rotateZ(Math.PI / 2);

  const hub = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width * 1.12, 8);
  hub.rotateZ(Math.PI / 2);

  const lugParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lg = new THREE.CylinderGeometry(radius * 0.045, radius * 0.045, width * 1.08, 6);
    lg.rotateZ(Math.PI / 2);
    lg.translate(0, Math.sin(a) * radius * 0.36, Math.cos(a) * radius * 0.36);
    lugParts.push(lg);
  }
  const lugs = mergeGeometries(lugParts, false);
  lugParts.forEach((p) => p.dispose());

  const treadParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const cl = new THREE.BoxGeometry(width * 0.88, radius * 0.09, radius * 0.13);
    cl.rotateX(-a);
    cl.translate(0, Math.sin(a) * radius * 0.99, Math.cos(a) * radius * 0.99);
    treadParts.push(cl);
  }
  const treads = mergeGeometries(treadParts, false);
  treadParts.forEach((p) => p.dispose());

  const bundle = { tire, rim, hub, lugs, treads };
  WHEEL_GEO_CACHE.set(key, bundle);
  return bundle;
}

export function buildWheel(
  radius: number,
  width: number,
  materials: MaterialBank,
  rimColor = 0xd6b449,
): THREE.Group {
  const g = new THREE.Group();
  const geos = getWheelGeoBundle(radius, width);

  const tire = new THREE.Mesh(geos.tire, materials.get('borracha'));
  tire.castShadow = true;
  tire.receiveShadow = true;
  g.add(tire);

  const rim = new THREE.Mesh(geos.rim, materials.get('tinta', { color: rimColor, metalness: 0.45 }));
  g.add(rim);

  const hub = new THREE.Mesh(geos.hub, materials.get('aco', { color: 0x454b4e }));
  g.add(hub);

  const lugs = new THREE.Mesh(geos.lugs, materials.get('aco', { color: 0xd0d6d8 }));
  g.add(lugs);

  const treads = new THREE.Mesh(geos.treads, materials.get('borracha', { color: 0x16191a }));
  g.add(treads);

  return g;
}

export function buildPessoa(
  idx: number,
  hasHelmet: boolean,
  materials: MaterialBank,
): AnimatedPerson {
  const group = new THREE.Group();
  const skinTones = [0xd49c74, 0xc48862, 0x9b6446, 0xe0b28e];
  const shirtTones = [0x215d58, 0x2a4f6e, 0x3b6043, 0x455a64, 0x344955];
  const pantTones = [0x28353f, 0x343a40, 0x3d352a];

  const skin = materials.get('liso', { color: skinTones[idx % skinTones.length], dust: 0.1 });
  const shirt = materials.get('lona', { color: shirtTones[idx % shirtTones.length], dust: 0.2 });
  const pants = materials.get('lona', { color: pantTones[idx % pantTones.length], dust: 0.45 });
  const vest = materials.get('liso', { color: 0xebb126, dust: 0.1 });
  const boot = materials.get('borracha', { color: 0x1d1a17 });

  // Boots + Legs
  for (const sx of [-0.11, 0.11]) {
    addRBox(group, 0.13, 0.12, 0.22, sx, 0.06, 0.03, boot, 0.03);
    addCyl(group, 0.075, 0.065, 0.74, sx, 0.47, 0, pants, 10);
  }

  // Pelvis, Belt & Torso
  addRBox(group, 0.34, 0.16, 0.21, 0, 0.88, 0, pants, 0.05);
  addRBox(group, 0.36, 0.045, 0.225, 0, 0.96, 0, boot, 0.01);
  addRBox(group, 0.38, 0.46, 0.23, 0, 1.18, 0, shirt, 0.06);

  // Reflective safety vest on field/industrial staff
  if (hasHelmet) {
    addRBox(group, 0.4, 0.36, 0.25, 0, 1.19, 0, vest, 0.04);
    const stripeMat = materials.get('liso', { color: 0xeaf6f4, roughness: 0.2 });
    addRBox(group, 0.41, 0.04, 0.26, 0, 1.09, 0, stripeMat, 0.01, false);
    addRBox(group, 0.41, 0.04, 0.26, 0, 1.24, 0, stripeMat, 0.01, false);
  }

  // Neck & Head + facial detail
  addCyl(group, 0.055, 0.06, 0.1, 0, 1.44, 0, skin, 8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skin);
  head.position.set(0, 1.57, 0);
  head.scale.set(0.92, 1.05, 0.96);
  head.castShadow = true;
  group.add(head);

  const eyeMat = materials.get('liso', { color: 0x1c1917, roughness: 0.3 });
  for (const ex of [-0.036, 0.036]) {
    addRBox(group, 0.022, 0.014, 0.02, ex, 1.57, 0.108, eyeMat, 0.004, false);
    addRBox(group, 0.028, 0.008, 0.018, ex, 1.594, 0.106, eyeMat, 0.002, false);
  }

  if (hasHelmet) {
    const hatMat = materials.get('liso', { color: idx === 1 ? 0x00968c : 0xe4e8e2, roughness: 0.35 });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.54),
      hatMat,
    );
    dome.position.set(0, 1.59, 0);
    dome.castShadow = true;
    group.add(dome);
    addCyl(group, 0.15, 0.155, 0.02, 0, 1.59, 0.02, hatMat, 12, false);
  } else {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.124, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
      materials.get('liso', { color: 0x2b211a }),
    );
    hair.position.set(0, 1.59, -0.01);
    group.add(hair);
  }

  // Left arm holding clipboard/tablet
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.24, 1.36, 0);
  addCyl(leftArm, 0.052, 0.044, 0.38, 0, -0.18, 0.08, shirt, 8);
  addCyl(leftArm, 0.04, 0.036, 0.1, 0, -0.36, 0.16, skin, 8);
  addRBox(
    leftArm,
    0.22,
    0.025,
    0.28,
    0.04,
    -0.36,
    0.26,
    materials.get('aco', { color: 0x162426 }),
    0.01,
  );
  leftArm.rotation.x = -0.35;
  group.add(leftArm);

  // Right arm (waves when player approaches)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.24, 1.36, 0);
  addCyl(rightArm, 0.052, 0.044, 0.42, 0, -0.2, 0, shirt, 8);
  addCyl(rightArm, 0.04, 0.036, 0.1, 0, -0.44, 0, skin, 8);
  group.add(rightArm);

  return { group, rightArm, leftArm, head, baseY: 0 };
}

export function buildPickupTruck(
  bodyHex: number,
  materials: MaterialBank,
  collisions?: CollisionWorld,
  wx?: number,
  wz?: number,
): THREE.Group {
  const g = new THREE.Group();
  const body = materials.get('tinta', { color: bodyHex, roughness: 0.38, metalness: 0.4 });
  const dark = materials.get('borracha', { color: 0x202426 });
  const chrome = materials.get('aco', { color: 0xcfd6d8, roughness: 0.2 });

  // Chassis & Lower body
  addRBox(g, 4.75, 0.58, 1.92, 0, 0.72, 0, body, 0.08);
  // Hood sculpt
  addRBox(g, 1.48, 0.2, 1.84, -1.52, 1.06, 0, body, 0.06);
  // Cab
  addRBox(g, 1.68, 0.74, 1.76, 0.05, 1.36, 0, body, 0.09);
  // Glass greenhouse
  addRBox(g, 1.56, 0.56, 1.8, 0.05, 1.38, 0, materials.glass, 0.04, false);
  // Cargo bed walls + dark bedliner
  addRBox(g, 1.58, 0.48, 1.88, 1.56, 1.08, 0, body, 0.05);
  addRBox(g, 1.44, 0.1, 1.7, 1.56, 1.24, 0, dark, 0.02, false);
  // Rollbar / santo-antônio
  addCyl(g, 0.04, 0.04, 0.65, 0.94, 1.52, -0.78, chrome, 8);
  addCyl(g, 0.04, 0.04, 0.65, 0.94, 1.52, 0.78, chrome, 8);
  addRBox(g, 0.08, 0.08, 1.62, 0.94, 1.84, 0, chrome, 0.02);

  // Front grille & bumpers
  addRBox(g, 0.12, 0.36, 1.3, -2.38, 0.78, 0, chrome, 0.03);
  addRBox(g, 0.2, 0.18, 1.94, -2.38, 0.48, 0, dark, 0.04);
  addRBox(g, 0.18, 0.18, 1.94, 2.38, 0.48, 0, dark, 0.04);

  // Headlights
  const lampMat = new THREE.MeshStandardNodeMaterial({
    color: 0xffffff,
    emissive: 0xffe4a0,
    emissiveIntensity: 0.7,
  });
  for (const sz of [-0.72, 0.72]) {
    addRBox(g, 0.08, 0.16, 0.24, -2.38, 0.88, sz, lampMat, 0.02, false);
  }

  // 4 wheels
  for (const [wxOff, wzOff] of [
    [-1.45, -0.92],
    [-1.45, 0.92],
    [1.45, -0.92],
    [1.45, 0.92],
  ]) {
    const w = buildWheel(0.41, 0.28, materials, 0xbec5c7);
    w.rotation.y = Math.PI / 2;
    w.position.set(wxOff, 0.41, wzOff);
    g.add(w);
  }

  if (collisions && wx !== undefined && wz !== undefined) {
    collisions.addBox(wx, wz, 5.1, 2.3);
  }
  return g;
}

export function buildTractor(
  colorHex: number,
  materials: MaterialBank,
  openHood = false,
): THREE.Group {
  const g = new THREE.Group();
  const paint = materials.get('tinta', { color: colorHex, roughness: 0.42, metalness: 0.35 });
  const dark = materials.get('ferrugem', { color: 0x2d3032, roughness: 0.75 });
  const aco = materials.get('aco', { color: 0x899294 });

  // Heavy chassis frame + front counterweight
  addRBox(g, 3.3, 0.46, 1.05, 0, 0.92, 0, dark, 0.06);
  addRBox(g, 0.42, 0.52, 1.15, -1.85, 0.92, 0, dark, 0.05);

  // Engine block & hood (tilted open if under maintenance!)
  addRBox(g, 1.35, 0.62, 0.84, -0.82, 1.38, 0, dark, 0.04);
  const hood = new THREE.Group();
  hood.position.set(-0.15, 1.72, 0);
  addRBox(hood, 1.55, 0.54, 1.06, -0.78, -0.05, 0, paint, 0.1);
  if (openHood) hood.rotation.z = -0.46;
  g.add(hood);

  // Vertical exhaust stack
  addCyl(g, 0.06, 0.075, 1.35, -0.35, 2.22, -0.58, dark, 8);
  addCyl(g, 0.09, 0.09, 0.18, -0.35, 2.55, -0.58, aco, 8);

  // Glazed ROPS Cab
  addRBox(g, 1.36, 1.24, 1.38, 0.72, 2.02, 0, dark, 0.05);
  addRBox(g, 1.28, 1.02, 1.42, 0.72, 2.05, 0, materials.glass, 0.03, false);
  addRBox(g, 1.56, 0.16, 1.58, 0.72, 2.72, 0, paint, 0.05);

  // Rear fenders
  for (const sz of [-1.02, 1.02]) {
    addRBox(g, 1.25, 0.14, 0.56, 0.95, 1.62, sz, paint, 0.04);
  }

  // Front & Rear agricultural tires
  for (const sz of [-0.95, 0.95]) {
    const fw = buildWheel(0.54, 0.36, materials, 0xd8be55);
    fw.rotation.y = Math.PI / 2;
    fw.position.set(-1.15, 0.54, sz);
    g.add(fw);

    const rw = buildWheel(0.84, 0.52, materials, 0xd8be55);
    rw.rotation.y = Math.PI / 2;
    rw.position.set(0.95, 0.84, sz * 1.08);
    g.add(rw);
  }

  return g;
}

export function buildHarvester(materials: MaterialBank, texLib: TextureLibrary): HarvesterRig {
  const g = new THREE.Group();
  const body = materials.get('tinta', { color: 0xd9a028, roughness: 0.42, metalness: 0.35 });
  const trim = materials.get('tinta', { color: 0x1b4642, roughness: 0.45 });
  const steel = materials.get('aco', { color: 0x626b6e });
  const dark = materials.get('ferrugem', { color: 0x25282a });

  // Crawler track assemblies (left/right)
  for (const sz of [-1.35, 1.35]) {
    addRBox(g, 3.6, 0.56, 0.62, 0.2, 0.52, sz, dark, 0.18);
    for (let r = -1.3; r <= 1.5; r += 0.7) {
      addCyl(g, 0.26, 0.26, 0.68, r, 0.44, sz, steel, 10).rotation.x = Math.PI / 2;
    }
  }

  // Main machine chassis & cooling louvers
  addRBox(g, 4.9, 1.68, 2.25, 0.35, 1.72, 0, body, 0.1);
  addRBox(g, 2.2, 0.72, 2.3, 1.45, 2.05, 0, trim, 0.06);
  addRBox(g, 1.9, 0.52, 2.32, 1.45, 1.65, 0, dark, 0.04); // radiator grille

  // Operator forward cabin
  addRBox(g, 1.75, 1.52, 1.88, -1.05, 2.98, 0, trim, 0.08);
  addRBox(g, 1.68, 1.24, 1.94, -1.08, 3.02, 0, materials.glass, 0.04, false);
  addRBox(g, 1.95, 0.18, 2.08, -1.05, 3.82, 0, body, 0.06);

  // Front sugarcane gathering snouts & rotary base cutter
  const cutter = new THREE.Group();
  cutter.position.set(-2.65, 0.8, 0);
  for (const sz of [-0.88, 0.88]) {
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.45, 8), body);
    snout.rotation.z = Math.PI / 2;
    snout.position.set(-0.3, -0.15, sz);
    snout.castShadow = true;
    cutter.add(snout);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.55, 12), steel);
  drum.rotation.x = Math.PI / 2;
  drum.castShadow = true;
  cutter.add(drum);
  g.add(cutter);

  // Topper mast
  addRBox(g, 0.22, 1.45, 0.22, -2.25, 2.4, 0, steel, 0.03);
  addCyl(g, 0.72, 0.72, 0.14, -2.55, 3.05, 0, trim, 10);

  // Articulated elevator discharge boom aiming left toward transbordo (+Z side)
  const boom = new THREE.Group();
  boom.position.set(1.2, 2.65, 0.4);
  boom.rotation.y = -0.35;
  boom.rotation.x = -0.45;
  addRBox(boom, 0.72, 0.52, 4.4, 0, 0, 2.0, steel, 0.04);
  addRBox(boom, 0.6, 0.35, 1.0, 0, -0.35, 4.15, trim, 0.04);
  g.add(boom);

  // Work headlights
  const headlights: THREE.Mesh[] = [];
  for (const sz of [-0.68, 0.68]) {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.16, 0.24),
      new THREE.MeshStandardNodeMaterial({
        color: 0xffffff,
        emissive: 0xffe49c,
        emissiveIntensity: 1.5,
      }),
    );
    hl.position.set(-2.02, 3.74, sz);
    g.add(hl);
    headlights.push(hl);
  }

  // Red dust plume spheres emitted behind chopper/extractor fan
  const dustMat = new THREE.SpriteMaterial({
    map: texLib.dustSpriteTex,
    color: 0xc26e44,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const dustMotes: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Sprite(dustMat.clone());
    sp.scale.setScalar(1.2);
    g.add(sp);
    dustMotes.push(sp as unknown as THREE.Mesh);
  }

  return { group: g, cutter, headlights, dustMotes, wheels: [] };
}

export function buildTransbordo(colorHex: number, materials: MaterialBank): TransbordoRig {
  const g = new THREE.Group();
  const tractor = buildTractor(colorHex, materials, false);
  tractor.position.set(-1.6, 0, 0);
  g.add(tractor);

  const basketMat = materials.get('tinta', { color: 0x255b52, roughness: 0.55 });
  const frameMat = materials.get('ferrugem', { color: 0x2b2e30 });
  const caneLoadMat = materials.get('capim', { color: 0x7c8e3d, repeat: [3, 2] });

  // Trailer chassis + hopper
  addRBox(g, 4.6, 0.3, 2.05, 2.4, 0.92, 0, frameMat, 0.04);
  addRBox(g, 4.4, 1.58, 2.22, 2.45, 1.92, 0, basketMat, 0.06);
  // Chopped sugarcane heaped inside trailer
  addRBox(g, 4.1, 0.45, 1.95, 2.45, 2.68, 0, caneLoadMat, 0.14);

  // Tandem flotation tires
  for (const wx of [1.55, 3.25]) {
    for (const wz of [-1.05, 1.05]) {
      const w = buildWheel(0.62, 0.44, materials, 0xd8be55);
      w.rotation.y = Math.PI / 2;
      w.position.set(wx, 0.62, wz);
      g.add(w);
    }
  }

  const headlights: THREE.Mesh[] = [];
  for (const sz of [-0.55, 0.55]) {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.18),
      new THREE.MeshStandardNodeMaterial({
        color: 0xffffff,
        emissive: 0xffe49c,
        emissiveIntensity: 1.2,
      }),
    );
    hl.position.set(-3.15, 2.68, sz);
    g.add(hl);
    headlights.push(hl);
  }

  return { group: g, headlights, wheels: [] };
}

export function buildCaneTruck(materials: MaterialBank, loaded = true): THREE.Group {
  const g = new THREE.Group();
  const cabMat = materials.get('tinta', { color: 0xcf4528, roughness: 0.42 });
  const cageMat = materials.get('tinta', { color: 0x24544c, roughness: 0.5 });
  const dark = materials.get('ferrugem', { color: 0x222629 });
  const caneMat = materials.get('capim', { color: 0x7b893b, repeat: [4, 2] });

  // Tractor unit cab
  addRBox(g, 2.4, 1.95, 2.32, -4.6, 1.72, 0, cabMat, 0.12);
  addRBox(g, 1.15, 1.12, 2.34, -5.25, 2.1, 0, materials.glass, 0.04, false);
  addRBox(g, 0.24, 0.36, 2.38, -5.85, 0.78, 0, dark, 0.04);
  addCyl(g, 0.06, 0.06, 2.4, -3.55, 2.45, -1.08, materials.get('aco'), 8);

  // Main chassis beam
  addRBox(g, 11.4, 0.34, 1.45, 0.2, 0.92, 0, dark, 0.04);

  // Heavy cane cage trailer with vertical ribs
  addRBox(g, 7.6, 2.15, 2.42, 1.95, 2.15, 0, cageMat, 0.05);
  for (let rx = -1.6; rx <= 5.5; rx += 1.18) {
    for (const sz of [-1.23, 1.23]) {
      addRBox(g, 0.12, 2.25, 0.1, rx, 2.15, sz, dark, 0.02);
    }
  }
  if (loaded) {
    addRBox(g, 7.25, 0.55, 2.2, 1.95, 3.22, 0, caneMat, 0.18);
  }

  // 4 axles of dual tires
  for (const ax of [-4.8, -2.5, 0.8, 2.5, 4.2]) {
    for (const sz of [-1.08, 1.08]) {
      const w = buildWheel(0.52, 0.42, materials, 0xb7bec2);
      w.rotation.y = Math.PI / 2;
      w.position.set(ax, 0.52, sz);
      g.add(w);
    }
  }
  return g;
}

export function buildForklift(materials: MaterialBank): THREE.Group {
  const g = new THREE.Group();
  const yellow = materials.get('tinta', { color: 0xe39e1f, roughness: 0.45 });
  const dark = materials.get('ferrugem', { color: 0x222628 });
  const steel = materials.get('aco', { color: 0x9aa2a6 });

  addRBox(g, 2.1, 0.78, 1.18, 0, 0.62, 0, yellow, 0.08);
  addRBox(g, 0.68, 0.92, 1.16, 0.88, 0.86, 0, dark, 0.12); // counterweight
  // Roll cage
  addRBox(g, 1.15, 0.1, 1.12, -0.08, 2.02, 0, dark, 0.03);
  for (const [px, pz] of [
    [-0.58, -0.5],
    [-0.58, 0.5],
    [0.45, -0.5],
    [0.45, 0.5],
  ]) {
    addCyl(g, 0.035, 0.035, 1.05, px, 1.5, pz, dark, 6);
  }

  // Mast + forks
  for (const sz of [-0.36, 0.36]) {
    addRBox(g, 0.12, 2.45, 0.12, -1.12, 1.35, sz, dark, 0.02);
    addRBox(g, 1.15, 0.06, 0.12, -1.68, 0.25, sz * 0.7, steel, 0.01);
  }
  addRBox(g, 0.12, 0.7, 0.92, -1.16, 0.62, 0, dark, 0.02);

  // Sugar big-bag pallet on forks
  addRBox(g, 1.05, 0.14, 1.05, -1.7, 0.36, 0, materials.get('madeira'), 0.02);
  addRBox(g, 0.92, 0.95, 0.92, -1.7, 0.9, 0, materials.get('lona', { color: 0xf0ead8 }), 0.12);

  for (const [wx, r, sz] of [
    [-0.68, 0.36, -0.58],
    [-0.68, 0.36, 0.58],
    [0.68, 0.28, -0.52],
    [0.68, 0.28, 0.52],
  ] as const) {
    const w = buildWheel(r, 0.22, materials, 0x33383a);
    w.rotation.y = Math.PI / 2;
    w.position.set(wx, r, sz);
    g.add(w);
  }
  return g;
}
