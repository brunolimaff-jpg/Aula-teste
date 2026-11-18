import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  color as tslColor,
  mix,
  positionLocal,
  positionWorld,
  sin,
  smoothstep,
  texture,
  time,
  uv,
  vec3,
} from 'three/tsl';
import { groundHeightAt, isCaneExclusionAt, type CollisionWorld } from '../game/worldMath';
import type { TextureLibrary } from './textures';
import type { MaterialBank } from './materials';
import type { QualityBudget } from './quality';

interface ChunkSet {
  cx: number;
  cz: number;
  lod0: THREE.InstancedMesh;
  lod1: THREE.InstancedMesh;
  lod2: THREE.InstancedMesh;
}

function buildCrossedCaneCardGeometry(): THREE.BufferGeometry {
  const planes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.PlaneGeometry(2.55, 3.85, 1, 1);
    p.translate(0, 1.9, 0);
    p.rotateY((i * Math.PI) / 3);
    planes.push(p);
  }
  return mergeGeometries(planes, false)!;
}

/**
 * Detailed 3D sugarcane clump (LOD0): real cylindrical segmented stalks + curved arching leaf blades.
 */
function buildDetailed3DCaneGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const stalkCount = 5;
  for (let i = 0; i < stalkCount; i++) {
    const angle = (i / stalkCount) * Math.PI * 2 + (i % 2) * 0.35;
    const rad = i === 0 ? 0.04 : 0.24 + (i % 2) * 0.12;
    const h = 2.9 + (i % 3) * 0.35;
    const stalk = new THREE.CylinderGeometry(0.022, 0.036, h, 5, 3);
    stalk.translate(0, h * 0.5, 0);
    stalk.rotateZ(Math.cos(angle) * 0.09);
    stalk.rotateX(Math.sin(angle) * 0.09);
    stalk.translate(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
    parts.push(stalk);

    // Arching leaves emerging along upper half
    for (let l = 0; l < 3; l++) {
      const ly = h * (0.58 + l * 0.14);
      const lAngle = angle + l * 2.1;
      const blade = new THREE.PlaneGeometry(0.14, 1.05, 1, 3);
      const bPos = blade.attributes.position;
      for (let v = 0; v < bPos.count; v++) {
        const py = bPos.getY(v) + 0.525; // 0..1.05
        const t = py / 1.05;
        bPos.setY(v, Math.sin(t * Math.PI * 0.65) * 0.42 - t * t * 0.25);
        bPos.setZ(v, py * 0.88);
        // Taper leaf tip
        bPos.setX(v, bPos.getX(v) * (1 - t * 0.85));
      }
      blade.computeVertexNormals();
      blade.rotateY(lAngle);
      blade.translate(Math.cos(angle) * rad, ly, Math.sin(angle) * rad);
      parts.push(blade);
    }
  }
  return mergeGeometries(parts, false)!;
}

function buildDistantCaneBlockGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(1.05, 1.35, 1.85, 6, 1);
  base.translate(0, 0.92, 0);
  const crown = new THREE.ConeGeometry(1.12, 0.72, 6, 1);
  crown.translate(0, 2.15, 0);
  return mergeGeometries([base, crown], false)!;
}

export class VegetationSystem {
  public readonly chunks: ChunkSet[] = [];
  public readonly grassMesh: THREE.InstancedMesh;
  private readonly lod1Material: THREE.MeshStandardNodeMaterial;
  private readonly lod0Material: THREE.MeshStandardNodeMaterial;
  private readonly lod2Material: THREE.MeshStandardNodeMaterial;

