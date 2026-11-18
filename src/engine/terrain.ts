import * as THREE from 'three/webgpu';
import { groundHeightAt } from '../game/worldMath';
import type { MaterialBank } from './materials';

export class TerrainSystem {
  public readonly terrainMesh: THREE.Mesh;
  public readonly outerGround: THREE.Mesh;
  public readonly waterMesh: THREE.Mesh;

  constructor(scene: THREE.Scene, materials: MaterialBank) {
    // High-resolution displaced terrain across main playable & vista area (440m x 220m)
    const geo = new THREE.PlaneGeometry(440, 220, 220, 110);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeightAt(x, z));
    }
    geo.computeVertexNormals();

    this.terrainMesh = new THREE.Mesh(geo, materials.createTerrainMaterial());
    this.terrainMesh.receiveShadow = true;
    scene.add(this.terrainMesh);

    // Outer Mato Grosso horizon plane (excludes ocean side)
    const outerGeo = new THREE.PlaneGeometry(2400, 2400, 1, 1);
    outerGeo.rotateX(-Math.PI / 2);
    this.outerGround = new THREE.Mesh(
      outerGeo,
      materials.get('terra', { repeat: [110, 110], dust: 0 }),
    );
    this.outerGround.position.set(-120, -0.45, 0);
    this.outerGround.receiveShadow = true;
    scene.add(this.outerGround);

    // Harbour channel water east of quay wall x = 108
    const waterGeo = new THREE.PlaneGeometry(620, 960, 48, 48);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(waterGeo, materials.water);
    this.waterMesh.position.set(418, -0.55, 0);
    this.waterMesh.receiveShadow = true;
    scene.add(this.waterMesh);

    // Roadway details: concrete kerbs in industrial avenue + rural wooden fence lines
    this.buildRoadDetails(scene, materials);
  }

  private buildRoadDetails(scene: THREE.Scene, materials: MaterialBank): void {
    const postGeo = new THREE.CylinderGeometry(0.075, 0.09, 1.35, 7);
    const railGeo = new THREE.BoxGeometry(3.8, 0.08, 0.06);
    const woodMat = materials.get('madeira', { color: 0x6f533a, repeat: [1, 2] });
    const postCount = 58;
    const posts = new THREE.InstancedMesh(postGeo, woodMat, postCount);
    const rails = new THREE.InstancedMesh(railGeo, woodMat, postCount);
    posts.castShadow = true;
    posts.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let x = -114; x <= -4 && idx < postCount - 1; x += 4.0) {
      for (const side of [-1, 1]) {
        // Leave openings at stop branches
        if (Math.abs(x + 96) < 6 || Math.abs(x + 72) < 5 || Math.abs(x + 48) < 6 || Math.abs(x + 24) < 6) {
          continue;
        }
        if (idx >= postCount) break;
        const z = side * 5.2;
        const y = groundHeightAt(x, z);
        dummy.position.set(x, y + 0.65, z);
        dummy.rotation.set(0, 0, (Math.sin(x) * 0.03));
        dummy.updateMatrix();
        posts.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(x + 1.9, y + 0.92, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        rails.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    posts.count = idx;
    rails.count = idx;
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    scene.add(posts, rails);

    // Concrete curbs bordering the asphalt corridor from x=8 to x=104
    const curbMat = materials.get('concreto', { color: 0xb7b3aa, repeat: [32, 1] });
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(96, 0.18, 0.34), curbMat);
      curb.position.set(56, 0.08, side * 4.35);
      curb.receiveShadow = true;
      curb.castShadow = true;
      scene.add(curb);
    }
  }
}
