import * as THREE from 'three';
import { SUBSTATION_BOUNDS, groundHeightAt } from './logic';
import type { TextureBank } from './textures';

export interface FoliageAndAtmosphere {
  group: THREE.Group;
  setCaneCount: (count: number) => void;
  update: (
    time: number,
    valvePurged: boolean,
    switchIsolated: boolean,
    breakerRestored: boolean,
    climax: number
  ) => void;
  dispose: () => void;
}

function buildSugarcaneClusterGeometry(): THREE.BufferGeometry {
  // Merged stalk + 5 arching leaves so each instance is a lush sugarcane stool
  const positions: number[] = [];
  const normals: number[] = [];
  const heights: number[] = [];

  const pushTri = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    ha: number,
    hb: number,
    hc: number
  ) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    heights.push(ha, hb, hc);
  };

  // 3 sturdy stalks per stool
  for (let s = 0; s < 3; s++) {
    const ang = s * ((Math.PI * 2) / 3) + 0.25;
    const ox = Math.cos(ang) * 0.11;
    const oz = Math.sin(ang) * 0.11;
    const dx = Math.cos(ang + 0.5) * 0.045;
    const dz = Math.sin(ang + 0.5) * 0.045;
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const y0 = (i / segs) * 2.75;
      const y1 = ((i + 1) / segs) * 2.75;
      const w0 = 0.048 * (1 - (i / segs) * 0.42);
      const w1 = 0.048 * (1 - ((i + 1) / segs) * 0.42);
      const a = new THREE.Vector3(ox - dx * w0 * 24, y0, oz - dz * w0 * 24);
      const b = new THREE.Vector3(ox + dx * w0 * 24, y0, oz + dz * w0 * 24);
      const c = new THREE.Vector3(ox + dx * w1 * 24, y1, oz + dz * w1 * 24);
      const d = new THREE.Vector3(ox - dx * w1 * 24, y1, oz - dz * w1 * 24);
      pushTri(a, b, c, y0 / 2.8, y0 / 2.8, y1 / 2.8);
      pushTri(a, c, d, y0 / 2.8, y1 / 2.8, y1 / 2.8);
    }
  }

  // 9 wide arching cane leaves
  for (let l = 0; l < 9; l++) {
    const yaw = (l / 9) * Math.PI * 2 + (l % 2) * 0.24;
    const startY = 0.9 + (l % 4) * 0.42;
    const dirX = Math.cos(yaw);
    const dirZ = Math.sin(yaw);
    const perpX = -dirZ;
    const perpZ = dirX;
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const reach0 = t0 * 1.05;
      const reach1 = t1 * 1.05;
      const y0 = startY + t0 * 0.72 - t0 * t0 * 0.85;
      const y1 = startY + t1 * 0.72 - t1 * t1 * 0.85;
      const w0 = 0.085 * (1 - t0 * 0.74);
      const w1 = 0.085 * (1 - t1 * 0.74);

      const p0L = new THREE.Vector3(dirX * reach0 - perpX * w0, y0, dirZ * reach0 - perpZ * w0);
      const p0R = new THREE.Vector3(dirX * reach0 + perpX * w0, y0, dirZ * reach0 + perpZ * w0);
      const p1R = new THREE.Vector3(dirX * reach1 + perpX * w1, y1, dirZ * reach1 + perpZ * w1);
      const p1L = new THREE.Vector3(dirX * reach1 - perpX * w1, y1, dirZ * reach1 - perpZ * w1);

      const h0 = Math.min(1, y0 * 0.36 + t0 * 0.5);
      const h1 = Math.min(1, y1 * 0.36 + t1 * 0.5);
      pushTri(p0L, p0R, p1R, h0, h0, h1);
      pushTri(p0L, p1R, p1L, h0, h1, h1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('aHeightNorm', new THREE.Float32BufferAttribute(heights, 1));
  return geo;
}

export function createFoliageAndAtmosphere(
  scene: THREE.Scene,
  tex: TextureBank,
  sunDir: THREE.Vector3,
  maxCanes = 2200
): FoliageAndAtmosphere {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  // =========================================================
  // 1. WIND-ANIMATED SUGARCANE FIELD (InstancedMesh)
  // =========================================================
  const caneGeo = buildSugarcaneClusterGeometry();
  geos.push(caneGeo);

  const uTime = { value: 0 };
  const uSunDir = { value: sunDir.clone() };

  const caneMat = new THREE.MeshStandardMaterial({
    color: 0x4b6c28,
    roughness: 0.54,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  caneMat.customProgramCacheKey = () => 'red-dust-sugarcane-wind-v1';

  caneMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uSunDir = uSunDir;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aHeightNorm;
        varying float vCaneH;
        varying vec3 vCaneWorld;
        uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vCaneH = aHeightNorm;
        vec4 cWp = modelMatrix * instanceMatrix * vec4( transformed, 1.0 );
        float gust = sin( cWp.x * 0.17 + cWp.z * 0.13 - uTime * 2.1 ) * 0.65
                   + sin( cWp.x * 0.42 - uTime * 3.4 ) * 0.35;
        float sway = ( 0.08 + 0.18 * gust ) * ( aHeightNorm * aHeightNorm );
        transformed.x += sway;
        transformed.z += sway * 0.45;
        vCaneWorld = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vCaneH;
        varying vec3 vCaneWorld;
        uniform vec3 uSunDir;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Dry golden-brown lower sheath transitioning to rain-wet lush green upper leaves
        vec3 baseStraw = vec3( 0.24, 0.19, 0.09 );
        vec3 lushTop = vec3( 0.25, 0.39, 0.11 );
        diffuseColor.rgb = mix( baseStraw, lushTop, smoothstep( 0.15, 0.72, vCaneH ) );
        // Subtle sunlit leaf translucency toward golden dawn sun
        vec3 vDir = normalize( cameraPosition - vCaneWorld );
        float backSun = pow( max( 1e-4, dot( -vDir, uSunDir ) ), 3.2 );
        diffuseColor.rgb += vec3( 0.48, 0.34, 0.08 ) * backSun * vCaneH * 0.85;`
      );
  };
  mats.push(caneMat);

  const caneMesh = new THREE.InstancedMesh(caneGeo, caneMat, maxCanes);
  caneMesh.castShadow = true;
  caneMesh.receiveShadow = true;

  // Deterministic organic placement in dense perimeter cane belts surrounding the 64x64 yard
  const dummy = new THREE.Object3D();
  let placed = 0;
  let seed = 17;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  while (placed < maxCanes) {
    const band = placed % 4;
    let x = 0;
    let z = 0;
    if (band === 0) {
      x = -46 + rand() * 92;
      z = -28 - rand() * 20;
    } else if (band === 1) {
      x = -29.5 - rand() * 18;
      z = -30 + rand() * 58;
    } else if (band === 2) {
      x = 29.5 + rand() * 18;
      z = -30 + rand() * 58;
    } else {
      const side = rand() < 0.5 ? -1 : 1;
      x = side * (7.2 + rand() * 28);
      z = 30.2 + rand() * 16;
    }

    const y = groundHeightAt(x, z) - 0.06;
    dummy.position.set(x, y, z);
    dummy.rotation.set((rand() - 0.5) * 0.16, rand() * Math.PI * 2, (rand() - 0.5) * 0.16);
    const s = 0.95 + rand() * 0.5;
    dummy.scale.set(s, s * (0.95 + rand() * 0.35), s);
    dummy.updateMatrix();
    caneMesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  caneMesh.instanceMatrix.needsUpdate = true;
  group.add(caneMesh);

  // =========================================================
  // 2. IRREGULAR MULTI-BRANCH CERRADO TREES (No lollipop spheres!)
  // =========================================================
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.28, 3.8, 7);
  const boughGeo = new THREE.CylinderGeometry(0.08, 0.14, 2.4, 6);
  const crownGeo = new THREE.IcosahedronGeometry(1.75, 1);
  geos.push(trunkGeo, boughGeo, crownGeo);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2f2318, roughness: 0.92 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x1d2d16, roughness: 0.88 });
  mats.push(trunkMat, crownMat);

  const treeSpots: [number, number, number][] = [
    [-46, -42, 1.05],
    [-26, -48, 0.95],
    [-6, -50, 1.1],
    [18, -48, 1.0],
    [40, -42, 1.08],
    [46, -12, 0.98],
    [-46, 10, 0.95],
    [-42, 30, 1.02],
  ];
  for (let idx = 0; idx < treeSpots.length; idx++) {
    const [tx, tz, sc] = treeSpots[idx];
    const ty = groundHeightAt(tx, tz);
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    tree.rotation.y = idx * 1.37;

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(0, 1.8 * sc, 0);
    trunk.rotation.z = 0.08;
    trunk.scale.setScalar(sc);
    tree.add(trunk);

    const boughOffsets: [number, number, number, number, number][] = [
      [-0.7, 3.2, 0.3, 0.42, 1.15],
      [0.85, 3.4, -0.4, -0.45, 1.05],
      [0.1, 4.1, 0.55, 0.15, 1.2],
      [-0.25, 3.8, -0.65, -0.22, 0.95],
    ];
    for (const [bx, by, bz, tilt, cScale] of boughOffsets) {
      const bough = new THREE.Mesh(boughGeo, trunkMat);
      bough.position.set(bx * 0.5 * sc, (by - 0.6) * sc, bz * 0.5 * sc);
      bough.rotation.z = tilt;
      bough.scale.setScalar(sc);
      tree.add(bough);

      const lobe = new THREE.Mesh(crownGeo, crownMat);
      lobe.position.set(bx * 1.45 * sc, by * sc, bz * 1.45 * sc);
      lobe.scale.set(sc * cScale * 1.35, sc * cScale * 0.62, sc * cScale * 1.2);
      lobe.rotation.set(0.15, idx + bx, -0.1);
      tree.add(lobe);
    }
    group.add(tree);
  }

  // =========================================================
  // 3. STEAM PLUMES, VALVE LEAK, FAULT SPARKS & PASSAGE DUST
  // =========================================================
  interface Particle {
    sprite: THREE.Sprite;
    origin: THREE.Vector3;
    vel: THREE.Vector3;
    phase: number;
    life: number;
    baseScale: number;
    kind: 'chimney' | 'valve' | 'dust' | 'spark';
  }

  const particles: Particle[] = [];
  const smokeMatA = new THREE.SpriteMaterial({
    map: tex.smokePuff,
    color: 0xf4e3cf,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const smokeMatValve = new THREE.SpriteMaterial({
    map: tex.smokePuff,
    color: 0xe6e9ec,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const dustMat = new THREE.SpriteMaterial({
    map: tex.smokePuff,
    color: 0xffcf94,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparkMat = new THREE.SpriteMaterial({
    map: tex.smokePuff,
    color: 0xff8c38,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  mats.push(smokeMatA, smokeMatValve, dustMat, sparkMat);

  // Chimney steam plumes
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(smokeMatA.clone());
    mats.push(s.material);
    const stackOrigin = i < 14 ? new THREE.Vector3(17.4, 14.7, -18.2) : new THREE.Vector3(19.8, 12.6, -16.4);
    group.add(s);
    particles.push({
      sprite: s,
      origin: stackOrigin,
      vel: new THREE.Vector3(-0.65, 1.9 + (i % 4) * 0.25, 0.35),
      phase: i / 24,
      life: 4.5,
      baseScale: 2.8,
      kind: 'chimney',
    });
  }

  // Valve V-07 steam leak puffs
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(smokeMatValve.clone());
    mats.push(s.material);
    group.add(s);
    particles.push({
      sprite: s,
      origin: new THREE.Vector3(7.6, 1.48, -8.8),
      vel: new THREE.Vector3((i % 3 - 1) * 0.35, 1.25, 0.45),
      phase: i / 12,
      life: 1.6,
      baseScale: 0.65,
      kind: 'valve',
    });
  }

  // Sunlit dust & mist motes inside covered substation passage
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(dustMat.clone());
    mats.push(s.material);
    group.add(s);
    const dx = SUBSTATION_BOUNDS.minX + 1.5 + ((i * 37) % 100) / 100 * 9.0;
    const dy = 0.6 + ((i * 53) % 100) / 100 * 3.6;
    const dz = SUBSTATION_BOUNDS.minZ + 1.5 + ((i * 71) % 100) / 100 * 13.0;
    particles.push({
      sprite: s,
      origin: new THREE.Vector3(dx, dy, dz),
      vel: new THREE.Vector3(0.18, 0.08, 0.06),
      phase: i / 26,
      life: 5.5,
      baseScale: 0.42,
      kind: 'dust',
    });
  }

  // QGBT-04 fault sparks
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(sparkMat.clone());
    mats.push(s.material);
    group.add(s);
    particles.push({
      sprite: s,
      origin: new THREE.Vector3(-13.3, 1.32, -14.1),
      vel: new THREE.Vector3(0.9 + (i % 3) * 0.3, 0.5 - (i % 4) * 0.4, (i % 5 - 2) * 0.4),
      phase: i / 10,
      life: 0.55,
      baseScale: 0.16,
      kind: 'spark',
    });
  }

  scene.add(group);

  return {
    group,
    setCaneCount: (count: number) => {
      caneMesh.count = Math.max(0, Math.min(maxCanes, count));
    },
    update: (
      time: number,
      valvePurged: boolean,
      switchIsolated: boolean,
      breakerRestored: boolean,
      climax: number
    ) => {
      uTime.value = time;

      for (const p of particles) {
        const age = (time / p.life + p.phase) % 1;
        if (p.kind === 'chimney') {
          const boost = breakerRestored ? 1 + climax * 0.65 : 1;
          p.sprite.position.set(
            p.origin.x + p.vel.x * age * p.life * boost + Math.sin(time * 0.7 + p.phase * 9) * 0.55,
            p.origin.y + p.vel.y * age * p.life * boost,
            p.origin.z + p.vel.z * age * p.life * boost
          );
          const sc = p.baseScale * (0.55 + age * 2.2) * (breakerRestored ? 1.25 : 0.85);
          p.sprite.scale.set(sc, sc, 1);
          p.sprite.material.opacity = Math.sin(age * Math.PI) * (breakerRestored ? 0.38 : 0.24);
        } else if (p.kind === 'valve') {
          p.sprite.visible = !valvePurged;
          if (!valvePurged) {
            p.sprite.position.set(
              p.origin.x + p.vel.x * age * p.life,
              p.origin.y + p.vel.y * age * p.life,
              p.origin.z + p.vel.z * age * p.life
            );
            const sc = p.baseScale * (0.4 + age * 1.4);
            p.sprite.scale.set(sc, sc, 1);
            p.sprite.material.opacity = Math.sin(age * Math.PI) * 0.48;
          }
        } else if (p.kind === 'dust') {
          p.sprite.position.set(
            p.origin.x + Math.sin(time * 0.4 + p.phase * 12) * 0.45,
            p.origin.y + Math.cos(time * 0.3 + p.phase * 8) * 0.25,
            p.origin.z + Math.sin(time * 0.25 + p.phase * 6) * 0.35
          );
          const sc = p.baseScale * (0.8 + 0.3 * Math.sin(time + p.phase * 10));
          p.sprite.scale.set(sc, sc, 1);
          p.sprite.material.opacity = 0.14 + climax * 0.08;
        } else if (p.kind === 'spark') {
          const active = !switchIsolated && !breakerRestored;
          p.sprite.visible = active;
          if (active) {
            p.sprite.position.set(
              p.origin.x + p.vel.x * age * p.life,
              p.origin.y + p.vel.y * age * p.life - 1.8 * age * age,
              p.origin.z + p.vel.z * age * p.life
            );
            const sc = p.baseScale * (1 - age * 0.7);
            p.sprite.scale.set(sc, sc, 1);
            p.sprite.material.opacity = (1 - age) * 0.9;
          }
        }
      }
    },
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
