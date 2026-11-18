import * as THREE from 'three/webgpu';
import {
  builtinAOContext,
  emissive,
  mrt,
  normalView,
  output,
  pass,
  screenUV,
  vec4,
} from 'three/tsl';
import { ao } from 'three/examples/jsm/tsl/display/GTAONode.js';
import { ssgi } from 'three/examples/jsm/tsl/display/SSGINode.js';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { fxaa } from 'three/examples/jsm/tsl/display/FXAANode.js';
import { godrays } from 'three/examples/jsm/tsl/display/GodraysNode.js';
import type { QualityBudget } from './quality';

export class PostPipelineManager {
  private readonly renderer: THREE.WebGPURenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sunLight: THREE.DirectionalLight;
  private pipeline: THREE.RenderPipeline | null = null;
  private activeModeKey = '';
  private fallbackDirect = false;

  constructor(
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    sunLight: THREE.DirectionalLight,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sunLight = sunLight;
  }

  public configure(budget: QualityBudget): void {
    const key = [
      budget.quality,
      budget.enableAO ? 'ao' : '',
      budget.enableSSGI ? 'ssgi' : '',
      budget.enableGodrays ? 'god' : '',
      budget.enableBloom ? 'blm' : '',
      budget.enableFXAA ? 'fx' : '',
    ].join('|');

    if (key === this.activeModeKey) return;
    this.activeModeKey = key;
    this.fallbackDirect = false;

    if (this.pipeline) {
      this.pipeline.dispose();
      this.pipeline = null;
    }

    if (!budget.enableAO && !budget.enableBloom && !budget.enableSSGI && !budget.enableFXAA) {
      return;
    }

    try {
      const rp = new THREE.RenderPipeline(this.renderer);
      const scenePass = pass(this.scene, this.camera);

      if (budget.enableAO || budget.enableSSGI) {
        scenePass.setMRT(
          mrt({
            output,
            normal: normalView,
            emissive,
          }),
        );
      }

      const sceneColor = scenePass.getTextureNode('output');
      const sceneDepth = scenePass.getTextureNode('depth');

      if (budget.enableAO && !budget.enableSSGI) {
        const sceneNormal = scenePass.getTextureNode('normal');
        const aoPass = ao(sceneDepth, sceneNormal, this.camera);
        aoPass.resolutionScale = 0.5;
        aoPass.radius.value = 0.45;
        scenePass.contextNode = builtinAOContext(aoPass.getTextureNode().sample(screenUV).r);
      }

      let composed: any = sceneColor;

      if (budget.enableSSGI) {
        const sceneNormal = scenePass.getTextureNode('normal');
        const giPass = ssgi(sceneColor, sceneDepth, sceneNormal, this.camera);
        giPass.resolutionScale = 0.5;
        giPass.sliceCount.value = 1;
        giPass.stepCount.value = 10;
        composed = vec4(
          composed.rgb.mul(giPass.getAONode()).add(giPass.getGINode().mul(0.32)),
          composed.a,
        );
      }

      if (budget.enableGodrays && this.sunLight.castShadow) {
        const raysPass = godrays(sceneDepth, this.camera, this.sunLight);
        raysPass.resolutionScale = 0.5;
        raysPass.density.value = 0.35;
        raysPass.maxDensity.value = 0.25;
        composed = composed.add(raysPass.mul(0.22));
      }

      if (budget.enableBloom) {
        const bloomPass = bloom(sceneColor, 0.22, 0.35, 0.92);
        composed = composed.add(bloomPass);
      }

      if (budget.enableFXAA) {
        rp.outputColorTransform = true;
        rp.outputNode = fxaa(composed);
      } else {
        rp.outputNode = composed;
      }

      rp.needsUpdate = true;
      this.pipeline = rp;
    } catch {
      this.pipeline = null;
      this.fallbackDirect = true;
    }
  }

  public render(): void {
    if (this.pipeline && !this.fallbackDirect) {
      try {
        this.pipeline.render();
        return;
      } catch {
        this.fallbackDirect = true;
        this.pipeline?.dispose();
        this.pipeline = null;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.pipeline?.dispose();
    this.pipeline = null;
  }
}
