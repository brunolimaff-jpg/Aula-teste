// === engine/planar.js ===

// Reflexo Planar real em y = 0 para poças espelhadas no chão e pátios (estilo Saltline)
// Corte oblíquo no plano (nada abaixo do chão aparece), sem refazer o mapa de sombra e com alcance limitado.
class PlanarReflector {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    this.scale = 0.5;
    this.maxDistance = 260;
    this.clipBias = 0.02;

    this.rt = new THREE.WebGLRenderTarget(512, 288, {
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      generateMipmaps: true
    });

    this.reflectCam = new THREE.PerspectiveCamera();
    this.textureMatrix = new THREE.Matrix4();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hidden = [];
    this._look = new THREE.Vector3();
    this._clip = new THREE.Vector4();
    this._q = new THREE.Vector4();
    this._pl = new THREE.Plane();
    this._n = new THREE.Vector3();
    this._p0 = new THREE.Vector3();
  }

  resize(w, h, scale) {
    this.scale = scale;
    this.enabled = scale > 0;
    if (!this.enabled) return;
    const rw = Math.max(128, Math.floor(w * scale));
    const rh = Math.max(72, Math.floor(h * scale));
    if (this.rt.width !== rw || this.rt.height !== rh) {
      this.rt.setSize(rw, rh);
    }
  }

  setHiddenObjects(objs) {
    this._hidden = objs.filter(Boolean);
  }

  update() {
    if (!this.enabled) return;

    const cam = this.camera;
    const rCam = this.reflectCam;
    rCam.fov = cam.fov;
    rCam.aspect = cam.aspect;
    rCam.near = cam.near;
    rCam.far = Math.min(cam.far, this.maxDistance);
    rCam.updateProjectionMatrix();

    // Espelha posição e direção da câmera em relação ao plano y = 0
    rCam.position.set(cam.position.x, -cam.position.y, cam.position.z);
    const lookTarget = this._look.set(0, 0, -1).applyQuaternion(cam.quaternion).add(cam.position);
    lookTarget.y = -lookTarget.y;
    rCam.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    rCam.up.y = -rCam.up.y;
    rCam.lookAt(lookTarget);
    rCam.updateMatrixWorld();
    rCam.matrixWorldInverse.copy(rCam.matrixWorld).invert();

    // Matriz de projeção para amostragem em screen-space / world-space no shader do chão
    this.textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this.textureMatrix.multiply(rCam.projectionMatrix);
    this.textureMatrix.multiply(rCam.matrixWorldInverse);

    // Plano de corte oblíquo (Lengyel): o near plane passa a ser o próprio chão
    this._pl.setFromNormalAndCoplanarPoint(this._n.set(0, 1, 0), this._p0.set(0, 0, 0));
    this._pl.applyMatrix4(rCam.matrixWorldInverse);
    const clip = this._clip.set(this._pl.normal.x, this._pl.normal.y, this._pl.normal.z, this._pl.constant);
    const pm = rCam.projectionMatrix;
    const q = this._q;
    q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    clip.multiplyScalar(2.0 / clip.dot(q));
    pm.elements[2] = clip.x;
    pm.elements[6] = clip.y;
    pm.elements[10] = clip.z + 1.0 - this.clipBias;
    pm.elements[14] = clip.w;
    rCam.projectionMatrixInverse.copy(pm).invert();

    // Oculta o próprio chão/água durante o passe de reflexão
    const prevVis = this._hidden.map(o => o.visible);
    this._hidden.forEach(o => { o.visible = false; });

    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevTone = r.toneMapping;
    const prevShadowAuto = r.shadowMap.autoUpdate;
    // A névoa de altura usa a altura da câmera: no espelho ela ficaria abaixo do chão
    const fogOn = typeof LUZ_FOG !== 'undefined' ? LUZ_FOG.d[2] : 0;
    if (typeof LUZ_FOG !== 'undefined') LUZ_FOG.d[2] = 0;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.autoUpdate = false; // reaproveita o mapa de sombra do quadro anterior
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(this.scene, rCam);
    r.setRenderTarget(prevTarget);
    r.toneMapping = prevTone;
    r.shadowMap.autoUpdate = prevShadowAuto;
    if (typeof LUZ_FOG !== 'undefined') LUZ_FOG.d[2] = fogOn;

    this._hidden.forEach((o, i) => { o.visible = prevVis[i]; });
  }
}