  constructor(
    scene: THREE.Scene,
    texLib: TextureLibrary,
    materials: MaterialBank,
    collisions: CollisionWorld,
  ) {
    // Wind displacement expression in TSL
    const windOffset = (heightRef: typeof positionLocal.y) => {
      const swayStrength = smoothstep(0.3, 3.6, heightRef);
      const phase = time
        .mul(1.75)
        .add(positionWorld.x.mul(0.22))
        .add(positionWorld.z.mul(0.17));
      const gust = sin(phase).mul(0.14).add(sin(phase.mul(2.3)).mul(0.04));
      return positionLocal.add(vec3(gust.mul(swayStrength), 0, gust.mul(0.45).mul(swayStrength)));
    };

    // LOD0 3D Stalks & Leaves Material
    this.lod0Material = new THREE.MeshStandardNodeMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const heightGrad0 = smoothstep(0.0, 3.5, positionLocal.y);
    const stalkCol0 = mix(vec3(0.38, 0.34, 0.16), vec3(0.41, 0.57, 0.18), heightGrad0);
    this.lod0Material.colorNode = stalkCol0;
    this.lod0Material.positionNode = windOffset(positionLocal.y);

    // LOD1 Crossed Card Material
    this.lod1Material = new THREE.MeshStandardNodeMaterial({
      map: texLib.caneCardTex,
      alphaTest: 0.42,
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const caneTexNode = texture(texLib.caneCardTex, uv());
    this.lod1Material.colorNode = caneTexNode.rgb;
    this.lod1Material.opacityNode = caneTexNode.a;
    this.lod1Material.positionNode = windOffset(positionLocal.y);

    // LOD2 Distant Impostor Mass Material
    this.lod2Material = new THREE.MeshStandardNodeMaterial({
      roughness: 0.96,
      metalness: 0,
    });
    const hGrad2 = smoothstep(0.0, 2.5, positionLocal.y);
    this.lod2Material.colorNode = mix(vec3(0.11, 0.17, 0.06), vec3(0.19, 0.3, 0.09), hGrad2);
    this.lod2Material.positionNode = windOffset(positionLocal.y);

    this.buildSugarcaneChunks(scene);
    this.grassMesh = this.buildRoadsideGrass(scene, texLib);
    this.buildCerradoTrees(scene, materials, collisions);
  }

  private buildSugarcaneChunks(scene: THREE.Scene): void {
    const lod0Geo = buildDetailed3DCaneGeometry();
    const lod1Geo = buildCrossedCaneCardGeometry();
    const lod2Geo = buildDistantCaneBlockGeometry();

    const chunkMap = new Map<string, { pos: THREE.Vector3; rot: number; scl: number; col: THREE.Color }[]>();

    for (let x = -148; x <= 10; x += 1.25) {
      for (const side of [-1, 1]) {
        for (let z = 6.8; z <= 68; z += 1.6) {
          const jx = x + (Math.sin(x * 1.7 + z * 0.9) * 0.32);
          const jz = side * (z + Math.cos(x * 0.8 - z * 1.4) * 0.32);
          if (isCaneExclusionAt(jx, jz)) continue;

          // Pest/yellowed patch visible at Talhão 12 (ev-geo1 around x=-75.5, z=15.5)
          const dMancha = Math.hypot(jx + 75.5, jz - 15.5);
          const isPest = dMancha < 7.5;
          const col = new THREE.Color();
          if (isPest) {
            col.setHSL(0.13 + (dMancha / 7.5) * 0.05, 0.72, 0.52);
          } else {
            const h = 0.22 + Math.abs(Math.sin(jx * 0.17 + jz * 0.23)) * 0.07;
            const l = 0.72 + Math.cos(jx * 0.41 - jz * 0.31) * 0.16;
            col.setHSL(h, 0.42, l);
          }

          const cx = Math.floor(jx / 40) * 40 + 20;
          const cz = side * 38;
          const key = `${cx},${cz}`;
          let list = chunkMap.get(key);
          if (!list) {
            list = [];
            chunkMap.set(key, list);
          }
          list.push({
            pos: new THREE.Vector3(jx, groundHeightAt(jx, jz) - 0.05, jz),
            rot: ((jx * 1.3 + jz * 2.1) % (Math.PI * 2)),
            scl: isPest ? 0.72 : 0.86 + Math.abs(Math.sin(jx * 0.7)) * 0.32,
            col,
          });
        }
      }
    }

    const dummy = new THREE.Object3D();
    for (const [key, items] of chunkMap.entries()) {
      const [cxStr, czStr] = key.split(',');
      const cx = Number(cxStr);
      const cz = Number(czStr);
      const count = items.length;

      const lod0 = new THREE.InstancedMesh(lod0Geo, this.lod0Material, count);
      const lod1 = new THREE.InstancedMesh(lod1Geo, this.lod1Material, count);
      const lod2 = new THREE.InstancedMesh(lod2Geo, this.lod2Material, Math.max(1, Math.ceil(count / 4)));

      lod0.castShadow = true;
      lod0.receiveShadow = true;
      lod1.castShadow = false;
      lod1.receiveShadow = true;
      lod2.castShadow = false;
      lod2.receiveShadow = true;

      let l2Idx = 0;
      for (let i = 0; i < count; i++) {
        const it = items[i];
        dummy.position.copy(it.pos);
        dummy.rotation.set(0, it.rot, 0);
        dummy.scale.set(it.scl, it.scl, it.scl);
        dummy.updateMatrix();
        lod0.setMatrixAt(i, dummy.matrix);
        lod0.setColorAt(i, it.col);
        lod1.setMatrixAt(i, dummy.matrix);
        lod1.setColorAt(i, it.col);

        if (i % 4 === 0 && l2Idx < lod2.count) {
          dummy.scale.set(it.scl * 1.35, it.scl * 0.95, it.scl * 1.35);
          dummy.updateMatrix();
          lod2.setMatrixAt(l2Idx, dummy.matrix);
          lod2.setColorAt(l2Idx, it.col);
          l2Idx++;
        }
      }
      lod2.count = l2Idx;
      lod0.instanceMatrix.needsUpdate = true;
      lod1.instanceMatrix.needsUpdate = true;
      lod2.instanceMatrix.needsUpdate = true;
      if (lod0.instanceColor) lod0.instanceColor.needsUpdate = true;
      if (lod1.instanceColor) lod1.instanceColor.needsUpdate = true;
      if (lod2.instanceColor) lod2.instanceColor.needsUpdate = true;

      lod0.visible = false;
      lod1.visible = true;
      lod2.visible = false;

      scene.add(lod0, lod1, lod2);
      this.chunks.push({ cx, cz, lod0, lod1, lod2 });
    }
  }

  private buildRoadsideGrass(scene: THREE.Scene, texLib: TextureLibrary): THREE.InstancedMesh {
    const blades: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.PlaneGeometry(0.9, 0.58, 1, 1);
      p.translate(0, 0.27, 0);
      p.rotateY((i * Math.PI) / 3);
      blades.push(p);
    }
    const geo = mergeGeometries(blades, false)!;
    const mat = new THREE.MeshStandardNodeMaterial({
      map: texLib.grassCardTex,
      alphaTest: 0.36,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });
    const phase = time.mul(2.1).add(positionWorld.x.mul(0.35));
    const sway = smoothstep(0.08, 0.58, positionLocal.y).mul(sin(phase)).mul(0.06);
    const grassTex = texture(texLib.grassCardTex, uv());
    mat.positionNode = positionLocal.add(vec3(sway, 0, 0));
    mat.colorNode = grassTex.rgb.mul(tslColor(0xbac670));
    mat.opacityNode = grassTex.a;

    const maxCount = 520;
    const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let x = -132; x <= 6 && idx < maxCount; x += 0.95) {
      for (const side of [-1, 1]) {
        if (idx >= maxCount) break;
        const z = side * (4.1 + (Math.sin(x * 3.1) * 0.5 + 0.5) * 1.9);
        if (Math.abs(x + 96) < 4 || Math.abs(x + 72) < 4 || Math.abs(x + 48) < 4 || Math.abs(x + 24) < 4) {
          continue;
        }
        dummy.position.set(x, groundHeightAt(x, z) - 0.04, z);
        dummy.rotation.set(0, x * 1.7, 0);
        const s = 0.65 + (Math.cos(x * 2.3 + side) * 0.5 + 0.5) * 0.55;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  }

  private buildCerradoTrees(
    scene: THREE.Scene,
    materials: MaterialBank,
    collisions: CollisionWorld,
  ): void {
    const spots: [number, number, number][] = [
      [-118, -18, 1.15],
      [-112, 16, 0.95],
      [-103, -24, 1.05],
      [-86, -15, 0.9],
      [-82, 22, 1.2],
      [-60, -16, 0.95],
      [-34, 19, 1.1],
      [-12, -16, 1.0],
      [14, -22, 1.05],
      [42, 24, 1.1],
      [68, -22, 1.15],
      [82, -21, 0.9],
    ];

    const trunkMat = materials.get('madeira', { color: 0x76573e, repeat: [1, 3], dust: 0.35 });
    const leafMatGreen = materials.get('capim', { color: 0x8cc256, repeat: [2, 2], dust: 0, roughness: 0.78 });
    const leafMatIpe = materials.get('capim', { color: 0xfad044, repeat: [2, 2], dust: 0, roughness: 0.74 }); // Ipê-amarelo cerrado accent

    spots.forEach(([x, z, scl], idx) => {
      const y = groundHeightAt(x, z);
      const group = new THREE.Group();
      group.position.set(x, y, z);

      // Forked gnarled cerrado trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16 * scl, 0.34 * scl, 3.2 * scl, 8),
        trunkMat,
      );
      trunk.position.y = 1.55 * scl;
      trunk.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.08;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      const branchAngles = [0.3, 2.4, 4.5];
      branchAngles.forEach((a, bi) => {
        const br = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08 * scl, 0.14 * scl, 2.0 * scl, 6),
          trunkMat,
        );
        br.position.set(Math.cos(a) * 0.65 * scl, 3.1 * scl, Math.sin(a) * 0.65 * scl);
        br.rotation.z = -Math.cos(a) * 0.55;
        br.rotation.x = Math.sin(a) * 0.55;
        br.castShadow = true;
        group.add(br);

        // Multi-lobe organic foliage cluster
        const lobe = new THREE.Mesh(
          new THREE.IcosahedronGeometry((1.45 + (bi % 2) * 0.35) * scl, 1),
          idx === 1 || idx === 9 ? leafMatIpe : leafMatGreen,
        );
        lobe.scale.set(1.25, 0.72, 1.15);
        lobe.position.set(Math.cos(a) * 1.15 * scl, (4.0 + bi * 0.25) * scl, Math.sin(a) * 1.15 * scl);
        lobe.castShadow = true;
        lobe.receiveShadow = true;
        group.add(lobe);
      });

      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.7 * scl, 1),
        idx === 1 || idx === 9 ? leafMatIpe : leafMatGreen,
      );
      crown.scale.set(1.3, 0.75, 1.3);
      crown.position.set(0, 4.5 * scl, 0);
      crown.castShadow = true;
      crown.receiveShadow = true;
      group.add(crown);

