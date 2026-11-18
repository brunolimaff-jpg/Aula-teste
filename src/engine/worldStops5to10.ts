import * as THREE from 'three/webgpu';
import { groundHeightAt, type CollisionWorld } from '../game/worldMath';
import { TextureLibrary } from './textures';
import type { MaterialBank } from './materials';
import { addCyl, addRBox, buildCaneTruck, buildForklift, buildPickupTruck } from './fleetAndPeople';

export interface SteamPlume {
  mesh: THREE.Sprite;
  x: number;
  y: number;
  z: number;
  phase: number;
}

export interface IndustryPortHandles {
  roadTruck: THREE.Group;
  ship: THREE.Group;
  steamPlumes: SteamPlume[];
  forklift: THREE.Group;
}

function addIndustrialSign(
  scene: THREE.Scene,
  materials: MaterialBank,
  l1: string,
  l2: string,
  x: number,
  z: number,
  rotY: number,
): void {
  const g = new THREE.Group();
  const steel = materials.get('aco', { color: 0x5c6669 });
  addCyl(g, 0.06, 0.07, 1.85, -0.9, 0.92, -0.09, steel, 8);
  addCyl(g, 0.06, 0.07, 1.85, 0.9, 0.92, -0.09, steel, 8);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 1.25, 0.09),
    TextureLibrary.createSignboardMaterial([l1, l2]),
  );
  board.position.set(0, 1.95, 0.02);
  board.castShadow = true;
  g.add(board);
  g.position.set(x, groundHeightAt(x, z), z);
  g.rotation.y = rotY;
  scene.add(g);
}

