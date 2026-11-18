import * as THREE from 'three/webgpu';
import { EVIDENCIAS, PARADAS, SINAIS, type EvidenciaSpec, type SinalSpec } from '../game/data';
import { groundHeightAt, type CollisionWorld } from '../game/worldMath';
import { TextureLibrary } from './textures';
import type { MaterialBank } from './materials';
import {
  addCyl,
  addRBox,
  buildHarvester,
  buildPessoa,
  buildPickupTruck,
  buildTractor,
  buildTransbordo,
  type AnimatedPerson,
  type HarvesterRig,
  type TransbordoRig,
} from './fleetAndPeople';

export interface EvidenciaRuntime {
  spec: EvidenciaSpec;
  marker: THREE.Mesh;
  ring: THREE.Mesh;
}

export interface SinalRuntime {
  spec: SinalSpec;
  diamond: THREE.Mesh;
  ring: THREE.Mesh;
}

export interface StreetLampRuntime {
  headMat: THREE.MeshStandardNodeMaterial;
  halo: THREE.Sprite;
  pointLight?: THREE.PointLight;
}

export interface CampoWorldHandles {
  people: AnimatedPerson[];
  drone: THREE.Group;
  harvester: HarvesterRig;
  transbordoA: TransbordoRig;
  transbordoB: TransbordoRig;
  evidencias: EvidenciaRuntime[];
  sinais: SinalRuntime[];
  lamps: StreetLampRuntime[];
  birds: THREE.Group;
  dustMotes: { mesh: THREE.InstancedMesh; pos: [number, number, number][] };
  signboards: THREE.Object3D[];
}

function addSignboard(
  scene: THREE.Scene,
  materials: MaterialBank,
  line1: string,
  line2: string,
  x: number,
  z: number,
  rotY = 0,
): THREE.Group {
  const g = new THREE.Group();
  const steel = materials.get('aco', { color: 0x626b6e });
  addCyl(g, 0.06, 0.07, 1.85, -0.9, 0.92, -0.09, steel, 8);
  addCyl(g, 0.06, 0.07, 1.85, 0.9, 0.92, -0.09, steel, 8);
  const boardMat = TextureLibrary.createSignboardMaterial([line1, line2]);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.25, 0.09), boardMat);
  board.position.set(0, 1.95, 0.02);
  board.castShadow = true;
  board.receiveShadow = true;
  g.add(board);
  g.position.set(x, groundHeightAt(x, z), z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}

