import * as THREE from 'three';
import type { MaterialBank } from './materials';
import type { TextureBank } from './textures';
import { groundHeightAt } from './logic';

export interface MachinerySystem {
  group: THREE.Group;
  headlightLeft: THREE.SpotLight;
  headlightRight: THREE.SpotLight;
  beaconLight: THREE.PointLight;
  update: (time: number, climax: number) => void;
  dispose: () => void;
}

function buildLugWheel(
  radius: number,
  width: number,
  mats: MaterialBank,
  geometries: THREE.BufferGeometry[]
): THREE.Group {
  const wheel = new THREE.Group();

  // Sculpted tire profile with rounded shoulder via LatheGeometry
  const rInner = radius * 0.56;
  const hw = width * 0.5;
  const pts = [
    new THREE.Vector2(rInner, -hw * 0.85),
    new THREE.Vector2(radius * 0.9, -hw),
    new THREE.Vector2(radius, -hw * 0.72),
    new THREE.Vector2(radius, hw * 0.72),
    new THREE.Vector2(radius * 0.9, hw),
    new THREE.Vector2(rInner, hw * 0.85),
  ];
  const tireGeo = new THREE.LatheGeometry(pts, 28);
  tireGeo.rotateZ(Math.PI / 2);
  geometries.push(tireGeo);
  const tire = new THREE.Mesh(tireGeo, mats.rubberTire);
  tire.castShadow = true;
  tire.receiveShadow = true;
  wheel.add(tire);

  // Stepped steel rim + recessed dish
  const rimPts = [
    new THREE.Vector2(0.05, -hw * 0.55),
    new THREE.Vector2(rInner * 0.96, -hw * 0.65),
    new THREE.Vector2(rInner * 1.04, -hw * 0.78),
    new THREE.Vector2(rInner * 1.04, hw * 0.78),
    new THREE.Vector2(rInner * 0.85, hw * 0.5),
    new THREE.Vector2(rInner * 0.48, hw * 0.12),
    new THREE.Vector2(rInner * 0.36, hw * 0.55),
    new THREE.Vector2(0.05, hw * 0.55),
  ];
  const rimGeo = new THREE.LatheGeometry(rimPts, 20);
  rimGeo.rotateZ(Math.PI / 2);
  geometries.push(rimGeo);
  const rim = new THREE.Mesh(rimGeo, mats.paintSafetyAmber);
  rim.castShadow = true;
  wheel.add(rim);

  // Hub cap + 8 lug bolts
  const hubGeo = new THREE.CylinderGeometry(rInner * 0.28, rInner * 0.32, width * 0.92, 12);
  hubGeo.rotateZ(Math.PI / 2);
  geometries.push(hubGeo);
  const hub = new THREE.Mesh(hubGeo, mats.darkSteel);
  wheel.add(hub);

  const lugGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.06, 6);
  lugGeo.rotateZ(Math.PI / 2);
  geometries.push(lugGeo);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lug = new THREE.Mesh(lugGeo, mats.bareSteel);
    lug.position.set(hw * 0.56, Math.cos(a) * rInner * 0.62, Math.sin(a) * rInner * 0.62);
    wheel.add(lug);
  }

  return wheel;
}

function buildSculptedHoodGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1.75, 0);
  shape.lineTo(1.78, 0.72);
  shape.lineTo(1.58, 0.95);
  shape.lineTo(0.18, 1.08);
  shape.lineTo(0, 1.08);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.98,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  // Extrude is along +Z (width); rotate so X is width and +Z is forward nose
  geo.center();
  geo.rotateY(-Math.PI / 2);
  return geo;
}

