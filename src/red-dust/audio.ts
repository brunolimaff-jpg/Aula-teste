import type { SurfaceKind } from './types';

export interface SpatialAudioListenerState {
  px: number;
  pz: number;
  yaw: number;
  valvePurged: boolean;
  switchIsolated: boolean;
  breakerRestored: boolean;
  climax: number;
}

export class RedDustAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private faultGain: GainNode | null = null;
  private faultPan: StereoPannerNode | null = null;
  private steamGain: GainNode | null = null;
  private steamPan: StereoPannerNode | null = null;
  private turbineGain: GainNode | null = null;
  private turbineOscA: OscillatorNode | null = null;
  private turbineOscB: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private started = false;
  private nextArcTime = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(m ? 0 : 0.72, this.ctx.currentTime, 0.05);
    }
  }

  public unlock(): void {
    if (this.started) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    this.ctx = ctx;
    this.started = true;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.72;
    master.connect(ctx.destination);
    this.masterGain = master;

    // 2-second pink-ish noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.04) * 0.45;
    }
    this.noiseBuffer = buf;

    // 1. Ambient post-storm wind & cane rustle
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.16;
    windSrc.connect(windFilter).connect(windGain).connect(master);
    windSrc.start();
    this.windGain = windGain;

    // 2. Spatial QGBT-04 60Hz electrical fault hum
    const faultOsc = ctx.createOscillator();
    faultOsc.type = 'sawtooth';
    faultOsc.frequency.value = 120;
    const faultFilter = ctx.createBiquadFilter();
    faultFilter.type = 'lowpass';
    faultFilter.frequency.value = 520;
    const faultGain = ctx.createGain();
    faultGain.gain.value = 0.0;
    const faultPan = ctx.createStereoPanner();
    faultOsc.connect(faultFilter).connect(faultGain).connect(faultPan).connect(master);
    faultOsc.start();
    this.faultGain = faultGain;
    this.faultPan = faultPan;

    // 3. Spatial Valve V-07 pressurized steam hiss
    const steamSrc = ctx.createBufferSource();
    steamSrc.buffer = buf;
    steamSrc.loop = true;
    const steamFilter = ctx.createBiquadFilter();
    steamFilter.type = 'highpass';
    steamFilter.frequency.value = 1900;
    const steamGain = ctx.createGain();
    steamGain.gain.value = 0.0;
    const steamPan = ctx.createStereoPanner();
    steamSrc.connect(steamFilter).connect(steamGain).connect(steamPan).connect(master);
    steamSrc.start();
    this.steamGain = steamGain;
    this.steamPan = steamPan;

    // 4. Climax Turbine / Mill Generator harmonic drone
    const tA = ctx.createOscillator();
    const tB = ctx.createOscillator();
    tA.type = 'triangle';
    tB.type = 'sawtooth';
    tA.frequency.value = 44;
    tB.frequency.value = 88;
    const tFilter = ctx.createBiquadFilter();
    tFilter.type = 'lowpass';
    tFilter.frequency.value = 340;
    const tGain = ctx.createGain();
    tGain.gain.value = 0.0;
    tA.connect(tFilter);
    tB.connect(tFilter);
    tFilter.connect(tGain).connect(master);
    tA.start();
    tB.start();
    this.turbineGain = tGain;
    this.turbineOscA = tA;
    this.turbineOscB = tB;
  }

  private computePanAndAtten(
    listenerX: number,
    listenerZ: number,
    yaw: number,
    srcX: number,
    srcZ: number,
    maxDist: number
  ): { gain: number; pan: number } {
    const dx = srcX - listenerX;
    const dz = srcZ - listenerZ;
    const dist = Math.hypot(dx, dz);
    const gain = Math.max(0, 1 - dist / maxDist);
    // Listener right vector in XZ plane: (cos(yaw), sin(yaw))? Wait: camera forward is (-sin(yaw), -cos(yaw))
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const pan = dist > 0.2 ? Math.max(-0.9, Math.min(0.9, (dx * rightX + dz * rightZ) / dist)) : 0;
    return { gain: gain * gain, pan };
  }

  public update(state: SpatialAudioListenerState): void {
    if (!this.ctx || !this.started || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(0.14 + Math.sin(now * 0.45) * 0.04, now, 0.2);
    }

    // QGBT-04 at (-13.9, -14.2)
    if (this.faultGain && this.faultPan) {
      const active = !state.switchIsolated && !state.breakerRestored;
      const sp = this.computePanAndAtten(state.px, state.pz, state.yaw, -13.9, -14.2, 22);
      this.faultGain.gain.setTargetAtTime(active ? sp.gain * 0.12 : 0, now, 0.08);
      this.faultPan.pan.setTargetAtTime(sp.pan, now, 0.08);

      if (active && sp.gain > 0.08 && now > this.nextArcTime) {
        this.nextArcTime = now + 0.45 + Math.random() * 1.4;
        this.triggerSparkCrackle(sp.gain * 0.28, sp.pan);
      }
    }

    // Valve V-07 at (7.6, -8.8)
    if (this.steamGain && this.steamPan) {
      const sp = this.computePanAndAtten(state.px, state.pz, state.yaw, 7.6, -8.8, 22);
      const target = state.valvePurged ? 0 : sp.gain * 0.16;
      this.steamGain.gain.setTargetAtTime(target, now, 0.1);
      this.steamPan.pan.setTargetAtTime(sp.pan, now, 0.1);
    }

    // Turbine spool-up during climax
    if (this.turbineGain && this.turbineOscA && this.turbineOscB) {
      const on = state.breakerRestored ? Math.min(1, state.climax * 1.3) : 0;
      this.turbineGain.gain.setTargetAtTime(on * 0.16, now, 0.25);
      this.turbineOscA.frequency.setTargetAtTime(42 + on * 46, now, 0.35);
      this.turbineOscB.frequency.setTargetAtTime(84 + on * 92, now, 0.35);
    }
  }

  private triggerSparkCrackle(level: number, panVal: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3400 + Math.random() * 1800;
    bp.Q.value = 2.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = panVal;
    src.connect(bp).connect(g).connect(pan).connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.09);
  }

  public playFootstep(surface: SurfaceKind): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    if (surface === 'puddle') {
      filter.type = 'bandpass';
      filter.frequency.value = 1400 + Math.random() * 400;
      filter.Q.value = 1.1;
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else if (surface === 'concrete') {
      filter.type = 'lowpass';
      filter.frequency.value = 520 + Math.random() * 180;
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 380 + Math.random() * 140;
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    }

    src.connect(filter).connect(g).connect(this.masterGain);
    src.start(now, Math.random() * 0.5);
    src.stop(now + 0.18);
  }

  public playAction(kind: 'valve' | 'switch' | 'breaker' | 'truck'): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    if (kind === 'valve') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.25);
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    } else if (kind === 'switch') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    } else if (kind === 'breaker') {
      // Heavy mechanical breaker slam + warm power confirmation chord
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.35);
      g.gain.setValueAtTime(0.32, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      const chord = this.ctx.createOscillator();
      const cg = this.ctx.createGain();
      chord.type = 'triangle';
      chord.frequency.setValueAtTime(220, now + 0.15);
      chord.frequency.exponentialRampToValueAtTime(330, now + 0.85);
      cg.gain.setValueAtTime(0.001, now);
      cg.gain.linearRampToValueAtTime(0.16, now + 0.3);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      chord.connect(cg).connect(this.masterGain);
      chord.start(now);
      chord.stop(now + 1.65);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    }

    osc.connect(g).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