export function buildCampoStopsAndProps(
  scene: THREE.Scene,
  texLib: TextureLibrary,
  materials: MaterialBank,
  collisions: CollisionWorld,
): CampoWorldHandles {
  const signboards: THREE.Object3D[] = [];
  const people: AnimatedPerson[] = [];

  const wallMat = materials.get('reboco', { color: 0xf0e9dc, repeat: [2, 1] });
  const roofTerracotta = materials.get('chapa', { color: 0x8f3e29, repeat: [3, 2] });
  const roofZinc = materials.get('chapa', { color: 0x6b7778, repeat: [4, 3] });
  const woodMat = materials.get('madeira', { color: 0x6a4930, repeat: [2, 2] });
  const concreteMat = materials.get('concreto', { color: 0xb0aba2, repeat: [3, 3] });
  const steelMat = materials.get('aco', { color: 0x5c6669 });
  const rustMat = materials.get('ferrugem', { color: 0x614436 });

  // ==========================================================
  // PARADA 1 — SEDE (05:30) x=-96, z=-22
  // ==========================================================
  {
    const px = -96;
    const pz = -22;
    const g = new THREE.Group();
    g.position.set(px, groundHeightAt(px, pz), pz);

    // Concrete foundation plinth + veranda deck
    addRBox(g, 14.2, 0.34, 10.6, 0, 0.17, 1.0, concreteMat, 0.04);
    // Main farmhouse walls
    addRBox(g, 13.0, 3.8, 7.6, 0, 2.24, -0.4, wallMat, 0.06);
    // Overhanging pitched roof (two sloped eaves + gable fascia)
    const roofL = addRBox(g, 14.4, 0.22, 5.4, 0, 4.75, -2.55, roofTerracotta, 0.03);
    roofL.rotation.x = -0.32;
    const roofR = addRBox(g, 14.4, 0.22, 6.2, 0, 4.65, 2.35, roofTerracotta, 0.03);
    roofR.rotation.x = 0.3;
    addRBox(g, 14.5, 0.35, 0.4, 0, 5.55, -0.2, roofTerracotta, 0.04);

    // Timber veranda columns & railing
    for (let cx = -5.8; cx <= 5.8; cx += 2.9) {
      addCyl(g, 0.1, 0.12, 3.3, cx, 1.98, 5.45, woodMat, 8);
    }
    addRBox(g, 11.8, 0.08, 0.1, 0, 1.05, 5.45, woodMat, 0.02);

    // Framed windows with warm morning interior glow
    const warmWindow = new THREE.MeshStandardNodeMaterial({
      color: 0xffd58f,
      emissive: 0xffb357,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    for (const wx of [-4.2, -1.6, 1.6, 4.2]) {
      addRBox(g, 1.5, 1.35, 0.18, wx, 2.35, 3.42, woodMat, 0.02);
      addRBox(g, 1.25, 1.1, 0.2, wx, 2.35, 3.44, warmWindow, 0.01, false);
    }
    // Wooden double door
    addRBox(g, 1.6, 2.45, 0.2, 0, 1.55, 3.42, woodMat, 0.03);

    // Veranda table & water tank behind Sede
    addRBox(g, 1.8, 0.08, 0.9, 3.8, 0.95, 4.5, woodMat, 0.02);
    addCyl(g, 1.15, 1.15, 2.4, -7.8, 3.2, -3.5, materials.get('tinta', { color: 0x26658c }), 12);
    addRBox(g, 2.2, 2.1, 2.2, -7.8, 1.05, -3.5, steelMat, 0.04);

    scene.add(g);
    collisions.addBox(px, pz, 14.5, 11.2);

    // Agro 4x4 Pickup parked outside Sede
    const pickup = buildPickupTruck(0xf0f2ee, materials, collisions, -85.5, -18.5);
    pickup.position.set(-85.5, groundHeightAt(-85.5, -18.5), -18.5);
    pickup.rotation.y = 0.45;
    scene.add(pickup);

    signboards.push(addSignboard(scene, materials, 'SEDE', 'Planejamento', -91, -13.5, -0.3));
  }

  // ==========================================================
  // PARADA 2 — TALHÃO 12 (07:00) x=-72, z=22
  // ==========================================================
  let droneGroup = new THREE.Group();
  {
    const tx = -65;
    const tz = 20;
    const tower = new THREE.Group();
    tower.position.set(tx, groundHeightAt(tx, tz), tz);

    // 4 splayed lattice legs + cross-ties
    const legOffsets = [
      [-0.75, -0.75],
      [0.75, -0.75],
      [-0.75, 0.75],
      [0.75, 0.75],
    ];
    for (const [lx, lz] of legOffsets) {
      const leg = addCyl(tower, 0.05, 0.09, 9.6, lx * 0.55, 4.8, lz * 0.55, steelMat, 6);
      leg.rotation.z = lx * 0.08;
      leg.rotation.x = -lz * 0.08;
    }
    for (const h of [2.0, 4.2, 6.4, 8.4]) {
      const w = 1.4 - h * 0.09;
      addRBox(tower, w, 0.08, w, 0, h, 0, steelMat, 0.01);
    }
    // Solar telemetry panel + IoT antenna dish + weather vane
    const solar = addRBox(
      tower,
      1.3,
      0.06,
      0.85,
      0,
      9.45,
      0.45,
      materials.get('aco', { color: 0x162f4d, roughness: 0.15 }),
      0.02,
    );
    solar.rotation.x = 0.42;
    addCyl(tower, 0.03, 0.04, 1.5, 0, 10.1, 0, steelMat, 6);
    addCyl(tower, 0.42, 0.08, 0.25, 0.28, 9.8, -0.2, materials.get('tinta', { color: 0xebeeeb }), 12);

    scene.add(tower);
    collisions.addBox(tx, tz, 2.2, 2.2);

    // Autonomous agricultural octo/quad-drone hovering over Talhão 12
    const bodyMat = materials.get('aco', { color: 0x1e2c2e });
    const accentMat = materials.get('liso', { color: 0x00b3a4 });
    addRBox(droneGroup, 0.75, 0.22, 0.55, 0, 0, 0, bodyMat, 0.06);
    addRBox(droneGroup, 0.45, 0.14, 0.35, 0, -0.15, 0, accentMat, 0.03); // multispectral camera pod
    for (const [ax, az] of [
      [-0.75, -0.75],
      [0.75, -0.75],
      [-0.75, 0.75],
      [0.75, 0.75],
    ]) {
      const arm = addRBox(droneGroup, 1.05, 0.06, 0.08, ax * 0.5, 0.04, az * 0.5, bodyMat, 0.02);
      arm.rotation.y = Math.atan2(az, ax);
      addCyl(droneGroup, 0.52, 0.52, 0.02, ax, 0.12, az, materials.glass, 14, false);
    }
    scene.add(droneGroup);
    signboards.push(addSignboard(scene, materials, 'TALHÃO 12', 'Monitoramento', -77, 13.5, Math.PI + 0.25));
  }

  // ==========================================================
  // PARADA 3 — FRENTE DE COLHEITA (08:30) x=-48, z=-22
  // ==========================================================
  const harvester = buildHarvester(materials, texLib);
  harvester.group.position.set(-48, groundHeightAt(-48, -27), -27);
  scene.add(harvester.group);

  const transbordoA = buildTransbordo(0x2d7438, materials);
  transbordoA.group.position.set(-46.5, groundHeightAt(-46.5, -23.6), -23.6);
  scene.add(transbordoA.group);

  const transbordoB = buildTransbordo(0x286732, materials);
  transbordoB.group.position.set(-50.6, groundHeightAt(-50.6, -24.2), -24.2);
  scene.add(transbordoB.group);

  // Mobile field canopy tent + paperwork table near Frente de colheita (-52.5, -14.5)
  {
    const fx = -52.5;
    const fz = -14.5;
    const tent = new THREE.Group();
    tent.position.set(fx, groundHeightAt(fx, fz), fz);
    for (const [px, pz] of [
      [-1.8, -1.4],
      [1.8, -1.4],
      [-1.8, 1.4],
      [1.8, 1.4],
    ]) {
      addCyl(tent, 0.04, 0.045, 2.45, px, 1.22, pz, steelMat, 6);
    }
    addRBox(tent, 4.1, 0.14, 3.2, 0, 2.48, 0, materials.get('lona', { color: 0x00877c }), 0.06);
    addRBox(tent, 1.5, 0.07, 0.85, 0, 0.82, 0, woodMat, 0.02);
    scene.add(tent);
    collisions.addBox(fx, fz, 3.8, 2.9);
    signboards.push(addSignboard(scene, materials, 'FRENTE 3', 'Colheita', -43, -13.5, 0.2));
  }

  // ==========================================================
  // PARADA 4 — OFICINA (10:00) x=-24, z=22
  // ==========================================================
  {
    const ox = -24;
    const oz = 22;
    const g = new THREE.Group();
    g.position.set(ox, groundHeightAt(ox, oz), oz);

    // Concrete slab + open-bay steel structure
    addRBox(g, 16.4, 0.28, 11.4, 0, 0.14, 0, concreteMat, 0.03);
    // Rear corrugated wall & side upper cladding
    addRBox(g, 15.8, 5.2, 0.28, 0, 2.7, 5.2, roofZinc, 0.02);
    for (const sx of [-7.7, -2.55, 2.55, 7.7]) {
      for (const sz of [-5.2, 5.2]) {
        addRBox(g, 0.28, 5.4, 0.28, sx, 2.8, sz, steelMat, 0.02);
      }
    }
    // Pitched roof trusses
    const roof1 = addRBox(g, 16.8, 0.18, 6.2, 0, 5.85, -2.6, roofZinc, 0.02);
    roof1.rotation.x = 0.16;
    const roof2 = addRBox(g, 16.8, 0.18, 6.2, 0, 5.85, 2.6, roofZinc, 0.02);
    roof2.rotation.x = -0.16;

    // Yellow overhead gantry crane beam inside bay
    addRBox(g, 15.2, 0.36, 0.36, 0, 4.45, -1.2, materials.get('tinta', { color: 0xeba922 }), 0.03);

    // Tool workbench + red air compressor + oil drums + tractor tire stacks
    addRBox(g, 4.2, 0.92, 1.0, -4.4, 0.6, 4.1, rustMat, 0.03);
    addCyl(g, 0.32, 0.32, 1.2, 3.8, 0.72, 4.0, materials.get('tinta', { color: 0xc23828 }), 12).rotation.z =
      Math.PI / 2;

    // Diesel fuel tank on steel cradle beside Oficina
    const tank = addCyl(g, 1.15, 1.15, 4.2, 10.5, 2.1, 1.8, materials.get('tinta', { color: 0xe6e0d2 }), 14);
    tank.rotation.z = Math.PI / 2;
    addRBox(g, 4.6, 0.9, 2.5, 10.5, 0.45, 1.8, concreteMat, 0.03);

    scene.add(g);
    collisions.addBox(ox, oz, 16.8, 11.6);
    collisions.addBox(ox + 10.5, oz + 1.8, 4.8, 2.7);

    // Tractor under maintenance with open hood near Oficina entrance
    const repairTractor = buildTractor(0x2a7638, materials, true);
    repairTractor.position.set(-20.2, groundHeightAt(-20.2, 17.5), 17.5);
    repairTractor.rotation.y = -0.5;
    scene.add(repairTractor);
    collisions.addBox(-20.2, 17.5, 3.8, 2.4);

    // Stacked rubber tractor tires
    for (let t = 0; t < 3; t++) {
      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.22, 8, 16),
        materials.get('borracha'),
      );
      tire.rotation.x = Math.PI / 2;
      tire.position.set(-29.2 + (t % 2) * 0.1, groundHeightAt(-29.2, 17.2) + 0.24 + t * 0.42, 17.2);
      tire.castShadow = true;
      scene.add(tire);
    }

    signboards.push(addSignboard(scene, materials, 'OFICINA', 'Frota e preventiva', -17, 13.5, Math.PI - 0.2));
  }

  // ==========================================================
  // WORKERS FOR ALL 10 STOPS
  // ==========================================================
  PARADAS.forEach((p, idx) => {
    const isFieldHelmet = idx !== 0 && idx !== 7 && idx !== 8;
    const person = buildPessoa(idx, isFieldHelmet, materials);
    const px = p.x + 1.6;
    const pz = p.nz;
    const py = groundHeightAt(px, pz);
    person.baseY = py;
    person.group.position.set(px, py, pz);
    scene.add(person.group);
    people.push(person);
    collisions.addCircle(px, pz, 0.72);
  });

  // ==========================================================
  // 4 GOLDEN SIGNALS (SINAIS)
  // ==========================================================
  const sinais: SinalRuntime[] = SINAIS.map((sp) => {
    const y = groundHeightAt(sp.x, sp.z);
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.52, 0),
      new THREE.MeshStandardNodeMaterial({
        color: 0xffc93c,
        emissive: 0xffb629,
        emissiveIntensity: 1.35,
        roughness: 0.25,
        metalness: 0.35,
      }),
    );
    diamond.position.set(sp.x, y + 1.5, sp.z);
    scene.add(diamond);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.04, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.65 }),
    );
    ring.position.set(sp.x, y + 1.5, sp.z);
    scene.add(ring);

    return { spec: sp, diamond, ring };
  });

  // ==========================================================
  // 8 OBSERVABLE EVIDENCES (PROPS + MARKERS)
  // ==========================================================
  const evidencias: EvidenciaRuntime[] = EVIDENCIAS.map((ev) => {
    const gy = groundHeightAt(ev.x, ev.z);
    const propGroup = new THREE.Group();
    propGroup.position.set(ev.x, gy, ev.z);
    propGroup.rotation.y = ev.z > 0 ? Math.PI : 0;

    if (ev.prop === 'quadro') {
      const boardMat = TextureLibrary.createDocumentBoardMaterial(
        ev.id === 'ev-plan1'
          ? ['PLANO SAFRA 26/27', 'Plantio: talhões 1–18', 'Reforma: 420 ha', 'Orçamento: versão 4 (papel)']
          : ['ORDEM PREVENTIVA', 'Trator 22 — 10 dias atraso', 'Troca filtro + hidráulico', 'Pendente assinatura'],
      );
      addCyl(propGroup, 0.04, 0.04, 1.8, -0.55, 0.9, 0, steelMat, 6);
      addCyl(propGroup, 0.04, 0.04, 1.8, 0.55, 0.9, 0, steelMat, 6);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.05, 0.06), boardMat);
      panel.position.set(0, 1.35, 0);
      panel.castShadow = true;
      propGroup.add(panel);
    } else if (ev.prop === 'papel' || ev.prop === 'caderno') {
      addRBox(propGroup, 1.05, 0.07, 0.72, 0, 0.86, 0, woodMat, 0.02);
      for (const [lx, lz] of [
        [-0.44, -0.28],
        [0.44, -0.28],
        [-0.44, 0.28],
        [0.44, 0.28],
      ]) {
        addCyl(propGroup, 0.03, 0.03, 0.84, lx, 0.42, lz, steelMat, 6);
      }
      const docMat = TextureLibrary.createDocumentBoardMaterial(
        ev.prop === 'caderno'
          ? ['CADERNO DIESEL', 'Trator 22: 280 L', 'Transbordo 4: 190 L', 'Sem nº de frota']
          : ['PLANILHA DE CAMPO', 'Lançado manual às 21h', 'Divergência frente 3', 'Revisar no fechamento'],
        '#f7f3e8',
      );
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.02, 0.44), docMat);
      sheet.position.set(0, 0.91, 0);
      sheet.rotation.y = 0.14;
      propGroup.add(sheet);
    } else if (ev.prop === 'estaca') {
      addCyl(propGroup, 0.04, 0.05, 1.4, 0, 0.7, 0, steelMat, 8);
      addRBox(propGroup, 0.55, 0.38, 0.05, 0, 1.4, 0, materials.get('aco', { color: 0x10282b }), 0.02);
    } else if (ev.prop === 'cana') {
      for (let k = 0; k < 10; k++) {
        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.04, 1.65, 6),
          materials.get('capim', { color: k % 3 === 0 ? 0xa38e49 : 0x7e943e }),
        );
        stalk.rotation.z = Math.PI / 2;
        stalk.rotation.y = (k - 5) * 0.14;
        stalk.position.set(((k % 3) - 1) * 0.22, 0.06 + (k % 2) * 0.04, ((k % 4) - 1.5) * 0.24);
        stalk.castShadow = true;
        propGroup.add(stalk);
      }
    }
    scene.add(propGroup);

    // Floating indicator gem + ring
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.78 }),
    );
    marker.position.set(ev.x, gy + ev.y + 0.35, ev.z);
    scene.add(marker);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.025, 6, 18),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.75 }),
    );
    ring.position.set(ev.x, gy + ev.y + 0.35, ev.z);
    scene.add(ring);

    return { spec: ev, marker, ring };
  });

  // ==========================================================
  // STREET LAMPS, BIRDS & AMBIENT DUST MOTES
  // ==========================================================
  const lamps: StreetLampRuntime[] = [];
  for (let i = 0; i < 9; i++) {
    const lx = -100 + i * 24;
    const lz = i % 2 === 0 ? -3.8 : 3.8;
    const ly = groundHeightAt(lx, lz);
    const pole = new THREE.Group();
    pole.position.set(lx, ly, lz);
    addCyl(pole, 0.065, 0.095, 5.4, 0, 2.7, 0, steelMat, 8);
    addRBox(pole, 1.4, 0.09, 0.1, 0.6, 5.35, 0, steelMat, 0.02);

    const headMat = new THREE.MeshStandardNodeMaterial({
      color: 0x2a3133,
      emissive: 0xffc470,
      emissiveIntensity: 0,
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.35), headMat);
    head.position.set(1.2, 5.22, 0);
    pole.add(head);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texLib.dustSpriteTex,
        color: 0xffc97a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    halo.scale.set(3.2, 3.2, 1);
    halo.position.set(1.2, 5.05, 0);
    pole.add(halo);
    scene.add(pole);

    let ptLight: THREE.PointLight | undefined;
    if (i === 5 || i === 8) {
      ptLight = new THREE.PointLight(0xffbe6b, 0, 26, 2);
      ptLight.position.set(lx + 1.2, ly + 5.0, lz);
      scene.add(ptLight);
    }
    lamps.push({ headMat, halo, pointLight: ptLight });
  }

  // Soaring birds
  const birds = new THREE.Group();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x262e30 });
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.85, 3), birdMat);
    wingL.rotation.z = Math.PI / 2;
    wingL.position.x = 0.35;
    const wingR = wingL.clone();
    wingR.position.x = -0.35;
    wingR.rotation.z = -Math.PI / 2;
    b.add(wingL, wingR);
    b.userData = {
      a: i * 1.05,
      r: 14 + i * 3,
      h: 22 + i * 2.2,
      vel: 0.42 + (i % 3) * 0.1,
    };
    birds.add(b);
  }
  scene.add(birds);

  // Floating airborne dust motes
  const dustCount = 300;
  const dustPos: [number, number, number][] = [];
  for (let i = 0; i < dustCount; i++) {
    dustPos.push([
      -145 + Math.random() * 245,
      1.0 + Math.random() * 7.5,
      -68 + Math.random() * 136,
    ]);
  }
  const dustMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.1, 0.02, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xdaab8c, transparent: true, opacity: 0.42 }),
    dustCount,
  );
  scene.add(dustMesh);

  return {
    people,
    drone: droneGroup,
    harvester,
    transbordoA,
    transbordoB,
    evidencias,
    sinais,
    lamps,
    birds,
    dustMotes: { mesh: dustMesh, pos: dustPos },
    signboards,
  };
}