export function createMachinerySystem(
  scene: THREE.Scene,
  mats: MaterialBank,
  tex: TextureBank
): MachinerySystem {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const customMats: THREE.Material[] = [];

  // =========================================================
  // 1. HERO CANE HAULAGE TRUCK (FROTA 18) — Center-Right Yard
  // =========================================================
  const truck = new THREE.Group();
  const tx = 4.6;
  const tz = 4.8;
  truck.position.set(tx, groundHeightAt(tx, tz), tz);
  truck.rotation.y = -0.36; // Angled hero pose facing gate/spawn viewer

  // Twin C-channel frame rails
  const railGeo = new THREE.BoxGeometry(0.16, 0.26, 9.8);
  geometries.push(railGeo);
  for (const sx of [-0.52, 0.52]) {
    const rail = new THREE.Mesh(railGeo, mats.darkSteel);
    rail.position.set(sx, 0.82, -0.4);
    rail.castShadow = true;
    rail.receiveShadow = true;
    truck.add(rail);
  }

  // Heavy steel bull-bar front bumper & tow shackles
  const bumperGeo = new THREE.BoxGeometry(2.42, 0.34, 0.28);
  geometries.push(bumperGeo);
  const bumper = new THREE.Mesh(bumperGeo, mats.darkSteel);
  bumper.position.set(0, 0.78, 4.45);
  bumper.castShadow = true;
  truck.add(bumper);

  // Bull-bar tubular grille guard
  const barCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.05, 0.92, 4.58),
    new THREE.Vector3(-0.98, 1.56, 4.62),
    new THREE.Vector3(0, 1.62, 4.64),
    new THREE.Vector3(0.98, 1.56, 4.62),
    new THREE.Vector3(1.05, 0.92, 4.58),
  ]);
  const barGeo = new THREE.TubeGeometry(barCurve, 20, 0.038, 8, false);
  geometries.push(barGeo);
  const bullBar = new THREE.Mesh(barGeo, mats.darkSteel);
  bullBar.castShadow = true;
  truck.add(bullBar);

  // Sculpted forward engine hood
  const hoodGeo = buildSculptedHoodGeo();
  geometries.push(hoodGeo);
  const hood = new THREE.Mesh(hoodGeo, mats.paintOchreTruck);
  hood.position.set(0, 1.48, 3.45);
  hood.castShadow = true;
  hood.receiveShadow = true;
  truck.add(hood);

  // Slatted radiator grille
  const grilleFrameGeo = new THREE.BoxGeometry(1.52, 0.78, 0.1);
  geometries.push(grilleFrameGeo);
  const grilleFrame = new THREE.Mesh(grilleFrameGeo, mats.darkSteel);
  grilleFrame.position.set(0, 1.44, 4.35);
  truck.add(grilleFrame);

  const louverGeo = new THREE.BoxGeometry(1.36, 0.04, 0.06);
  geometries.push(louverGeo);
  for (let i = 0; i < 6; i++) {
    const slat = new THREE.Mesh(louverGeo, mats.bareSteel);
    slat.position.set(0, 1.15 + i * 0.11, 4.41);
    truck.add(slat);
  }

  // Headlight housings + bulbs
  const lampHousingGeo = new THREE.BoxGeometry(0.32, 0.18, 0.12);
  const lampBulbGeo = new THREE.BoxGeometry(0.24, 0.12, 0.04);
  geometries.push(lampHousingGeo, lampBulbGeo);
  for (const sx of [-0.92, 0.92]) {
    const housing = new THREE.Mesh(lampHousingGeo, mats.darkSteel);
    housing.position.set(sx, 1.12, 4.36);
    truck.add(housing);
    const bulb = new THREE.Mesh(lampBulbGeo, mats.headlightLamp);
    bulb.position.set(sx, 1.12, 4.42);
    truck.add(bulb);
  }

  // Cab shell (split pillars + roof + rear wall + floor so interior is visible!)
  const cabFloorGeo = new THREE.BoxGeometry(2.26, 0.14, 1.85);
  const cabBackGeo = new THREE.BoxGeometry(2.26, 1.48, 0.14);
  const cabRoofGeo = new THREE.BoxGeometry(2.3, 0.14, 1.92);
  const pillarGeo = new THREE.BoxGeometry(0.11, 0.92, 0.11);
  const doorGeo = new THREE.BoxGeometry(0.12, 0.72, 1.45);
  geometries.push(cabFloorGeo, cabBackGeo, cabRoofGeo, pillarGeo, doorGeo);

  const cabFloor = new THREE.Mesh(cabFloorGeo, mats.darkSteel);
  cabFloor.position.set(0, 1.08, 1.65);
  cabFloor.castShadow = true;
  truck.add(cabFloor);

  const cabBack = new THREE.Mesh(cabBackGeo, mats.paintOchreTruck);
  cabBack.position.set(0, 1.82, 0.78);
  cabBack.castShadow = true;
  truck.add(cabBack);

  const cabRoof = new THREE.Mesh(cabRoofGeo, mats.paintOchreTruck);
  cabRoof.position.set(0, 2.6, 1.68);
  cabRoof.castShadow = true;
  truck.add(cabRoof);

  for (const sx of [-1.07, 1.07]) {
    const door = new THREE.Mesh(doorGeo, mats.paintOchreTruck);
    door.position.set(sx, 1.46, 1.62);
    door.castShadow = true;
    truck.add(door);

    const aPillar = new THREE.Mesh(pillarGeo, mats.paintOchreTruck);
    aPillar.position.set(sx, 2.16, 2.46);
    aPillar.rotation.x = -0.18;
    aPillar.castShadow = true;
    truck.add(aPillar);

    const bPillar = new THREE.Mesh(pillarGeo, mats.paintOchreTruck);
    bPillar.position.set(sx, 2.16, 0.85);
    bPillar.castShadow = true;
    truck.add(bPillar);
  }

  // Interior seats + dash + steering wheel visible through glass
  const seatGeo = new THREE.BoxGeometry(0.54, 0.62, 0.52);
  const dashGeo = new THREE.BoxGeometry(1.96, 0.34, 0.42);
  const wheelRingGeo = new THREE.TorusGeometry(0.2, 0.025, 8, 18);
  geometries.push(seatGeo, dashGeo, wheelRingGeo);
  for (const sx of [-0.54, 0.54]) {
    const seat = new THREE.Mesh(seatGeo, mats.darkSteel);
    seat.position.set(sx, 1.48, 1.28);
    truck.add(seat);
  }
  const dash = new THREE.Mesh(dashGeo, mats.darkSteel);
  dash.position.set(0, 1.56, 2.25);
  truck.add(dash);
  const steer = new THREE.Mesh(wheelRingGeo, mats.rubberTire);
  steer.position.set(-0.54, 1.76, 2.02);
  steer.rotation.x = 0.72;
  truck.add(steer);

  // Windshield + side glass + wipers
  const windGeo = new THREE.PlaneGeometry(2.04, 0.84);
  const sideGlassGeo = new THREE.PlaneGeometry(1.42, 0.78);
  geometries.push(windGeo, sideGlassGeo);
  const wind = new THREE.Mesh(windGeo, mats.cabGlass);
  wind.position.set(0, 2.16, 2.49);
  wind.rotation.x = -0.18;
  truck.add(wind);
  for (const sx of [-1.08, 1.08]) {
    const sg = new THREE.Mesh(sideGlassGeo, mats.cabGlass);
    sg.position.set(sx, 2.16, 1.65);
    sg.rotation.y = sx < 0 ? -Math.PI / 2 : Math.PI / 2;
    truck.add(sg);
  }

  // Frota 18 door stencil decals
  const doorPlateMat = new THREE.MeshStandardMaterial({
    map: tex.plateFrota,
    roughness: 0.48,
    metalness: 0.25,
  });
  customMats.push(doorPlateMat);
  const doorPlateGeo = new THREE.PlaneGeometry(0.84, 0.42);
  geometries.push(doorPlateGeo);
  for (const sx of [-1.14, 1.14]) {
    const plate = new THREE.Mesh(doorPlateGeo, doorPlateMat);
    plate.position.set(sx, 1.48, 1.64);
    plate.rotation.y = sx < 0 ? -Math.PI / 2 : Math.PI / 2;
    truck.add(plate);
  }

  // Side mirrors on tubular brackets
  const mirrorHousingGeo = new THREE.BoxGeometry(0.12, 0.42, 0.22);
  geometries.push(mirrorHousingGeo);
  for (const sx of [-1.32, 1.32]) {
    const mirror = new THREE.Mesh(mirrorHousingGeo, mats.darkSteel);
    mirror.position.set(sx, 2.02, 2.28);
    mirror.castShadow = true;
    truck.add(mirror);
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.83, 2.25, 2.28),
      new THREE.Vector3(sx, 2.25, 2.28),
      new THREE.Vector3(sx, 1.78, 2.28),
      new THREE.Vector3(sx * 0.83, 1.78, 2.28),
    ]);
    const armGeo = new THREE.TubeGeometry(armCurve, 10, 0.018, 6, false);
    geometries.push(armGeo);
    truck.add(new THREE.Mesh(armGeo, mats.bareSteel));
  }

  // Vertical exhaust stack with heat shield behind cab
  const exhCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.98, 1.1, 0.62),
    new THREE.Vector3(-1.12, 1.5, 0.62),
    new THREE.Vector3(-1.12, 3.15, 0.62),
    new THREE.Vector3(-1.12, 3.45, 0.46),
  ]);
  const exhGeo = new THREE.TubeGeometry(exhCurve, 18, 0.068, 10, false);
  const shieldGeo = new THREE.CylinderGeometry(0.105, 0.105, 1.35, 12, 1, true);
  geometries.push(exhGeo, shieldGeo);
  const exhaust = new THREE.Mesh(exhGeo, mats.rustIron);
  exhaust.castShadow = true;
  truck.add(exhaust);
  const shield = new THREE.Mesh(shieldGeo, mats.bareSteel);
  shield.position.set(-1.12, 2.2, 0.62);
  truck.add(shield);

  // Diesel fuel tanks under cab with steel mounting straps
  const tankGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.35, 16);
  tankGeo.rotateX(Math.PI / 2);
  const strapGeo = new THREE.TorusGeometry(0.33, 0.018, 6, 16);
  geometries.push(tankGeo, strapGeo);
  for (const sx of [-0.94, 0.94]) {
    const tank = new THREE.Mesh(tankGeo, mats.bareSteel);
    tank.position.set(sx, 0.72, 1.65);
    tank.castShadow = true;
    truck.add(tank);
    for (const sz of [1.25, 2.05]) {
      const strap = new THREE.Mesh(strapGeo, mats.darkSteel);
      strap.position.set(sx, 0.72, sz);
      truck.add(strap);
    }
  }

  // Roof amber strobe beacon
  const beaconBaseGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.06, 12);
  const beaconDomeGeo = new THREE.CylinderGeometry(0.065, 0.085, 0.14, 12);
  geometries.push(beaconBaseGeo, beaconDomeGeo);
  const beaconBase = new THREE.Mesh(beaconBaseGeo, mats.darkSteel);
  beaconBase.position.set(0, 2.7, 2.05);
  truck.add(beaconBase);
  const beaconDome = new THREE.Mesh(beaconDomeGeo, mats.amberBeacon);
  beaconDome.position.set(0, 2.8, 2.05);
  truck.add(beaconDome);

  // 6 heavy radial lug wheels (front steer + twin rear drive axles)
  const wheelCoords: [number, number, number][] = [
    [-1.08, 0.58, 3.25],
    [1.08, 0.58, 3.25],
    [-1.08, 0.58, -1.65],
    [1.08, 0.58, -1.65],
    [-1.08, 0.58, -3.15],
    [1.08, 0.58, -3.15],
  ];
  for (const [wx, wy, wz] of wheelCoords) {
    const w = buildLugWheel(0.58, 0.36, mats, geometries);
    w.position.set(wx, wy, wz);
    if (wx < 0) w.rotation.y = Math.PI;
    truck.add(w);
  }

  // Articulated ribbed cane-rack rear cargo bed ("gaiola canavieira")
  const bedFloorGeo = new THREE.BoxGeometry(2.38, 0.18, 5.75);
  const stakeGeo = new THREE.BoxGeometry(0.11, 1.95, 0.11);
  const ribRailGeo = new THREE.BoxGeometry(0.07, 0.09, 5.7);
  const headboardGeo = new THREE.BoxGeometry(2.38, 1.95, 0.12);
  geometries.push(bedFloorGeo, stakeGeo, ribRailGeo, headboardGeo);

  const bedFloor = new THREE.Mesh(bedFloorGeo, mats.paintTeal);
  bedFloor.position.set(0, 1.04, -2.35);
  bedFloor.castShadow = true;
  bedFloor.receiveShadow = true;
  truck.add(bedFloor);

  const headboard = new THREE.Mesh(headboardGeo, mats.paintTeal);
  headboard.position.set(0, 2.05, 0.48);
  headboard.castShadow = true;
  truck.add(headboard);

  for (const sx of [-1.14, 1.14]) {
    for (let i = 0; i < 5; i++) {
      const sz = 0.42 - i * 1.38;
      const stake = new THREE.Mesh(stakeGeo, mats.paintTeal);
      stake.position.set(sx, 2.04, sz);
      stake.castShadow = true;
      truck.add(stake);
    }
    for (const ry of [1.55, 2.15, 2.78]) {
      const sideRail = new THREE.Mesh(ribRailGeo, mats.paintSafetyAmber);
      sideRail.position.set(sx, ry, -2.35);
      sideRail.castShadow = true;
      truck.add(sideRail);
    }
  }

  // Bundled cut sugarcane stalks inside the cargo rack
  const canePileGeo = new THREE.CylinderGeometry(0.045, 0.055, 5.1, 7);
  canePileGeo.rotateX(Math.PI / 2);
  geometries.push(canePileGeo);
  const caneCount = 56;
  const caneLoad = new THREE.InstancedMesh(canePileGeo, mats.caneStalk, caneCount);
  caneLoad.castShadow = true;
  caneLoad.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < caneCount; i++) {
    const col = i % 8;
    const row = Math.floor(i / 8);
    const jx = ((i * 37) % 11) * 0.015 - 0.08;
    const jy = ((i * 19) % 7) * 0.02;
    dummy.position.set(-0.88 + col * 0.25 + jx, 1.24 + row * 0.22 + jy, -2.35 + (i % 3 - 1) * 0.14);
    dummy.rotation.set(((i % 5) - 2) * 0.015, ((i % 7) - 3) * 0.018, 0);
    dummy.scale.setScalar(0.92 + (i % 4) * 0.06);
    dummy.updateMatrix();
    caneLoad.setMatrixAt(i, dummy.matrix);
  }
  caneLoad.instanceMatrix.needsUpdate = true;
  truck.add(caneLoad);

  // Truck real spotlights (off at start, ignite cleanly on power/shift climax)
  const headlightLeft = new THREE.SpotLight(0xfff0cc, 0, 28, 0.48, 0.55, 1.5);
  const headlightRight = new THREE.SpotLight(0xfff0cc, 0, 28, 0.48, 0.55, 1.5);
  headlightLeft.position.set(-0.92, 1.12, 4.46);
  headlightRight.position.set(0.92, 1.12, 4.46);
  const hlTargetL = new THREE.Object3D();
  const hlTargetR = new THREE.Object3D();
  hlTargetL.position.set(-1.3, 0.1, 16);
  hlTargetR.position.set(1.3, 0.1, 16);
  truck.add(headlightLeft, hlTargetL, headlightRight, hlTargetR);
  headlightLeft.target = hlTargetL;
  headlightRight.target = hlTargetR;

  const beaconLight = new THREE.PointLight(0xff8c1a, 0, 12, 1.8);
  beaconLight.position.set(0, 3.05, 2.05);
  truck.add(beaconLight);

  group.add(truck);

  // =========================================================
  // 2. SERVICE WELDING CART & DRUMS (Foreground Left Storytelling)
  // =========================================================
  const cart = new THREE.Group();
  const cx = -9.0;
  const cz = 11.1;
  cart.position.set(cx, groundHeightAt(cx, cz), cz);
  cart.rotation.y = 0.58;

  const cartDeckGeo = new THREE.BoxGeometry(1.1, 0.09, 1.55);
  geometries.push(cartDeckGeo);
  const cartDeck = new THREE.Mesh(cartDeckGeo, mats.rustIron);
  cartDeck.position.set(0, 0.34, 0);
  cartDeck.castShadow = true;
  cartDeck.receiveShadow = true;
  cart.add(cartDeck);

  // Welding cart tubular handle frame
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.48, 0.38, -0.7),
    new THREE.Vector3(-0.48, 1.18, -0.72),
    new THREE.Vector3(0.48, 1.18, -0.72),
    new THREE.Vector3(0.48, 0.38, -0.7),
  ]);
  const handleGeo = new THREE.TubeGeometry(handleCurve, 16, 0.025, 8, false);
  geometries.push(handleGeo);
  const handleMesh = new THREE.Mesh(handleGeo, mats.darkSteel);
  handleMesh.castShadow = true;
  cart.add(handleMesh);

  // LatheGeometry gas bottles (acetylene & oxygen)
  const bottlePts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.13, 0),
    new THREE.Vector2(0.13, 0.88),
    new THREE.Vector2(0.08, 1.05),
    new THREE.Vector2(0.035, 1.12),
    new THREE.Vector2(0.035, 1.22),
    new THREE.Vector2(0, 1.22),
  ];
  const bottleGeo = new THREE.LatheGeometry(bottlePts, 16);
  geometries.push(bottleGeo);
  const b1 = new THREE.Mesh(bottleGeo, mats.paintTeal);
  b1.position.set(-0.22, 0.38, -0.25);
  b1.castShadow = true;
  const b2 = new THREE.Mesh(bottleGeo, mats.paintSafetyAmber);
  b2.position.set(0.2, 0.38, -0.25);
  b2.castShadow = true;
  cart.add(b1, b2);

  // Coiled hose on front of cart
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, 1.56, -0.25),
    new THREE.Vector3(-0.35, 0.9, 0.28),
    new THREE.Vector3(0.28, 0.56, 0.45),
    new THREE.Vector3(-0.18, 0.44, 0.56),
    new THREE.Vector3(0.15, 0.44, 0.18),
  ]);
  const hoseGeo = new THREE.TubeGeometry(hoseCurve, 26, 0.018, 6, false);
  geometries.push(hoseGeo);
  cart.add(new THREE.Mesh(hoseGeo, mats.rubberTire));

  // Cart wheels
  for (const [wx, wz] of [
    [-0.6, -0.45],
    [0.6, -0.45],
    [-0.6, 0.48],
    [0.6, 0.48],
  ]) {
    const cw = buildLugWheel(0.24, 0.12, mats, geometries);
    cw.position.set(wx, 0.24, wz);
    if (wx < 0) cw.rotation.y = Math.PI;
    cart.add(cw);
  }
  group.add(cart);

  // =========================================================
  // 3. PALLETIZED 200L STEEL OIL DRUMS (Near Gate Right)
  // =========================================================
  const palletGroup = new THREE.Group();
  const px = 10.3;
  const pz = 19.5;
  palletGroup.position.set(px, groundHeightAt(px, pz), pz);
  palletGroup.rotation.y = -0.25;

  const slatGeo = new THREE.BoxGeometry(1.45, 0.04, 0.16);
  const runnerGeo = new THREE.BoxGeometry(0.1, 0.1, 1.45);
  geometries.push(slatGeo, runnerGeo);
  for (let i = -2; i <= 2; i++) {
    const slat = new THREE.Mesh(slatGeo, mats.woodCrate);
    slat.position.set(0, 0.12, i * 0.28);
    slat.castShadow = true;
    slat.receiveShadow = true;
    palletGroup.add(slat);
  }
  for (const rx of [-0.6, 0, 0.6]) {
    const run = new THREE.Mesh(runnerGeo, mats.woodCrate);
    run.position.set(rx, 0.05, 0);
    run.castShadow = true;
    palletGroup.add(run);
  }

  // Ribbed 200L steel drums via LatheGeometry
  const drumPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.29, 0),
    new THREE.Vector2(0.29, 0.28),
    new THREE.Vector2(0.31, 0.3),
    new THREE.Vector2(0.29, 0.32),
    new THREE.Vector2(0.29, 0.6),
    new THREE.Vector2(0.31, 0.62),
    new THREE.Vector2(0.29, 0.64),
    new THREE.Vector2(0.29, 0.9),
    new THREE.Vector2(0.26, 0.92),
    new THREE.Vector2(0, 0.92),
  ];
  const drumGeo = new THREE.LatheGeometry(drumPts, 20);
  geometries.push(drumGeo);
  const drumCoords: [number, number, THREE.Material][] = [
    [-0.32, -0.32, mats.paintTeal],
    [0.34, -0.28, mats.rustIron],
    [-0.28, 0.34, mats.paintSafetyAmber],
  ];
  for (const [dx, dz, mat] of drumCoords) {
    const drum = new THREE.Mesh(drumGeo, mat);
    drum.position.set(dx, 0.14, dz);
    drum.castShadow = true;
    drum.receiveShadow = true;
    palletGroup.add(drum);
  }
  group.add(palletGroup);

  scene.add(group);

  return {
    group,
    headlightLeft,
    headlightRight,
    beaconLight,
    update: (time: number, climax: number) => {
      const hlOn = climax > 0.35 ? Math.min(1, (climax - 0.35) * 3.5) : 0;
      headlightLeft.intensity = hlOn * 18;
      headlightRight.intensity = hlOn * 18;
      mats.headlightLamp.emissiveIntensity = 0.08 + hlOn * 2.8;

      // Amber beacon pulses rhythmically once energized
      const pulse = hlOn > 0.05 ? 0.5 + 0.5 * Math.sin(time * 9.5) : 0;
      beaconLight.intensity = hlOn * (1.2 + pulse * 4.5);
      mats.amberBeacon.emissiveIntensity = 0.15 + hlOn * (1.4 + pulse * 4.0);
    },
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of customMats) m.dispose();
    },
  };
}
