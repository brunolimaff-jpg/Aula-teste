// === engine/renderer.js ===

// Passe final combinado: AO em tela (hemisfério com normal reconstruída) + raios de sol em tela + reflexo de lente
// + exposição + AgX + gradação (sombras frias, altas quentes) + vinheta + grão + saída sRGB
const SaltlineCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uEnableAO: { value: 1.0 },
    uEnableVol: { value: 1.0 },
    uCameraNear: { value: 0.15 },
    uCameraFar: { value: 1600.0 },
    uInvProj: { value: new THREE.Matrix4() },
    uProj: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uGrain: { value: 0.022 },
    uVignette: { value: 0.30 },
    uExposure: { value: 1.0 },
    uAspect: { value: 16 / 9 },
    uSunScreen: { value: new THREE.Vector2(0.5, 0.5) },
    uSunVis: { value: 0.0 },
    uSunCol: { value: new THREE.Color(0xffcfa0) },
    uAOStrength: { value: 0.72 },
    uAORadius: { value: 1.1 },
    uAOTaps: { value: 10 },
    uRayStrength: { value: 0.55 },
    uRayTaps: { value: 16 },
    uFlare: { value: 1.0 },
    uShadowTint: { value: new THREE.Vector3(0.93, 0.99, 1.07) },
    uHighTint: { value: new THREE.Vector3(1.05, 1.0, 0.93) },
    uSaturation: { value: 1.04 },
    uContrast: { value: 0.1 },
    uLookPower: { value: 1.12 },
    uLookSat: { value: 1.18 },
    uDebug: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float uEnableAO;
    uniform float uEnableVol;
    uniform float uCameraNear;
    uniform float uCameraFar;
    uniform vec2 uProj;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uExposure;
    uniform float uAspect;
    uniform vec2 uSunScreen;
    uniform float uSunVis;
    uniform vec3 uSunCol;
    uniform float uAOStrength;
    uniform float uAORadius;
    uniform int uAOTaps;
    uniform float uRayStrength;
    uniform int uRayTaps;
    uniform float uFlare;
    uniform vec3 uShadowTint;
    uniform vec3 uHighTint;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uLookPower;
    uniform float uLookSat;
    uniform int uDebug;

    const mat3 LZ_REC2020_TO_SRGB = mat3(
      vec3(1.6605, -0.1246, -0.0182),
      vec3(-0.5876, 1.1329, -0.1006),
      vec3(-0.0728, -0.0083, 1.1187)
    );
    const mat3 LZ_SRGB_TO_REC2020 = mat3(
      vec3(0.6274, 0.0691, 0.0164),
      vec3(0.3293, 0.9195, 0.0880),
      vec3(0.0433, 0.0113, 0.8956)
    );

    vec3 lzAgxContrast(vec3 x) {
      vec3 x2 = x * x;
      vec3 x4 = x2 * x2;
      return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
    }

    // AgX (mesma base do three) devolvendo sRGB linear
    vec3 lzAgx(vec3 color) {
      const mat3 inset = mat3(
        vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
        vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
        vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859)
      );
      const mat3 outset = mat3(
        vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
        vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
        vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
      );
      const float minEv = -12.47393, maxEv = 4.026069;
      color = inset * (LZ_SRGB_TO_REC2020 * color);
      color = clamp((log2(max(color, 1e-10)) - minEv) / (maxEv - minEv), 0.0, 1.0);
      color = lzAgxContrast(color);
      // Look (estilo Punchy suave): potência e saturação no domínio AgX
      color = pow(max(color, vec3(0.0)), vec3(uLookPower));
      float lk = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = lk + (color - lk) * uLookSat;
      color = outset * color;
      color = pow(max(color, vec3(0.0)), vec3(2.2));
      return clamp(LZ_REC2020_TO_SRGB * color, 0.0, 1.0);
    }

    vec3 lzToSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-6)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    float lzViewZ(float d) {
      float z = d * 2.0 - 1.0;
      return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
    }

    vec3 lzViewPos(vec2 uv, float vz) {
      return vec3((uv * 2.0 - 1.0) * vz / uProj, -vz);
    }

    float lzIgn(vec2 p) {
      return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
    }

    float lzHash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Oclusão de ambiente: amostras num disco em espaço de tela, peso pelo cosseno com a normal reconstruída
    float lzSSAO(vec2 uv, float vz, vec3 P, vec3 N) {
      if (vz > 85.0) return 1.0;
      float ang = lzIgn(gl_FragCoord.xy) * 6.2831853;
      float rad = min(uAORadius * uProj.y * 0.5 / vz, 0.09);
      float R2 = uAORadius * uAORadius;
      float occ = 0.0;
      float n = 0.0;
      for (int i = 0; i < 16; i++) {
        if (i >= uAOTaps) break;
        float fi = (float(i) + 0.5) / float(uAOTaps);
        float r = (0.15 + 0.85 * fi * fi) * rad;
        float a = float(i) * 2.3999632 + ang;
        vec2 suv = uv + vec2(cos(a), sin(a)) * r * vec2(1.0 / uAspect, 1.0);
        float sz = lzViewZ(texture2D(tDepth, suv).x);
        vec3 v = lzViewPos(suv, sz) - P;
        float vv = dot(v, v);
        float fall = clamp(1.0 - vv / (R2 * 2.2), 0.0, 1.0);
        // amostras quase coplanares viram listras quando a profundidade é quantizada (chão em ângulo raso): ignora
        float near0 = 0.012 * vz;
        fall *= smoothstep(near0 * near0, 4.0 * near0 * near0, vv);
        occ += max(0.0, dot(v, N) * inversesqrt(vv + 1e-4) - 0.2) * fall;
        n += 1.0;
      }
      float ao = 1.0 - uAOStrength * min(1.0, occ / max(n, 1.0) * 3.4);
      return mix(clamp(ao, 0.0, 1.0), 1.0, smoothstep(55.0, 85.0, vz));
    }

    // Visibilidade do disco solar (5 amostras de profundidade ao redor do sol)
    float lzSunOcclusion() {
      vec2 s = clamp(uSunScreen, vec2(0.002), vec2(0.998));
      vec2 o = vec2(0.006 / uAspect, 0.006);
      float v = step(0.99999, texture2D(tDepth, s).x);
      v += step(0.99999, texture2D(tDepth, s + vec2(o.x, 0.0)).x);
      v += step(0.99999, texture2D(tDepth, s - vec2(o.x, 0.0)).x);
      v += step(0.99999, texture2D(tDepth, s + vec2(0.0, o.y)).x);
      v += step(0.99999, texture2D(tDepth, s - vec2(0.0, o.y)).x);
      return v / 5.0;
    }

    // Raios de luz: marcha radial em direção ao sol acumulando o brilho do céu não obstruído
    vec3 lzGodRays(vec2 uv) {
      vec2 toSun = uSunScreen - uv;
      float dist = length(toSun * vec2(uAspect, 1.0));
      float taps = float(uRayTaps);
      vec2 stepv = toSun * (0.92 / taps);
      vec2 c = uv + stepv * lzIgn(gl_FragCoord.xy + 17.0);
      float acc = 0.0, w = 1.0, wsum = 0.0;
      for (int i = 0; i < 24; i++) {
        if (i >= uRayTaps) break;
        vec2 cc = clamp(c, vec2(0.001), vec2(0.999));
        float sky = step(0.99999, texture2D(tDepth, cc).x);
        vec3 col = texture2D(tDiffuse, cc).rgb;
        acc += sky * min(dot(col, vec3(0.3, 0.55, 0.15)), 3.0) * w;
        wsum += w;
        w *= 0.94;
        c += stepv;
      }
      acc /= max(wsum, 1e-3);
      return uSunCol * acc * exp(-dist * 1.7) * uRayStrength;
    }

    vec3 lzFlare(vec2 uv, float occl) {
      vec2 asp = vec2(uAspect, 1.0);
      vec2 p = (uv - 0.5) * asp;
      vec2 s = (uSunScreen - 0.5) * asp;
      float r = length(p - s);
      vec3 c = uSunCol * (0.0025 / (r * r * 14.0 + 0.012));
      // Fantasmas no eixo sol-centro
      float g1 = length(p + s * 0.55);
      float g2 = length(p + s * 1.25);
      float g3 = length(p - s * 0.35);
      c += uSunCol * vec3(0.55, 0.85, 1.0) * smoothstep(0.075, 0.035, g1) * 0.035;
      c += uSunCol * vec3(1.0, 0.75, 0.45) * smoothstep(0.16, 0.06, g2) * 0.022;
      c += uSunCol * vec3(0.7, 1.0, 0.8) * smoothstep(0.035, 0.012, g3) * 0.03;
      // Faixa horizontal leve
      c += uSunCol * exp(-abs(p.y - s.y) * 90.0) * exp(-abs(p.x - s.x) * 2.2) * 0.05;
      return c * occl;
    }

    void main() {
      vec3 hdr = texture2D(tDiffuse, vUv).rgb;
      float d = texture2D(tDepth, vUv).x;
      float vz = lzViewZ(d);
      vec3 P = lzViewPos(vUv, vz);
      vec3 N = normalize(cross(dFdx(P), dFdy(P)));

      if (uDebug == 1) { gl_FragColor = vec4(vec3(d < 0.99999 ? lzSSAO(vUv, vz, P, N) : 1.0), 1.0); return; }
      if (uDebug == 2) { gl_FragColor = vec4(vec3(fract(vz / 10.0)), 1.0); return; }
      if (uDebug == 3) { gl_FragColor = vec4(N * 0.5 + 0.5, 1.0); return; }

      if (uEnableAO > 0.5 && d < 0.99999) {
        hdr *= lzSSAO(vUv, vz, P, N);
      }

      if (uSunVis > 0.001) {
        float occl = lzSunOcclusion() * uSunVis;
        if (uEnableVol > 0.5) hdr += lzGodRays(vUv) * uSunVis;
        hdr += lzFlare(vUv, occl) * uFlare;
      }

      vec3 c = lzAgx(hdr * uExposure);
      c = lzToSRGB(c);

      // Gradação em espaço de exibição
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
      c *= mix(uShadowTint, uHighTint, smoothstep(0.06, 0.72, l));
      l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSaturation);

      vec2 q = vUv - 0.5;
      float r2 = dot(q * vec2(uAspect / 1.6, 1.0), q * vec2(uAspect / 1.6, 1.0)) * 2.0;
      c *= 1.0 - uVignette * smoothstep(0.18, 1.1, r2);

      float g = lzHash(gl_FragCoord.xy + fract(uTime * 7.31) * 157.0) - 0.5;
      c += g * uGrain * (0.35 + 0.65 * (1.0 - abs(l * 2.0 - 1.0)));
      c += (lzHash(gl_FragCoord.xy * 1.37 + 3.1) - 0.5) / 255.0;

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `
};

function detectAutoQuality(gl) {
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const lowGpu = /swiftshader|llvmpipe|software|mali-4|adreno 3|intel hd 4/i.test(name);
    const highGpu = /rtx|radeon rx|apple m[1-9]|geforce|arc a/i.test(name);
    const cores = navigator.hardwareConcurrency || 4;
    // Celular e tablet: nunca 'alta'; GPUs móveis recentes ficam em 'media', o resto em 'baixa'
    const mobile = (window.matchMedia && matchMedia('(pointer:coarse)').matches) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile) {
      const goodMobile = /apple gpu|apple a1[5-9]|apple m[1-9]|adreno \(tm\) ?[6-9][4-9]\d|adreno [6-9][4-9]\d|mali-g7[1-9]|mali-g[6-9]\d\d|immortalis|xclipse/i.test(name);
      return { tier: goodMobile ? 'media' : 'baixa', det: (name || 'GPU móvel') + ' · celular' };
    }
    // Renderizador por software (SwiftShader/llvmpipe): vai direto para Baixa para manter fluidez em testes e máquinas sem GPU
    if (lowGpu) return { tier: 'baixa', det: (name || 'Software') + ' (software)' };
    // GPU integrada (Radeon da linha U, Intel Iris/UHD) começa no Médio, com ajustes próprios; dedicada não entra
    const integrada = /radeon\(tm\) graphics|radeon graphics|vega|intel|iris|uhd|hd graphics|microsoft basic/i.test(name) && !/rtx|gtx|rx |arc/i.test(name);
    if (integrada) return { tier: 'media', det: (name || 'Integrada') + ' (integrada)', integrada: true };
    if (highGpu && cores >= 6) return { tier: 'alta', det: name };
    if (cores >= 4) return { tier: 'media', det: name || 'GPU Padrão' };
    return { tier: 'baixa', det: name || 'GPU Básica' };
  } catch {
    return { tier: 'media', det: 'Padrão' };
  }
}

class EngineRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.info.autoReset = false;
    LUZ_SHARED.renderer = this.renderer;
    LUZ_SHARED.engine = this;
    window.__LUZ_SHARED__ = LUZ_SHARED; // só leitura, para diagnóstico automatizado

    const gl = this.renderer.getContext();
    this.autoInfo = detectAutoQuality(gl);
    this.integrada = !!this.autoInfo.integrada;
    this.backendLabel = navigator.gpu ? 'WebGL2 (WebGPU disponível)' : 'WebGL2 (fallback ativo)';

    this.composer = null;
    this.bloomPass = null;
    this.gradePass = null;
    this.depthRT = null;
    this.quality = 'alta';
    this.resScale = 1.0;
    this.frameTimes = [];
    this.dynScale = 1.0;
    this._dynTimer = 0;
    this.worstMs = 0;
    this.lastCalls = 0;
    this.lastTris = 0;
    this._sunVec = new THREE.Vector3();
    this._camFwd = new THREE.Vector3();
    this._exposure = null;
    this._govUltimo = null; // governador de qualidade (ver _governar)
    this._govJanela = 0;
    this._govQuadros = 0;
    this._govBaixo = 0;
    this._govSuspensoAte = 0;
  }

  initPost(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    LUZ_SHARED.camera = camera;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;

    // Alvo HDR com textura de profundidade (AO, raios e oclusão do sol); o compositor clona para o segundo alvo
    const depthTex = new THREE.DepthTexture(w, h);
    depthTex.type = THREE.FloatType; // 32 bits: com 24 bits o chão em ângulo raso virava listras na oclusão de ambiente
    this.depthRT = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthTexture: depthTex,
      depthBuffer: true
    });

    this.composer = new EffectComposer(this.renderer, this.depthRT);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Bloom só no que passa do limiar em HDR (sol, lâmpadas, metal sob o sol); limiar segue a exposição
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.26, 0.38, 1.4);
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(SaltlineCompositeShader);
    this.gradePass.material.toneMapped = false;
    this.gradePass.uniforms.tDepth.value = depthTex;
    this.composer.addPass(this.gradePass);
    this.resize(w, h);
  }

  _setSamples(n) {
    if (!this.composer) return;
    for (const rt of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (rt && rt.samples !== n) {
        rt.samples = n;
        rt.dispose();
      }
    }
  }

  applyQuality(tier) {
    this.quality = tier;
    const dpr = window.devicePixelRatio || 1;
    const G = this.gradePass ? this.gradePass.uniforms : null;
    if (tier === 'alta') {
      this.resScale = 1.0;
      this.renderer.setPixelRatio(Math.min(dpr, 2));
      this.renderer.toneMapping = THREE.NoToneMapping;
      if (this.bloomPass) this.bloomPass.enabled = true;
      if (G) {
        this.gradePass.enabled = true;
        G.uEnableAO.value = 1.0;
        G.uEnableVol.value = 1.0;
        G.uAOTaps.value = 10;
        G.uRayTaps.value = 16;
        G.uGrain.value = 0.022;
      }
      this._setSamples(4);
    } else if (tier === 'media') {
      const ig = this.integrada; // GPU integrada: pixel ratio 1.0 e menos amostras de AO e raios
      this.resScale = 1.0; // 0.85 desalinhava a grade de pixels da profundidade e riscava o chão
      this.renderer.setPixelRatio(Math.min(dpr, ig ? 1.0 : 1.1));
      this.renderer.toneMapping = THREE.NoToneMapping;
      if (this.bloomPass) this.bloomPass.enabled = true;
      if (G) {
        this.gradePass.enabled = true;
        G.uEnableAO.value = 1.0;
        G.uEnableVol.value = 1.0;
        G.uAOTaps.value = ig ? 4 : 6;
        G.uRayTaps.value = ig ? 6 : 10;
        G.uGrain.value = 0.016;
      }
      this._setSamples(0);
    } else {
      this.resScale = 0.7;
      this.renderer.setPixelRatio(Math.min(dpr, 1));
      this.renderer.toneMapping = THREE.AgXToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      if (this.bloomPass) this.bloomPass.enabled = false;
      if (G) {
        this.gradePass.enabled = false;
        G.uEnableAO.value = 0.0;
        G.uEnableVol.value = 0.0;
      }
      this._setSamples(0);
    }
    this.dynScale = 1.0;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.resize(w, h);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.composer) {
      // O compositor guarda a própria densidade de pixels: segue a do renderer × escala do perfil
      this.composer.setPixelRatio(this.renderer.getPixelRatio() * this.resScale * this.dynScale);
      this.composer.setSize(w, h);
    }
    if (this.gradePass) {
      this.gradePass.uniforms.uAspect.value = w / Math.max(1, h);
    }
  }

  render(timeSec, sunDir, sunCol) {
    const t0 = performance.now();
    this.renderer.info.reset();

    const sky = LUZ_SHARED.sky;
    const targetExp = sky && isFinite(sky.exposure) ? sky.exposure : 1.0;
    if (this._exposure == null) this._exposure = targetExp;
    this._exposure += (targetExp - this._exposure) * 0.12;
    const exposure = this._exposure;

    if (this.gradePass && this.gradePass.enabled && sunDir) {
      const G = this.gradePass.uniforms;
      G.uTime.value = timeSec;
      G.uExposure.value = exposure;
      G.uCameraNear.value = this.camera.near;
      G.uCameraFar.value = this.camera.far;
      G.uProj.value.set(this.camera.projectionMatrix.elements[0], this.camera.projectionMatrix.elements[5]);
      if (sunCol) G.uSunCol.value.copy(sunCol);
      // Raios mais fortes com o sol baixo (mais ar e poeira no caminho)
      const lowSun = 1 - THREE.MathUtils.smoothstep(sunDir.y, 0.1, 0.7);
      G.uRayStrength.value = 0.08 + 0.16 * lowSun;
      G.uFlare.value = 0.35 + 0.35 * lowSun;
      this._sunVec.copy(this.camera.position).addScaledVector(sunDir, 1000);
      this.camera.getWorldDirection(this._camFwd);
      const facing = this._camFwd.dot(sunDir);
      this._sunVec.project(this.camera);
      const sx = this._sunVec.x * 0.5 + 0.5, sy = this._sunVec.y * 0.5 + 0.5;
      G.uSunScreen.value.set(sx, sy);
      const edge = Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5));
      const onScreen = 1 - THREE.MathUtils.smoothstep(edge, 0.55, 0.95);
      G.uSunVis.value = facing > 0.0 ? THREE.MathUtils.smoothstep(facing, 0.0, 0.5) * onScreen : 0.0;
      // A cada quadro o RenderPass escreve no readBuffer (alterna entre os dois alvos): a profundidade vem dele
      G.tDepth.value = this.composer.readBuffer.depthTexture;
    }
    if (this.bloomPass && this.bloomPass.enabled) {
      this.bloomPass.threshold = 1.35 / exposure;
      this.bloomPass.highPassUniforms.smoothWidth.value = 0.9 / exposure;
    }

    if (this.quality === 'baixa' || !this.composer) {
      this.renderer.toneMappingExposure = exposure * 1.05;
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }
    this.lastCalls = this.renderer.info.render.calls;
    this.lastTris = this.renderer.info.render.triangles;

    const dtMs = performance.now() - t0;
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    if (dtMs > this.worstMs && this.frameTimes.length > 5) this.worstMs = dtMs;

    this._governar(t0);
  }

  // Governador de qualidade (alta e média), com fps real pelo intervalo entre quadros em janelas de 3 s.
  // fps < 40: reduz dynScale até 0.65. fps < 34 com o mínimo já atingido, acumulado por 4 s (duas janelas): desce um preset.
  // Nunca sobe preset sozinho. Não decide com aba oculta, pausa longa, fps < 5 (sem GPU) nem com escolha manual.
  _governar(agora) {
    if (this._govUltimo == null) { this._govUltimo = agora; this._govJanela = agora; this._govSuspensoAte = agora + 4000; return; }
    const intervalo = agora - this._govUltimo;
    this._govUltimo = agora;
    if (document.hidden || intervalo > 1000 || agora < this._govSuspensoAte) { this._govJanela = agora; this._govQuadros = 0; return; }
    this._govQuadros++;
    const decorrido = agora - this._govJanela;
    if (decorrido < 3000) return;
    const fps = this._govQuadros * 1000 / decorrido;
    this._govJanela = agora; this._govQuadros = 0;
    if (fps < 5 || this.quality === 'baixa' || !this.composer) { this._govBaixo = 0; return; }
    if (fps >= 34) this._govBaixo = 0;
    if (fps > 50 && this.dynScale < 1) { this._setDyn(Math.min(1.0, this.dynScale + 0.05)); return; }
    if (fps < 40 && this.dynScale > 0.651) { this._setDyn(Math.max(0.65, this.dynScale - 0.08)); return; }
    if (fps < 34) {
      this._govBaixo += decorrido;
      if (this._govBaixo >= 4000) {
        this._govBaixo = 0;
        if (this._govManual()) return;
        this._trocarPredefinido(this.quality === 'alta' ? 'media' : 'baixa', fps, agora);
      }
    }
  }

  _setDyn(v) {
    this.dynScale = v;
    if (this.composer) this.composer.setPixelRatio(this.renderer.getPixelRatio() * this.resScale * this.dynScale);
    // com a resolução reduzida a oclusão de ambiente risca o chão: desliga até voltar a 100%
    if (this.gradePass) this.gradePass.uniforms.uEnableAO.value = (this.quality !== 'baixa' && this.dynScale > 0.99) ? 1.0 : 0.0;
  }

  _govManual() {
    const st = window.__SAFRA_DEBUG__ && window.__SAFRA_DEBUG__.state;
    return !!(st && st.cfg && st.cfg.qualAuto === false);
  }

  _trocarPredefinido(prox, fps, agora) {
    // usa o mesmo caminho do seletor (engine, sombras, refletor e HUD); preserva o modo automático
    const D = window.__SAFRA_DEBUG__;
    if (D && D.state && D.setQuality) {
      const auto = D.state.cfg.qualAuto;
      D.setQuality(prox);
      D.state.cfg.qualAuto = auto;
    } else {
      this.applyQuality(prox);
    }
    this._govSuspensoAte = agora + 4000;
    console.log(`[safra] qualidade -> ${prox} (fps ${Math.round(fps)})`);
  }

  resetWorst() {
    this.worstMs = 0;
    this.frameTimes.length = 0;
  }

  getMetrics() {
    const avgMs = this.frameTimes.length
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0;
    const memMB = performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / (1024 * 1024))
      : null;
    return {
      quality: this.quality,
      backend: this.backendLabel,
      avgMs: Number(avgMs.toFixed(2)),
      worstMs: Number(this.worstMs.toFixed(2)),
      fps: avgMs > 0 ? Math.round(1000 / Math.max(avgMs, 1)) : 60,
      calls: this.lastCalls,
      triangles: this.lastTris,
      memMB
    };
  }
}