      scene.add(group);
      collisions.addCircle(x, z, 0.9 * scl);
    });
  }

  public updateLOD(playerX: number, playerZ: number, budget: QualityBudget): void {
    const lod0R = budget.caneLod0Radius;
    const lod1R = 98;
    for (const ch of this.chunks) {
      const dist = Math.hypot(ch.cx - playerX, ch.cz - playerZ);
      const maxCane = ch.lod1.geometry ? ch.lod1.instanceMatrix.count : 0;

      if (dist > 185) {
        ch.lod0.visible = false;
        ch.lod1.visible = false;
        ch.lod2.visible = false;
      } else if (lod0R > 0 && dist < lod0R + 22) {
        ch.lod0.visible = true;
        ch.lod0.count = Math.floor(maxCane * budget.caneDensityScale);
        ch.lod1.visible = false;
        ch.lod2.visible = false;
      } else if (dist < lod1R + 22) {
        ch.lod0.visible = false;
        ch.lod1.visible = true;
        ch.lod1.count = Math.floor(maxCane * budget.caneDensityScale);
        ch.lod2.visible = false;
      } else {
        ch.lod0.visible = false;
        ch.lod1.visible = false;
        ch.lod2.visible = true;
      }
    }
    this.grassMesh.count = Math.floor(520 * budget.grassCountScale);
  }
}
