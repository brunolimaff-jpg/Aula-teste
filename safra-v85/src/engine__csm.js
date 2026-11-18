// === engine/csm.js ===

// Sombra some suavemente na borda do mapa (sem linha dura onde a cobertura termina)
(function luzPatchShadowFade() {
  const key = 'shadowmap_pars_fragment';
  const src = THREE.ShaderChunk[key];
  const anchor = 'return mix( 1.0, shadow, shadowIntensity );';
  const i = src ? src.indexOf('float getShadow( sampler2D shadowMap') : -1;
  const j = i >= 0 ? src.indexOf(anchor, i) : -1;
  if (j < 0) return;
  const fade = `vec2 luzSE = smoothstep( vec2( 0.0 ), vec2( 0.08 ), shadowCoord.xy ) * smoothstep( vec2( 0.0 ), vec2( 0.08 ), vec2( 1.0 ) - shadowCoord.xy );
		shadow = mix( 1.0, shadow, clamp( luzSE.x * luzSE.y, 0.0, 1.0 ) );
		`;
  THREE.ShaderChunk[key] = src.slice(0, j) + fade + src.slice(j);
})();

// Sombra direcional estabilizada: caixa deslocada para frente da câmera e alinhada à grade de texels no espaço da luz
class ShadowRig {
  constructor(scene) {
    this.scene = scene;
    this.sun = new THREE.DirectionalLight(0xffe7c2, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.00012;
    this.sun.shadow.normalBias = 0.04;
    this.frustumHalf = 40;
    this.forwardShift = 0.5;
    this.lightDist = 110;
    Object.assign(this.sun.shadow.camera, {
      left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 185
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Preenchimento do céu (o reflexo de ambiente do céu faz a maior parte; este tinge as faces de baixo)
    this.hemi = new THREE.HemisphereLight(0x9bc4e2, 0x5c2c18, 0.35);
    scene.add(this.hemi);

    // Rebote da terra vermelha iluminada: vem do chão do lado do sol e abre as faces em sombra
    this.bounce = new THREE.DirectionalLight(0xb8643a, 0.3);
    this.bounce.position.set(20, -15, -30);
    scene.add(this.bounce);
    scene.add(this.bounce.target);

    LUZ_SHARED.sun = this.sun;
    LUZ_SHARED.hemi = this.hemi;

    this._center = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._ax = new THREE.Vector3();
    this._ay = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  applyQuality(q) {
    const cfg = q === 'alta'
      ? { size: 2048, half: 40, bias: -0.00045, nb: 0.09 }
      : q === 'media'
        ? { size: 1024, half: 30, bias: -0.0012, nb: 0.22 }
        : { size: 1024, half: 24, bias: -0.0012, nb: 0.22 };

    this.frustumHalf = cfg.half;
    const cam = this.sun.shadow.camera;
    cam.left = -cfg.half;
    cam.right = cfg.half;
    cam.top = cfg.half;
    cam.bottom = -cfg.half;
    cam.near = 1;
    cam.far = this.lightDist + 75;
    cam.updateProjectionMatrix();

    if (this.sun.shadow.mapSize.x !== cfg.size) {
      this.sun.shadow.mapSize.set(cfg.size, cfg.size);
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }
    this.sun.shadow.bias = cfg.bias;
    this.sun.shadow.normalBias = cfg.nb;
  }

  update(playerPos, sunDir) {
    const half = this.frustumHalf;
    const c = this._center.set(playerPos.x, 0, playerPos.z);

    // Desloca a caixa para frente do olhar: a resolução vai para onde a câmera vê
    const camObj = LUZ_SHARED.camera;
    if (camObj) {
      camObj.getWorldDirection(this._fwd);
      this._fwd.y = 0;
      if (this._fwd.lengthSq() > 1e-6) {
        this._fwd.normalize();
        c.addScaledVector(this._fwd, half * this.forwardShift);
      }
    }
    if (typeof getTerrainHeight === 'function') c.y = getTerrainHeight(c.x, c.z);

    // Base da câmera de sombra (mesma convenção do lookAt do three, up = +Y)
    const z = sunDir;
    this._ax.crossVectors(this._up, z);
    if (this._ax.lengthSq() < 1e-6) this._ax.set(1, 0, 0);
    this._ax.normalize();
    this._ay.crossVectors(z, this._ax).normalize();

    // Alinha o centro à grade de texels no plano da luz: bordas de sombra não tremem ao andar
    const texel = (half * 2) / this.sun.shadow.mapSize.x;
    const px = c.dot(this._ax), py = c.dot(this._ay);
    const sx = Math.round(px / texel) * texel, sy = Math.round(py / texel) * texel;
    c.addScaledVector(this._ax, sx - px).addScaledVector(this._ay, sy - py);

    this.sun.target.position.copy(c);
    this.sun.position.copy(c).addScaledVector(sunDir, this.lightDist);
    this.sun.target.updateMatrixWorld();
    this.sun.updateMatrixWorld();

    // Rebote: do chão iluminado para cima, oposto ao sol no plano
    const sky = LUZ_SHARED.sky;
    const g = sky && sky.uniforms ? sky.uniforms.uGroundColor.value : null;
    this.bounce.target.position.copy(c);
    this.bounce.position.set(c.x - sunDir.x * 30, c.y - 18, c.z - sunDir.z * 30);
    this.bounce.target.updateMatrixWorld();
    if (g) {
      this.bounce.color.setRGB(g.r, g.g, g.b);
      const lum = Math.max(1e-4, 0.2126 * g.r + 0.7152 * g.g + 0.0722 * g.b);
      this.bounce.color.multiplyScalar(1 / Math.max(g.r, g.g, g.b, 1e-4));
      this.bounce.intensity = Math.min(1.2, lum * 2.4);
    }
  }
}
