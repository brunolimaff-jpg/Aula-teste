import * as THREE from 'three';
import { SUBSTATION_BOUNDS, YARD_HALF, groundHeightAt } from './logic';
import type { MaterialBank } from './materials';
import type { TextureBank } from './textures';

export interface StructuresSystem {
  group: THREE.Group;
  valveWheel: THREE.Group;
  gaugeNeedle: THREE.Mesh;
  switchLever: THREE.Group;
  breakerLever: THREE.Group;
  faultLight: THREE.PointLight;
  substationLights: THREE.PointLight[];
  floodLights: THREE.SpotLight[];
  update: (
    time: number,
    valvePurged: boolean,
    switchIsolated: boolean,
    breakerRestored: boolean,
    climax: number
  ) => void;
  dispose: () => void;
}

function buildIBeamColumn(height: number, mats: MaterialBank, geos: THREE.BufferGeometry[]): THREE.Group {
  const col = new THREE.Group();
  const flangeGeo = new THREE.BoxGeometry(0.24, height, 0.032);
  const webGeo = new THREE.BoxGeometry(0.032, height, 0.2);
  const baseGeo = new THREE.BoxGeometry(0.38, 0.05, 0.38);
  geos.push(flangeGeo, webGeo, baseGeo);

  const f1 = new THREE.Mesh(flangeGeo, mats.paintTeal);
  f1.position.set(0, height * 0.5, -0.1);
  f1.castShadow = true;
  const f2 = new THREE.Mesh(flangeGeo, mats.paintTeal);
  f2.position.set(0, height * 0.5, 0.1);
  f2.castShadow = true;
  const web = new THREE.Mesh(webGeo, mats.paintTeal);
  web.position.set(0, height * 0.5, 0);
  web.castShadow = true;
  const base = new THREE.Mesh(baseGeo, mats.darkSteel);
  base.position.set(0, 0.025, 0);
  col.add(f1, f2, web, base);
  return col;
}

function buildFlangedPipeRun(
  points: THREE.Vector3[],
  radius: number,
  mat: THREE.Material,
  flangeMat: THREE.Material,
  geos: THREE.BufferGeometry[]
): THREE.Group {
  const pipeGroup = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.08);
  const pipeGeo = new THREE.TubeGeometry(curve, 36, radius, 14, false);
  geos.push(pipeGeo);
  const mesh = new THREE.Mesh(pipeGeo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  pipeGroup.add(mesh);

  // Add bolted flange collars along straight segments
  const flangeGeo = new THREE.CylinderGeometry(radius * 1.48, radius * 1.48, 0.055, 16);
  geos.push(flangeGeo);
  for (const t of [0.12, 0.42, 0.72, 0.92]) {
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const flange = new THREE.Mesh(flangeGeo, flangeMat);
    flange.position.copy(p);
    flange.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    flange.castShadow = true;
    pipeGroup.add(flange);
  }
  return pipeGroup;
}