export function buildIndustryAndPortStops5to10(
  scene: THREE.Scene,
  texLib: TextureLibrary,
  materials: MaterialBank,
  collisions: CollisionWorld,
): IndustryPortHandles {
  const concrete = materials.get('concreto', { color: 0xb2ada4, repeat: [4, 4] });
  const steel = materials.get('aco', { color: 0x737d82 });
  const darkSteel = materials.get('ferrugem', { color: 0x313638 });
  const corrugated = materials.get('chapa', { color: 0x727f82, repeat: [5, 3] });
  const corrugatedTeal = materials.get('chapa', { color: 0x1e5c56, repeat: [4, 3] });
  const stainless = materials.get('aco', { color: 0xcdd4d8, roughness: 0.24, metalness: 0.88 });
  const safetyYellow = materials.get('tinta', { color: 0xe6a822 });
  const plaster = materials.get('reboco', { color: 0xeae5d9, repeat: [3, 2] });
  const wood = materials.get('madeira', { color: 0x705136 });
  const lona = materials.get('lona', { color: 0xf0ebd8 });

  // ==========================================================
  // PARADA 5 — BALANÇA / ORIGINAÇÃO (11:30) x=0, z=-18
  // ==========================================================
  {
    const g = new THREE.Group();
    g.position.set(0, groundHeightAt(0, -18), -18);

    // Weighbridge concrete pit & steel weigh deck
    addRBox(g, 18.0, 0.26, 4.4, 0, 0.13, 2.2, concrete, 0.04);
    addRBox(g, 16.4, 0.18, 3.6, 0, 0.28, 2.2, darkSteel, 0.02);
    // Yellow safety curbs along bridge
    for (const sz of [0.35, 4.05]) {
      addRBox(g, 16.6, 0.28, 0.16, 0, 0.4, sz, safetyYellow, 0.03);
    }

    // Weighbridge operator booth with glass windows & interior monitor
    addRBox(g, 4.4, 3.1, 3.8, -4.5, 1.55, -2.5, plaster, 0.06);
    addRBox(g, 4.9, 0.22, 4.4, -4.5, 3.22, -2.5, corrugatedTeal, 0.04);
    addRBox(g, 3.4, 1.25, 3.9, -4.5, 1.95, -2.5, materials.glass, 0.02, false);

    // Digital LED weight display board ("28.4 t")
    const ledMat = TextureLibrary.createSignboardMaterial(['BALANÇA 01', '28,4 t · OK'], '#0c2326', '#ffc93c');
    const display = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.15, 0.18), ledMat);
    display.position.set(3.2, 3.4, -0.5);
    g.add(display);
    addCyl(g, 0.08, 0.09, 3.4, 3.2, 1.7, -0.5, steel, 8);

    // Striped barrier arm
    addRBox(g, 0.35, 1.05, 0.35, 7.6, 0.52, 0.2, safetyYellow, 0.04);
    addCyl(g, 0.045, 0.055, 3.8, 7.6, 1.05, 2.1, materials.get('tinta', { color: 0xd93d2b }), 8).rotation.x =
      Math.PI / 2;

    // Cane truck parked for weighing on weighbridge
    const bridgeTruck = buildCaneTruck(materials, true);
    bridgeTruck.position.set(0.2, 0.36, 2.2);
    g.add(bridgeTruck);

    scene.add(g);
    collisions.addBox(0, -18, 17.5, 9.5);
    addIndustrialSign(scene, materials, 'BALANÇA', 'Originação', -7, -12, 0.2);
  }

  // Moving sugarcane truck along main road (Carga 41)
  const roadTruck = buildCaneTruck(materials, true);
  roadTruck.rotation.y = Math.PI;
  scene.add(roadTruck);

  // ==========================================================
  // PARADA 6 — INDÚSTRIA (13:00) x=26, z=22
  // ==========================================================
  const steamPlumes: SteamPlume[] = [];
  {
    const ix = 26;
    const iz = 24;
    const g = new THREE.Group();
    g.position.set(ix, groundHeightAt(ix, iz), iz);

    // Main mill hall with structural pilasters & multi-tier roof monitor
    addRBox(g, 20.5, 9.4, 13.0, -2.0, 4.7, 0, corrugated, 0.06);
    addRBox(g, 16.0, 2.2, 6.2, -2.0, 10.4, 0, corrugatedTeal, 0.05);
    // Clerestory warm industrial windows
    const hallGlow = new THREE.MeshStandardNodeMaterial({
      color: 0xffd28a,
      emissive: 0xffa740,
      emissiveIntensity: 0.65,
    });
    addRBox(g, 15.2, 0.75, 6.3, -2.0, 9.9, 0, hallGlow, 0.01, false);
    for (let px = -11.5; px <= 7.5; px += 4.75) {
      addRBox(g, 0.42, 9.6, 13.4, px, 4.8, 0, darkSteel, 0.03);
    }

    // External steel catwalk + handrail + staircase on front face
    addRBox(g, 19.6, 0.16, 1.6, -2.0, 4.6, -7.2, darkSteel, 0.02);
    addRBox(g, 19.6, 0.08, 0.08, -2.0, 5.65, -7.95, safetyYellow, 0.01);
    for (let rx = -11.4; rx <= 7.4; rx += 2.35) {
      addCyl(g, 0.03, 0.03, 1.05, rx, 5.12, -7.95, safetyYellow, 6);
    }
    const stair = addRBox(g, 6.6, 0.16, 1.1, -9.2, 2.35, -7.3, darkSteel, 0.02);
    stair.rotation.z = 0.68;

    // Inclined cane feeder conveyor chute entering mill roof
    const chute = addRBox(g, 12.0, 1.15, 2.2, -14.0, 4.5, -2.2, corrugatedTeal, 0.04);
    chute.rotation.z = 0.42;
    addRBox(g, 4.6, 2.1, 3.2, -19.2, 1.05, -2.2, concrete, 0.04);

    // 4 Stainless fermentation / juice treatment tanks with conical roofs & bridge pipes
    for (let t = 0; t < 4; t++) {
      const tx = 11.2 + (t % 2) * 5.0;
      const tz = -3.4 + Math.floor(t / 2) * 5.6;
      addCyl(g, 2.05, 2.05, 7.2, tx, 3.6, tz, stainless, 18);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.12, 1.35, 18), stainless);
      cone.position.set(tx, 7.85, tz);
      cone.castShadow = true;
      g.add(cone);
      // Pipe ring
      addCyl(g, 2.14, 2.14, 0.25, tx, 5.2, tz, safetyYellow, 18);
    }
    // Overhead pipe rack connecting mill to tanks
    for (const py of [5.8, 6.6]) {
      addCyl(g, 0.24, 0.24, 10.5, 9.2, py, -1.0, stainless, 10).rotation.z = Math.PI / 2;
    }

    // 3 Tall tapered smokestacks with red/white safety bands + steam plumes
    const stackSpecs = [
      { x: -7.5, z: 4.5, h: 17.5, r: 0.72 },
      { x: -2.0, z: 4.5, h: 19.5, r: 0.78 },
      { x: 3.5, z: 4.5, h: 16.5, r: 0.68 },
    ];
    stackSpecs.forEach((st, idx) => {
      addCyl(g, st.r * 0.76, st.r, st.h, st.x, st.h * 0.5, st.z, steel, 14);
      addCyl(
        g,
        st.r * 0.82,
        st.r * 0.86,
        1.6,
        st.x,
        st.h - 2.2,
        st.z,
        materials.get('tinta', { color: 0xc93b2a }),
        14,
      );
      for (let p = 0; p < 3; p++) {
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: texLib.dustSpriteTex,
            color: 0xf4f6f4,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }),
        );
        sp.position.set(ix + st.x, groundHeightAt(ix, iz) + st.h + 0.6, iz + st.z);
        scene.add(sp);
        steamPlumes.push({
          mesh: sp,
          x: ix + st.x,
          y: groundHeightAt(ix, iz) + st.h + 0.6,
          z: iz + st.z,
          phase: (idx * 0.31 + p * 0.33) % 1,
        });
      }
    });

    // Adjacent Process Laboratory module in front of mill (with mullions, door, piping & PCTS header)
    addRBox(g, 6.8, 3.2, 4.4, -2.5, 1.6, -9.8, plaster, 0.05);
    addRBox(g, 5.2, 1.4, 4.5, -2.5, 1.75, -9.8, materials.glass, 0.02, false);
    for (const mx of [-5.1, -3.4, -1.6, 0.1]) {
      addRBox(g, 0.1, 1.45, 4.54, mx, 1.75, -9.8, darkSteel, 0.01, false);
    }
    addRBox(g, 5.3, 0.1, 4.56, -2.5, 2.45, -9.8, darkSteel, 0.01, false);
    addRBox(g, 5.3, 0.1, 4.56, -2.5, 1.05, -9.8, darkSteel, 0.01, false);
    addRBox(g, 1.15, 2.25, 0.12, -4.6, 1.15, -12.02, darkSteel, 0.02); // side/front lab entry door
    addCyl(g, 0.09, 0.09, 3.0, 1.2, 1.5, -10.8, stainless, 8); // sample intake pipe
    addCyl(g, 0.09, 0.09, 2.2, 0.2, 2.8, -10.8, stainless, 8).rotation.z = Math.PI / 2;
    const labSign = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.65, 0.1),
      TextureLibrary.createSignboardMaterial(['LABORATÓRIO PCTS', 'Brix · Pol · Fibra'], '#0e2d31', '#eef6f1'),
    );
    labSign.position.set(-2.5, 3.0, -12.06);
    g.add(labSign);
    addRBox(g, 7.2, 0.22, 4.9, -2.5, 3.3, -9.8, corrugatedTeal, 0.03);

    scene.add(g);
    collisions.addBox(ix - 2, iz, 22, 16);
    collisions.addBox(ix + 13.5, iz - 0.5, 9.5, 10.5);
    collisions.addBox(ix - 2.5, iz - 9.8, 7.2, 4.8);
    addIndustrialSign(scene, materials, 'INDÚSTRIA', 'Moenda e lab', 17, 13.5, Math.PI - 0.15);
  }

  // ==========================================================
  // PARADA 7 — ARMAZÉM E PÁTIO (14:30) x=52, z=-22
  // ==========================================================
  const forklift = buildForklift(materials);
  {
    const ax = 52;
    const az = -23;
    const g = new THREE.Group();
    g.position.set(ax, groundHeightAt(ax, az), az);

    // Loading dock apron + concrete base
    addRBox(g, 20.4, 0.95, 13.0, 0, 0.47, 0, concrete, 0.04);
    // Main warehouse body
    addRBox(g, 19.4, 6.2, 11.4, 0, 3.9, -0.4, corrugated, 0.06);
    // Curved/pitched hangar roof
    const rL = addRBox(g, 20.2, 0.24, 6.4, 0, 7.6, -3.2, corrugatedTeal, 0.04);
    rL.rotation.x = -0.22;
    const rR = addRBox(g, 20.2, 0.24, 6.4, 0, 7.6, 2.4, corrugatedTeal, 0.04);
    rR.rotation.x = 0.22;
    // Open rolling bay doors + dock bumpers
    for (const dx of [-5.2, 0, 5.2]) {
      addRBox(g, 3.8, 3.6, 0.25, dx, 2.75, 5.32, darkSteel, 0.03);
      addRBox(g, 4.1, 0.28, 0.35, dx, 0.95, 5.5, materials.get('borracha'), 0.03);
    }

    // Palletized woven sugar big-bags stacked outside warehouse
    for (let bx = -7.2; bx <= 7.2; bx += 2.4) {
      if (Math.abs(bx) < 1.5) continue;
      for (let level = 0; level < 2; level++) {
        addRBox(g, 1.35, 0.12, 1.35, bx, 1.02 + level * 1.12, 6.9, wood, 0.02);
        addRBox(g, 1.15, 0.96, 1.15, bx, 1.56 + level * 1.12, 6.9, lona, 0.14);
      }
    }

    // Shipping containers in expedition yard
    const containerColors = [0x00877c, 0xb8462c, 0xc7922c];
    containerColors.forEach((col, ci) => {
      const cMat = materials.get('chapa', { color: col, repeat: [3, 1] });
      addRBox(g, 6.05, 2.59, 2.44, -14.5, 1.3 + (ci === 2 ? 2.6 : 0), ci === 2 ? -2 : -2 + ci * 3.1, cMat, 0.04);
    });

    scene.add(g);
    collisions.addBox(ax, az, 21.0, 14.5);
    collisions.addBox(ax - 14.5, az - 0.5, 6.4, 6.2);

    forklift.position.set(54.5, groundHeightAt(54.5, -14.2), -14.2);
    forklift.rotation.y = 0.65;
    scene.add(forklift);
    collisions.addBox(54.5, -14.2, 3.2, 2.0);

    addIndustrialSign(scene, materials, 'ARMAZÉM', 'Expedição e pátio', 44, -12.5, 0.15);
  }

  // ==========================================================
  // PARADA 8 — CONTROLADORIA (16:00) x=76, z=22
  // ==========================================================
  {
    const cx = 76;
    const cz = 22;
    const g = new THREE.Group();
    g.position.set(cx, groundHeightAt(cx, cz), cz);

    addRBox(g, 12.6, 0.3, 8.6, 0, 0.15, 0, concrete, 0.04);
    addRBox(g, 11.4, 3.8, 7.2, 0, 2.2, 0, plaster, 0.05);
    // Glass curtain wall + architectural wooden brise-soleil fins
    addRBox(g, 9.6, 2.5, 7.35, 0, 2.2, 0, materials.glass, 0.02, false);
    for (let fx = -4.5; fx <= 4.5; fx += 0.9) {
      addRBox(g, 0.09, 2.75, 0.35, fx, 2.2, -3.72, wood, 0.01);
    }
    // Modern flat cantilevered roof overhang + entrance canopy
    addRBox(g, 12.8, 0.28, 8.8, 0, 4.22, 0, materials.get('tinta', { color: 0x1a383a }), 0.04);
    addRBox(g, 3.4, 0.16, 2.4, 0, 3.15, -4.5, materials.get('tinta', { color: 0x00968c }), 0.03);

    scene.add(g);
    collisions.addBox(cx, cz, 12.8, 8.8);

    const corpPickup = buildPickupTruck(0x284d49, materials, collisions, 70.5, 16.5);
    corpPickup.position.set(70.5, groundHeightAt(70.5, 16.5), 16.5);
    corpPickup.rotation.y = 2.6;
    scene.add(corpPickup);

    addIndustrialSign(scene, materials, 'CONTROLADORIA', 'Custos por processo', 71, 13.5, Math.PI + 0.2);
  }

  // ==========================================================
  // PARADA 9 — CENTRO DE GESTÃO / ERP (16:45) x=88, z=21
  // ==========================================================
  {
    const ex = 88;
    const ez = 21;
    const g = new THREE.Group();
    g.position.set(ex, groundHeightAt(ex, ez), ez);

    addRBox(g, 10.2, 0.3, 7.6, 0, 0.15, 0, concrete, 0.04);
    addRBox(g, 9.4, 4.1, 6.8, 0, 2.35, 0, materials.get('tinta', { color: 0x162a2d }), 0.05);
    addRBox(g, 7.8, 2.8, 6.9, 0, 2.45, 0, materials.glass, 0.02, false);

    // Glowing NOC dashboard wall visible inside windows
    const nocScreen = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 1.85, 0.14),
      TextureLibrary.createSignboardMaterial(['ERP · INTEGRAÇÃO', 'PESAGEM · ESTOQUE · CUSTO'], '#092427', '#5fe0c8'),
    );
    nocScreen.position.set(0, 2.45, 1.2);
    g.add(nocScreen);

    // Rooftop comms mast & satellite dish
    addCyl(g, 0.08, 0.12, 4.2, 2.8, 6.3, 1.2, steel, 8);
    addCyl(g, 0.68, 0.12, 0.35, -2.2, 5.2, 0.8, materials.get('tinta', { color: 0xeaece9 }), 14);

    scene.add(g);
    collisions.addBox(ex, ez, 10.5, 7.8);
    addIndustrialSign(scene, materials, 'GESTÃO ERP', 'Operação integrada', 84, 13.2, Math.PI - 0.15);
  }

  // ==========================================================
  // PARADA 10 — PORTO & NAVIO HORIZONTE STAR (17:30) x=98..122
  // ==========================================================
  const ship = new THREE.Group();
  {
    // Concrete quay wall & edge coping along x=108
    const quay = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 120), concrete);
    quay.position.set(105.5, -1.6, 0);
    quay.receiveShadow = true;
    scene.add(quay);
    addRBox(scene, 0.8, 0.35, 118, 109.1, 0.12, 0, safetyYellow, 0.03);

    // Mooring bollards & rubber marine fenders along quay edge
    for (let bz = -42; bz <= 42; bz += 12) {
      addCyl(scene, 0.22, 0.26, 0.62, 108.6, 0.35, bz, darkSteel, 10);
      addCyl(scene, 0.32, 0.32, 0.12, 108.6, 0.65, bz, darkSteel, 10);
      addRBox(scene, 0.4, 1.2, 0.85, 109.6, -0.35, bz + 4, materials.get('borracha'), 0.06);
    }

    // Port export terminal office at (98, -22)
    const office = new THREE.Group();
    office.position.set(98, groundHeightAt(98, -22), -22);
    addRBox(office, 9.4, 0.3, 6.8, 0, 0.15, 0, concrete, 0.04);
    addRBox(office, 8.6, 3.4, 5.8, 0, 2.0, 0, plaster, 0.05);
    addRBox(office, 6.8, 1.8, 5.9, 0, 2.05, 0, materials.glass, 0.02, false);
    addRBox(office, 9.2, 0.24, 6.4, 0, 3.8, 0, corrugatedTeal, 0.03);
    scene.add(office);
    collisions.addBox(98, -22, 9.8, 7.2);
    addIndustrialSign(scene, materials, 'PORTO', 'Exportação · CTRMagro', 94, -13.2, -0.2);

    // Rail-mounted STS Port Gantry Crane at (105, -10) reaching over ship
    const crane = new THREE.Group();
    crane.position.set(105.5, 0, -9.5);
    const craneMat = materials.get('tinta', { color: 0xd98a22, roughness: 0.42 });
    const craneTrim = materials.get('tinta', { color: 0xf0ece1 });
    for (const [lx, lz] of [
      [-2.8, -3.4],
      [2.8, -3.4],
      [-2.8, 3.4],
      [2.8, 3.4],
    ]) {
      addRBox(crane, 0.55, 15.5, 0.55, lx, 7.75, lz, craneMat, 0.04);
    }
    // Cross trusses & horizontal boom reaching out over x=122
    addRBox(crane, 6.4, 0.85, 7.4, 0, 15.2, 0, craneMat, 0.04);
    addRBox(crane, 24.5, 1.1, 2.6, 7.5, 15.8, 0, craneMat, 0.05);
    addRBox(crane, 2.2, 1.6, 2.2, 13.5, 14.3, 0, craneTrim, 0.04); // operator cab
    // Cables + spreader holding export container
    for (const sz of [-0.9, 0.9]) {
      addCyl(crane, 0.04, 0.04, 7.2, 14.8, 10.8, sz, steel, 6);
    }
    addRBox(
      crane,
      6.0,
      2.55,
      2.4,
      14.8,
      6.4,
      0,
      materials.get('chapa', { color: 0x00877c, repeat: [3, 1] }),
      0.04,
    );
    scene.add(crane);
    collisions.addBox(105.5, -9.5, 6.8, 7.8);

    // Moored Bulk/Container Vessel "HORIZONTE STAR" at x=122, z=-4
    ship.position.set(123, -0.45, -4);
    const hullNavy = materials.get('tinta', { color: 0x162b38, roughness: 0.48 });
    const hullRed = materials.get('tinta', { color: 0x8c2a22, roughness: 0.55 });
    const deckMat = materials.get('ferrugem', { color: 0x3b4546 });
    const bridgeWhite = materials.get('tinta', { color: 0xf1f3ef, roughness: 0.35 });

    // Lower red waterline + main dark hull + tapered bow & stern
    addRBox(ship, 14.5, 2.6, 56.0, 0, 0.4, 0, hullRed, 0.4);
    addRBox(ship, 15.0, 4.6, 57.5, 0, 3.6, 0, hullNavy, 0.45);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(7.6, 15.0, 4), hullNavy);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.z = Math.PI / 4;
    bow.scale.set(0.95, 1.0, 0.52);
    bow.position.set(0, 3.2, -34.5);
    bow.castShadow = true;
    ship.add(bow);

    // Main deck + cargo hatches + stacked export containers
    addRBox(ship, 13.8, 0.35, 54.0, 0, 6.0, 0, deckMat, 0.05);
    const contPalette = [0x00877c, 0xc75432, 0xd49b2c, 0x2a5c8a];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const cMat = materials.get('chapa', {
          color: contPalette[(row + col) % contPalette.length],
          repeat: [2, 1],
        });
        addRBox(ship, 2.5, 2.55, 6.2, -3.2 + col * 3.1, 7.45, -18 + row * 7.2, cMat, 0.04);
        if ((row + col) % 2 === 0) {
          addRBox(ship, 2.5, 2.55, 6.2, -3.2 + col * 3.1, 10.05, -18 + row * 7.2, cMat, 0.04);
        }
      }
    }

    // Tiered white bridge superstructure & funnel at stern
    addRBox(ship, 12.2, 5.2, 10.5, 0, 8.7, 17.5, bridgeWhite, 0.08);
    addRBox(ship, 14.2, 2.1, 4.6, 0, 12.2, 16.5, bridgeWhite, 0.06); // navigation bridge wings
    addRBox(ship, 11.4, 1.15, 4.7, 0, 12.25, 16.5, materials.glass, 0.02, false);
    addCyl(ship, 1.4, 1.8, 4.6, 0, 13.2, 21.8, materials.get('tinta', { color: 0x00877c }), 12);
    addCyl(ship, 1.44, 1.44, 0.85, 0, 15.2, 21.8, darkSteel, 12);

    // Vessel name plaque on port side facing quay
    const hullSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.75, 13.5),
      TextureLibrary.createSignboardMaterial(['HORIZONTE STAR', 'SANTOS · BRASIL'], '#162b38', '#eef6f1'),
    );
    hullSign.position.set(-7.58, 4.6, -6);
    ship.add(hullSign);

    scene.add(ship);
  }

  return { roadTruck, ship, steamPlumes, forklift };
}