export function createStructuresSystem(
  scene: THREE.Scene,
  mats: MaterialBank,
  tex: TextureBank
): StructuresSystem {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const customMats: THREE.Material[] = [];

  const apronY = 0.135;

  // =========================================================
  // 1. COVERED SUBSTATION PASSAGE ("CASA DE FORÇA")
  //    x in [-15.5, -3.5], z in [-21.5, -5.5]
  // =========================================================
  const sub = new THREE.Group();
  const { minX, maxX, minZ, maxZ, roofY } = SUBSTATION_BOUNDS;
  const subW = maxX - minX; // 12m
  const subD = maxZ - minZ; // 16m
  const midX = (minX + maxX) * 0.5; // -9.5
  const midZ = (minZ + maxZ) * 0.5; // -13.5

  // Raised perimeter concrete plinths + perimeter walls with wide openings
  const westWallGeo = new THREE.BoxGeometry(0.32, 3.85, subD);
  const northWallGeo = new THREE.BoxGeometry(subW, 3.85, 0.32);
  const eastSegNGeo = new THREE.BoxGeometry(0.32, 3.6, 7.2);
  const eastSegSGeo = new THREE.BoxGeometry(0.32, 3.6, 4.2);
  const southSegWGeo = new THREE.BoxGeometry(3.8, 3.6, 0.32);
  const southSegEGeo = new THREE.BoxGeometry(3.6, 3.6, 0.32);
  const lintelSGeo = new THREE.BoxGeometry(5.0, 0.85, 0.32);
  const lintelEGeo = new THREE.BoxGeometry(0.32, 0.85, 4.8);
  geos.push(
    westWallGeo,
    northWallGeo,
    eastSegNGeo,
    eastSegSGeo,
    southSegWGeo,
    southSegEGeo,
    lintelSGeo,
    lintelEGeo
  );

  const westWall = new THREE.Mesh(westWallGeo, mats.concreteWall);
  westWall.position.set(minX, apronY + 1.92, midZ);
  westWall.castShadow = true;
  westWall.receiveShadow = true;

  const northWall = new THREE.Mesh(northWallGeo, mats.concreteWall);
  northWall.position.set(midX, apronY + 1.92, minZ);
  northWall.castShadow = true;
  northWall.receiveShadow = true;

  const eastWallN = new THREE.Mesh(eastSegNGeo, mats.concreteWall);
  eastWallN.position.set(maxX, apronY + 1.8, -18.0);
  eastWallN.castShadow = true;
  eastWallN.receiveShadow = true;

  const eastWallS = new THREE.Mesh(eastSegSGeo, mats.concreteWall);
  eastWallS.position.set(maxX, apronY + 1.8, -7.5);
  eastWallS.castShadow = true;
  eastWallS.receiveShadow = true;

  const eastLintel = new THREE.Mesh(lintelEGeo, mats.hazardStripe);
  eastLintel.position.set(maxX, apronY + 3.45, -12.0);
  eastLintel.castShadow = true;

  const southWallW = new THREE.Mesh(southSegWGeo, mats.concreteWall);
  southWallW.position.set(-13.7, apronY + 1.8, maxZ);
  southWallW.castShadow = true;
  southWallW.receiveShadow = true;

  const southWallE = new THREE.Mesh(southSegEGeo, mats.concreteWall);
  southWallE.position.set(-5.1, apronY + 1.8, maxZ);
  southWallE.castShadow = true;
  southWallE.receiveShadow = true;

  const southLintel = new THREE.Mesh(lintelSGeo, mats.hazardStripe);
  southLintel.position.set(-9.3, apronY + 3.45, maxZ);
  southLintel.castShadow = true;

  sub.add(westWall, northWall, eastWallN, eastWallS, eastLintel, southWallW, southWallE, southLintel);

  // Steel I-beam columns along structure corners & truss bays
  for (const cx of [minX + 0.3, midX, maxX - 0.3]) {
    for (const cz of [minZ + 0.3, -16.0, -10.5, maxZ - 0.3]) {
      if (cx === midX && cz > minZ + 1 && cz < maxZ - 1) continue; // Keep interior clear!
      const col = buildIBeamColumn(roofY - apronY, mats, geos);
      col.position.set(cx, apronY, cz);
      sub.add(col);
    }
  }

  // Open steel Warren roof trusses + pitched corrugated roof with skylight shaft gaps!
  const trussChordGeo = new THREE.BoxGeometry(subW + 1.4, 0.14, 0.14);
  const purlinGeo = new THREE.BoxGeometry(0.1, 0.1, subD + 1.4);
  geos.push(trussChordGeo, purlinGeo);

  for (const tz of [minZ, -16.0, -10.5, maxZ]) {
    const bottomChord = new THREE.Mesh(trussChordGeo, mats.paintTeal);
    bottomChord.position.set(midX, roofY - 0.45, tz);
    bottomChord.castShadow = true;
    sub.add(bottomChord);

    const topChord = new THREE.Mesh(trussChordGeo, mats.paintTeal);
    topChord.position.set(midX, roofY + 0.2, tz);
    topChord.rotation.z = -0.06;
    topChord.castShadow = true;
    sub.add(topChord);
  }

  for (const px of [minX + 0.5, -12.5, -9.5, -6.5, maxX - 0.5]) {
    const purlin = new THREE.Mesh(purlinGeo, mats.rustIron);
    purlin.position.set(px, roofY + 0.25 + (midX - px) * 0.06, midZ);
    purlin.castShadow = true;
    sub.add(purlin);
  }

  // Corrugated roof sheets (leave two crisp skylight slots at x ~ -8.5..-6.2 so dawn sun slices inside!)
  const roofSheetA = new THREE.BoxGeometry(5.8, 0.06, subD + 1.6);
  const roofSheetB = new THREE.BoxGeometry(4.4, 0.06, subD + 1.6);
  const roofSheetMidPatch = new THREE.BoxGeometry(2.6, 0.06, 7.6);
  geos.push(roofSheetA, roofSheetB, roofSheetMidPatch);

  const sheetWest = new THREE.Mesh(roofSheetA, mats.corrugatedZinc);
  sheetWest.position.set(-12.9, roofY + 0.56, midZ);
  sheetWest.rotation.z = -0.06;
  sheetWest.castShadow = true;
  sheetWest.receiveShadow = true;

  const sheetEast = new THREE.Mesh(roofSheetB, mats.corrugatedZinc);
  sheetEast.position.set(-5.0, roofY + 0.08, midZ);
  sheetEast.rotation.z = -0.06;
  sheetEast.castShadow = true;
  sheetEast.receiveShadow = true;

  // Partial center roof patch creates dramatic alternating sun shafts down the passage
  const sheetPatch1 = new THREE.Mesh(roofSheetMidPatch, mats.corrugatedZinc);
  sheetPatch1.position.set(-8.6, roofY + 0.31, -18.0);
  sheetPatch1.rotation.z = -0.06;
  sheetPatch1.castShadow = true;
  sub.add(sheetWest, sheetEast, sheetPatch1);

  // Safety yellow concrete-filled steel bollards flanking entrances
  const bollardGeo = new THREE.CylinderGeometry(0.11, 0.12, 1.05, 12);
  const bollardCapGeo = new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  geos.push(bollardGeo, bollardCapGeo);
  for (const [bx, bz] of [
    [-11.6, -5.0],
    [-7.1, -5.0],
    [-2.9, -14.5],
    [-2.9, -9.5],
  ]) {
    const b = new THREE.Mesh(bollardGeo, mats.paintSafetyAmber);
    b.position.set(bx, apronY + 0.52, bz);
    b.castShadow = true;
    const cap = new THREE.Mesh(bollardCapGeo, mats.darkSteel);
    cap.position.set(bx, apronY + 1.04, bz);
    sub.add(b, cap);
  }

  // Overhead cable tray + 4 sagging power cables running from east wall into QGBT-04
  const trayGeo = new THREE.BoxGeometry(10.6, 0.08, 0.55);
  geos.push(trayGeo);
  const tray = new THREE.Mesh(trayGeo, mats.bareSteel);
  tray.position.set(-8.8, 3.45, -14.2);
  tray.castShadow = true;
  sub.add(tray);

  for (let c = 0; c < 4; c++) {
    const czOff = -14.38 + c * 0.12;
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.3, 2.75, -8.2 + c * 0.08),
      new THREE.Vector3(-4.2, 3.45, czOff),
      new THREE.Vector3(-8.5, 3.36, czOff),
      new THREE.Vector3(-13.4, 3.42, czOff),
      new THREE.Vector3(-13.8, 2.15, czOff),
    ]);
    const cGeo = new THREE.TubeGeometry(cableCurve, 28, 0.028, 7, false);
    geos.push(cGeo);
    const cable = new THREE.Mesh(cGeo, c === 3 ? mats.copperCoil : mats.rubberTire);
    cable.castShadow = true;
    sub.add(cable);
  }

  // Step-down Transformer Skid in North-West Corner (-13.1, apronY, -19.1)
  const xformer = new THREE.Group();
  xformer.position.set(-13.1, apronY, -19.1);
  const xfBodyGeo = new THREE.BoxGeometry(2.3, 1.85, 1.9);
  const xfFinGeo = new THREE.BoxGeometry(0.05, 1.5, 0.38);
  const insulatorPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.09, 0.02),
    new THREE.Vector2(0.06, 0.12),
    new THREE.Vector2(0.09, 0.18),
    new THREE.Vector2(0.05, 0.28),
    new THREE.Vector2(0.08, 0.34),
    new THREE.Vector2(0.03, 0.45),
    new THREE.Vector2(0, 0.45),
  ];
  const insulatorGeo = new THREE.LatheGeometry(insulatorPts, 12);
  geos.push(xfBodyGeo, xfFinGeo, insulatorGeo);
  const xfBody = new THREE.Mesh(xfBodyGeo, mats.paintTeal);
  xfBody.position.set(0, 0.96, 0);
  xfBody.castShadow = true;
  xfBody.receiveShadow = true;
  xformer.add(xfBody);
  for (let f = -4; f <= 4; f++) {
    const fin = new THREE.Mesh(xfFinGeo, mats.darkSteel);
    fin.position.set(1.26, 0.95, f * 0.19);
    fin.castShadow = true;
    xformer.add(fin);
  }
  for (const ix of [-0.55, 0, 0.55]) {
    const ins = new THREE.Mesh(insulatorGeo, mats.paintPanelGrey);
    ins.position.set(ix, 1.88, 0.3);
    xformer.add(ins);
  }
  sub.add(xformer);

  // =========================================================
  // 2. QUADRO GERAL QGBT-04 (Interactive Target #3)
  // =========================================================
  const qgbt = new THREE.Group();
  qgbt.position.set(-13.9, apronY, -14.2);

  const cabGeo = new THREE.BoxGeometry(0.78, 2.15, 2.6);
  const ajarDoorGeo = new THREE.BoxGeometry(0.06, 1.85, 0.95);
  const busbarGeo = new THREE.BoxGeometry(0.04, 1.4, 0.08);
  const meterFaceGeo = new THREE.CircleGeometry(0.08, 16);
  geos.push(cabGeo, ajarDoorGeo, busbarGeo, meterFaceGeo);

  const qCab = new THREE.Mesh(cabGeo, mats.paintPanelGrey);
  qCab.position.set(0, 1.12, 0);
  qCab.castShadow = true;
  qCab.receiveShadow = true;
  qgbt.add(qCab);

  // Hinged ajar service door revealing copper busbars
  const ajarDoor = new THREE.Mesh(ajarDoorGeo, mats.paintTeal);
  ajarDoor.position.set(0.62, 1.1, 0.95);
  ajarDoor.rotation.y = 0.52;
  ajarDoor.castShadow = true;
  qgbt.add(ajarDoor);

  for (let b = 0; b < 3; b++) {
    const bar = new THREE.Mesh(busbarGeo, mats.copperCoil);
    bar.position.set(0.41, 1.1, 0.25 + b * 0.14);
    qgbt.add(bar);
  }

  // QGBT-04 & PERIGO stenciled plaques
  const qgbtPlateMat = new THREE.MeshStandardMaterial({ map: tex.plateQgbt, roughness: 0.45, metalness: 0.2 });
  const dangerPlateMat = new THREE.MeshStandardMaterial({ map: tex.plateDanger, roughness: 0.45, metalness: 0.2 });
  customMats.push(qgbtPlateMat, dangerPlateMat);
  const plaqueGeo = new THREE.PlaneGeometry(0.68, 0.34);
  geos.push(plaqueGeo);

  const qPlate = new THREE.Mesh(plaqueGeo, qgbtPlateMat);
  qPlate.position.set(0.4, 1.85, -0.58);
  qPlate.rotation.y = Math.PI / 2;
  const dPlate = new THREE.Mesh(plaqueGeo, dangerPlateMat);
  dPlate.position.set(0.4, 1.42, -0.58);
  dPlate.rotation.y = Math.PI / 2;
  qgbt.add(qPlate, dPlate);

  // Status LEDs (red fault vs green energized)
  const ledGeo = new THREE.SphereGeometry(0.045, 10, 10);
  geos.push(ledGeo);
  const faultLed = new THREE.Mesh(ledGeo, mats.ledRed);
  faultLed.position.set(0.41, 1.62, -0.22);
  const readyLed = new THREE.Mesh(ledGeo, mats.ledGreen);
  readyLed.position.set(0.41, 1.62, -0.08);
  qgbt.add(faultLed, readyLed);

  // Heavy breaker lever handle (rotates up when closed)
  const breakerLever = new THREE.Group();
  breakerLever.position.set(0.41, 1.12, -0.55);
  const leverArmGeo = new THREE.BoxGeometry(0.28, 0.055, 0.055);
  const leverGripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.22, 10);
  leverGripGeo.rotateX(Math.PI / 2);
  geos.push(leverArmGeo, leverGripGeo);
  const bArm = new THREE.Mesh(leverArmGeo, mats.bareSteel);
  bArm.position.set(0.14, 0, 0);
  const bGrip = new THREE.Mesh(leverGripGeo, mats.paintSafetyAmber);
  bGrip.position.set(0.27, 0, 0);
  breakerLever.add(bArm, bGrip);
  breakerLever.rotation.z = -0.65; // Open/tripped downward initially
  qgbt.add(breakerLever);

  // Animated fault spark / arc light inside QGBT-04
  const faultLight = new THREE.PointLight(0xff5226, 2.8, 9, 1.8);
  faultLight.position.set(0.65, 1.25, 0.15);
  qgbt.add(faultLight);

  sub.add(qgbt);

  // Interior ceiling batten lamps inside covered bay (subtle cool emergency light pre-restore)
  const substationLights: THREE.PointLight[] = [];
  const battenGeo = new THREE.BoxGeometry(0.16, 0.08, 1.4);
  geos.push(battenGeo);
  for (const [lx, lz] of [
    [-9.5, -18.2],
    [-9.5, -12.6],
    [-9.5, -7.8],
  ]) {
    const batten = new THREE.Mesh(battenGeo, mats.sodiumLamp);
    batten.position.set(lx, roofY - 0.55, lz);
    sub.add(batten);
    const pLight = new THREE.PointLight(0xdff2ff, 0.55, 14, 1.5);
    pLight.position.set(lx, roofY - 0.85, lz);
    sub.add(pLight);
    substationLights.push(pLight);
  }

  // QGBT-04 hazard safety curb + overhead galvanized steel conduits
  const curbGeo = new THREE.BoxGeometry(1.15, 0.12, 2.85);
  const conduitGeo = new THREE.CylinderGeometry(0.036, 0.036, 2.2, 8);
  geos.push(curbGeo, conduitGeo);
  const curb = new THREE.Mesh(curbGeo, mats.hazardStripe);
  curb.position.set(-13.8, apronY + 0.06, -14.2);
  sub.add(curb);
  for (let c = -1; c <= 1; c++) {
    const cond = new THREE.Mesh(conduitGeo, mats.bareSteel);
    cond.position.set(-13.9, apronY + 3.15, -14.2 + c * 0.28);
    sub.add(cond);
  }

  // =========================================================
  // 3. SECCIONADORA S-02 (Interactive Target #2, East Exterior Wall)
  // =========================================================
  const switchBox = new THREE.Group();
  switchBox.position.set(-3.26, apronY + 1.48, -8.0);
  const swBodyGeo = new THREE.BoxGeometry(0.24, 0.72, 0.54);
  geos.push(swBodyGeo);
  const swBody = new THREE.Mesh(swBodyGeo, mats.paintPanelGrey);
  swBody.castShadow = true;
  switchBox.add(swBody);

  const swPlateMat = new THREE.MeshStandardMaterial({ map: tex.plateSwitch, roughness: 0.48, metalness: 0.2 });
  customMats.push(swPlateMat);
  const swPlateGeo = new THREE.PlaneGeometry(0.46, 0.24);
  geos.push(swPlateGeo);
  const swPlate = new THREE.Mesh(swPlateGeo, swPlateMat);
  swPlate.position.set(0.13, 0.16, 0);
  swPlate.rotation.y = Math.PI / 2;
  switchBox.add(swPlate);

  const switchLever = new THREE.Group();
  switchLever.position.set(0.08, -0.05, 0.3);
  const swRodGeo = new THREE.BoxGeometry(0.05, 0.44, 0.05);
  const swHandleGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.2, 10);
  swHandleGeo.rotateX(Math.PI / 2);
  geos.push(swRodGeo, swHandleGeo);
  const swRod = new THREE.Mesh(swRodGeo, mats.bareSteel);
  swRod.position.set(0, 0.2, 0);
  const swGrip = new THREE.Mesh(swHandleGeo, mats.paintSafetyAmber);
  swGrip.position.set(0, 0.42, 0.04);
  switchLever.add(swRod, swGrip);
  switchLever.rotation.x = -0.35; // Engaged up initially, throws down to isolate
  switchBox.add(switchLever);
  sub.add(switchBox);

  group.add(sub);

  // =========================================================
  // 4. BOILER, CONDENSATE VESSEL, PIPE RACK & VÁLVULA V-07
  // =========================================================
  const boilerZone = new THREE.Group();

  // Horizontal Condensate Pressure Vessel at (10.3, apronY, -13.8)
  const vesselPts = [
    new THREE.Vector2(0, -2.75),
    new THREE.Vector2(0.75, -2.6),
    new THREE.Vector2(1.12, -2.2),
    new THREE.Vector2(1.12, 2.2),
    new THREE.Vector2(0.75, 2.6),
    new THREE.Vector2(0, 2.75),
  ];
  const vesselGeo = new THREE.LatheGeometry(vesselPts, 24);
  vesselGeo.rotateZ(Math.PI / 2);
  const saddleGeo = new THREE.BoxGeometry(0.45, 0.95, 1.85);
  geos.push(vesselGeo, saddleGeo);

  const vessel = new THREE.Mesh(vesselGeo, mats.paintPanelGrey);
  vessel.position.set(10.3, apronY + 1.55, -13.8);
  vessel.castShadow = true;
  vessel.receiveShadow = true;
  boilerZone.add(vessel);

  for (const sx of [8.6, 12.0]) {
    const saddle = new THREE.Mesh(saddleGeo, mats.concreteWall);
    saddle.position.set(sx, apronY + 0.48, -13.8);
    saddle.castShadow = true;
    saddle.receiveShadow = true;
    boilerZone.add(saddle);
  }

  // Twin Towering Boiler Exhaust Stacks + Caged Maintenance Ladder
  const stackPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1.15, 0),
    new THREE.Vector2(1.05, 3.2),
    new THREE.Vector2(0.84, 8.5),
    new THREE.Vector2(0.78, 13.4),
    new THREE.Vector2(0.86, 13.7),
    new THREE.Vector2(0.72, 13.7),
  ];
  const stackGeo = new THREE.LatheGeometry(stackPts, 22);
  const stackPlinthGeo = new THREE.BoxGeometry(3.2, 0.9, 3.2);
  geos.push(stackGeo, stackPlinthGeo);

  for (const [sx, sz, hScale] of [
    [17.4, -18.2, 1.0],
    [19.8, -16.4, 0.84],
  ] as const) {
    const plinth = new THREE.Mesh(stackPlinthGeo, mats.concreteWall);
    plinth.position.set(sx, apronY + 0.45, sz);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    boilerZone.add(plinth);

    const stack = new THREE.Mesh(stackGeo, mats.rustIron);
    stack.position.set(sx, apronY + 0.88, sz);
    stack.scale.y = hScale;
    stack.castShadow = true;
    stack.receiveShadow = true;
    boilerZone.add(stack);
  }

  // Caged vertical ladder along main chimney front
  const railSideGeo = new THREE.CylinderGeometry(0.025, 0.025, 11.2, 6);
  const rungGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.48, 6);
  rungGeo.rotateZ(Math.PI / 2);
  const hoopGeo = new THREE.TorusGeometry(0.38, 0.02, 6, 14, Math.PI * 1.45);
  hoopGeo.rotateX(Math.PI / 2);
  geos.push(railSideGeo, rungGeo, hoopGeo);

  const ladX = 17.4;
  const ladZ = -17.05;
  for (const ox of [-0.24, 0.24]) {
    const r = new THREE.Mesh(railSideGeo, mats.paintSafetyAmber);
    r.position.set(ladX + ox, apronY + 6.4, ladZ);
    r.castShadow = true;
    boilerZone.add(r);
  }
  for (let y = 1.2; y < 11.6; y += 0.42) {
    const rung = new THREE.Mesh(rungGeo, mats.bareSteel);
    rung.position.set(ladX, apronY + y, ladZ);
    boilerZone.add(rung);
  }
  for (let y = 2.6; y < 11.4; y += 1.35) {
    const hoop = new THREE.Mesh(hoopGeo, mats.paintSafetyAmber);
    hoop.position.set(ladX, apronY + y, ladZ + 0.28);
    hoop.rotation.z = -0.7;
    boilerZone.add(hoop);
  }

  // Flanged Steam/Condensate Pipelines connecting chimney -> condensate tank -> Valve V-07 header
  boilerZone.add(
    buildFlangedPipeRun(
      [
        new THREE.Vector3(16.6, apronY + 2.6, -17.4),
        new THREE.Vector3(14.5, apronY + 2.6, -15.6),
        new THREE.Vector3(12.6, apronY + 2.55, -13.8),
      ],
      0.24,
      mats.bareSteel,
      mats.rustIron,
      geos
    )
  );
  boilerZone.add(
    buildFlangedPipeRun(
      [
        new THREE.Vector3(8.1, apronY + 1.45, -12.7),
        new THREE.Vector3(7.6, apronY + 1.45, -10.8),
        new THREE.Vector3(7.6, apronY + 1.26, -8.8),
        new THREE.Vector3(7.6, apronY + 0.2, -8.8),
      ],
      0.13,
      mats.paintTeal,
      mats.darkSteel,
      geos
    )
  );

  // VÁLVULA V-07 Assembly (Interactive Target #1 at [7.6, apronY + 1.26, -8.8])
  const valveGroup = new THREE.Group();
  valveGroup.position.set(7.6, apronY + 1.26, -8.8);

  const valveBodyGeo = new THREE.SphereGeometry(0.24, 14, 12);
  const valveStemGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.34, 10);
  geos.push(valveBodyGeo, valveStemGeo);
  const vBody = new THREE.Mesh(valveBodyGeo, mats.rustIron);
  vBody.castShadow = true;
  valveGroup.add(vBody);

  const valveWheel = new THREE.Group();
  valveWheel.position.set(0, 0.28, 0.24);
  valveWheel.rotation.x = Math.PI / 2;
  const wheelRimGeo = new THREE.TorusGeometry(0.24, 0.032, 8, 20);
  const spokeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.46, 6);
  geos.push(wheelRimGeo, spokeGeo);
  const wRim = new THREE.Mesh(wheelRimGeo, mats.paintSafetyAmber);
  wRim.rotation.x = Math.PI / 2;
  wRim.castShadow = true;
  valveWheel.add(wRim);
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(spokeGeo, mats.paintSafetyAmber);
    sp.rotation.z = Math.PI / 2;
    sp.rotation.y = (i / 3) * Math.PI;
    valveWheel.add(sp);
  }
  const stem = new THREE.Mesh(valveStemGeo, mats.bareSteel);
  stem.position.set(0, -0.14, 0);
  valveWheel.add(stem);
  valveGroup.add(valveWheel);

  // Pressure Gauge with dial & animated needle
  const gaugeCaseGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 18);
  gaugeCaseGeo.rotateX(Math.PI / 2);
  const gaugeDialGeo = new THREE.CircleGeometry(0.14, 18);
  const needleGeo = new THREE.BoxGeometry(0.014, 0.1, 0.01);
  geos.push(gaugeCaseGeo, gaugeDialGeo, needleGeo);
  const gaugeMat = new THREE.MeshStandardMaterial({ map: tex.gaugeDial, roughness: 0.3 });
  const vPlateMat = new THREE.MeshStandardMaterial({ map: tex.plateValve, roughness: 0.48, metalness: 0.2 });
  customMats.push(gaugeMat, vPlateMat);

  const gCase = new THREE.Mesh(gaugeCaseGeo, mats.darkSteel);
  gCase.position.set(-0.28, 0.36, 0.05);
  const gFace = new THREE.Mesh(gaugeDialGeo, gaugeMat);
  gFace.position.set(-0.28, 0.36, 0.095);
  const gaugeNeedle = new THREE.Mesh(needleGeo, mats.ledRed);
  gaugeNeedle.position.set(-0.28, 0.36, 0.105);
  const vPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.24), vPlateMat);
  geos.push(vPlate.geometry);
  vPlate.position.set(0.32, 0.28, 0.12);
  valveGroup.add(gCase, gFace, gaugeNeedle, vPlate);

  boilerZone.add(valveGroup);
  group.add(boilerZone);

  // =========================================================
  // 5. LATTICE FLOODLIGHT TOWERS & PERIMETER FENCE
  // =========================================================
  const floodLights: THREE.SpotLight[] = [];
  const towerBaseGeo = new THREE.BoxGeometry(1.4, 0.4, 1.4);
  const towerMastGeo = new THREE.CylinderGeometry(0.14, 0.26, 9.6, 8);
  const crossArmGeo = new THREE.BoxGeometry(1.9, 0.12, 0.12);
  const lampHeadGeo = new THREE.BoxGeometry(0.46, 0.28, 0.24);
  const lampLensGeo = new THREE.PlaneGeometry(0.38, 0.22);
  geos.push(towerBaseGeo, towerMastGeo, crossArmGeo, lampHeadGeo, lampLensGeo);

  const towerSpecs: [number, number, number, number, number][] = [
    [19.7, -2.9, 3.0, 1.0, 2.0],
    [-17.7, 16.1, -3.5, 0.8, 3.5],
  ];
  for (const [lx, lz, tx, ty, tz] of towerSpecs) {
    const tower = new THREE.Group();
    const gy = groundHeightAt(lx, lz);
    tower.position.set(lx, gy, lz);
    tower.lookAt(tx, gy, tz);

    const base = new THREE.Mesh(towerBaseGeo, mats.concreteWall);
    base.position.set(0, 0.2, 0);
    const mast = new THREE.Mesh(towerMastGeo, mats.rustIron);
    mast.position.set(0, 5.0, 0);
    mast.castShadow = true;
    const arm = new THREE.Mesh(crossArmGeo, mats.darkSteel);
    arm.position.set(0, 9.75, 0.12);
    tower.add(base, mast, arm);

    for (const hx of [-0.62, 0.62]) {
      const head = new THREE.Mesh(lampHeadGeo, mats.darkSteel);
      head.position.set(hx, 9.85, 0.25);
      head.rotation.x = 0.42;
      const lens = new THREE.Mesh(lampLensGeo, mats.sodiumLamp);
      lens.position.set(hx, 9.8, 0.38);
      lens.rotation.x = 0.42;
      tower.add(head, lens);
    }

    const spot = new THREE.SpotLight(0xffbe6b, 0, 52, 0.72, 0.62, 1.35);
    spot.position.set(0, 9.7, 0.4);
    const sTarget = new THREE.Object3D();
    sTarget.position.set(0, 0, 18);
    tower.add(spot, sTarget);
    spot.target = sTarget;
    floodLights.push(spot);

    group.add(tower);
  }

  // Perimeter fence posts + double rails around yard edges (leaving south gate open)
  const postGeo = new THREE.BoxGeometry(0.11, 2.25, 0.11);
  const railFenceGeo = new THREE.CylinderGeometry(0.022, 0.022, 3.9, 6);
  railFenceGeo.rotateZ(Math.PI / 2);
  geos.push(postGeo, railFenceGeo);

  const postPositions: [number, number, number][] = [];
  for (let x = -28; x <= 28; x += 4) {
    postPositions.push([x, -YARD_HALF + 1.2, 0]);
    if (Math.abs(x + 1.5) > 4.2) {
      postPositions.push([x, YARD_HALF - 1.2, 0]);
    }
  }
  for (let z = -28; z <= 28; z += 4) {
    postPositions.push([-YARD_HALF + 1.2, z, Math.PI / 2]);
    postPositions.push([YARD_HALF - 1.2, z, Math.PI / 2]);
  }
  for (const [fx, fz, rot] of postPositions) {
    const gy = groundHeightAt(fx, fz);
    const post = new THREE.Mesh(postGeo, mats.rustIron);
    post.position.set(fx, gy + 1.08, fz);
    post.castShadow = true;
    group.add(post);

    const railTop = new THREE.Mesh(railFenceGeo, mats.bareSteel);
    railTop.position.set(fx, gy + 1.75, fz);
    railTop.rotation.y = rot;
    const railMid = new THREE.Mesh(railFenceGeo, mats.bareSteel);
    railMid.position.set(fx, gy + 0.95, fz);
    railMid.rotation.y = rot;
    group.add(railTop, railMid);
  }

  // Raised gate barrier arm at entrance (-1.5, z = 29.8)
  const gatePost = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.4, 0.28), mats.paintSafetyAmber);
  geos.push(gatePost.geometry);
  gatePost.position.set(-5.6, groundHeightAt(-5.6, 29.5) + 0.7, 29.5);
  gatePost.castShadow = true;
  const gateArm = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 0.1), mats.hazardStripe);
  geos.push(gateArm.geometry);
  gateArm.position.set(-4.3, groundHeightAt(-5.6, 29.5) + 2.35, 29.5);
  gateArm.rotation.z = 0.75; // Open barrier arm tilted upward welcoming player
  gateArm.castShadow = true;
  group.add(gatePost, gateArm);

  scene.add(group);

  let valveSpin = 0;
  let switchAngle = -0.35;
  let breakerAngle = -0.65;

  return {
    group,
    valveWheel,
    gaugeNeedle,
    switchLever,
    breakerLever,
    faultLight,
    substationLights,
    floodLights,
    update: (
      time: number,
      valvePurged: boolean,
      switchIsolated: boolean,
      breakerRestored: boolean,
      climax: number
    ) => {
      // Animate valve handwheel & pressure gauge stabilization
      const targetSpin = valvePurged ? Math.PI * 3.5 : 0;
      valveSpin += (targetSpin - valveSpin) * 0.08;
      valveWheel.rotation.y = valveSpin;

      const wobble = valvePurged ? Math.sin(time * 2.0) * 0.03 : Math.sin(time * 16.0) * 0.22;
      const baseNeedle = breakerRestored ? -0.45 : valvePurged ? -0.95 : 0.45;
      gaugeNeedle.rotation.z = baseNeedle + wobble;

      // Animate Seccionadora S-02 throw lever
      const targetSw = switchIsolated ? 0.85 : -0.35;
      switchAngle += (targetSw - switchAngle) * 0.12;
      switchLever.rotation.x = switchAngle;

      // Animate QGBT-04 breaker handle
      const targetBr = breakerRestored ? 0.65 : -0.65;
      breakerAngle += (targetBr - breakerAngle) * 0.14;
      breakerLever.rotation.z = breakerAngle;

      // Fault arc light crackles loudly until S-02 isolates the line
      if (!switchIsolated && !breakerRestored) {
        const arc = Math.sin(time * 29.0) * Math.sin(time * 47.0);
        faultLight.intensity = arc > 0.35 ? 1.8 + arc * 4.5 : 0.35;
        mats.ledRed.emissiveIntensity = 2.6 + Math.sin(time * 12) * 0.9;
        mats.ledGreen.emissiveIntensity = 0.08;
      } else if (!breakerRestored) {
        faultLight.intensity = 0;
        mats.ledRed.emissiveIntensity = 0.6;
        mats.ledGreen.emissiveIntensity = 0.12;
      } else {
        faultLight.intensity = 0;
        mats.ledRed.emissiveIntensity = 0.08;
        mats.ledGreen.emissiveIntensity = 3.8;
      }

      // Climax lighting sequence: interior battens snap on first, then yard sodium floodlights sequentially!
      const subOn = breakerRestored ? Math.min(1, climax * 4.5) : 0;
      for (let i = 0; i < substationLights.length; i++) {
        const flicker = breakerRestored && climax < 0.32 ? (Math.sin(time * 55 + i * 7) > 0 ? 1 : 0.25) : 1;
        substationLights[i].intensity = 0.55 + subOn * 8.5 * flicker;
      }

      const f1 = climax > 0.22 ? Math.min(1, (climax - 0.22) * 3.5) : 0;
      const f2 = climax > 0.48 ? Math.min(1, (climax - 0.48) * 3.5) : 0;
      floodLights[0].intensity = f1 * 48;
      floodLights[1].intensity = f2 * 44;
      mats.sodiumLamp.emissiveIntensity = 0.15 + Math.max(f1, f2) * 5.2;
    },
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of customMats) m.dispose();
    },
  };
}
