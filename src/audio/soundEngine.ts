export type SoundZone = 'campo' | 'industria' | 'porto';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private indGain: GainNode | null = null;
  private harvGain: GainNode | null = null;
  private harvPan: StereoPannerNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private birdTimer: ReturnType<typeof setInterval> | null = null;
  private zone: SoundZone = 'campo';
  private enabled = true;
  private volume = 0.9;

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;

      const ctx = new AC();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.enabled ? this.volume : 0;
      master.connect(ctx.destination);
      this.masterGain = master;

      const bufLen = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuf = buf;

      // Ambient wind/rustle loop
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 260;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.075;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSrc.start();
      this.windGain = windGain;

      // Industrial hum
      const indOsc = ctx.createOscillator();
      indOsc.type = 'triangle';
      indOsc.frequency.value = 54;
      const indGain = ctx.createGain();
      indGain.gain.value = 0;
      indOsc.connect(indGain);
      indGain.connect(master);
      indOsc.start();
      this.indGain = indGain;

      // Harvester diesel + cutter noise with stereo panning
      const harvOsc = ctx.createOscillator();
      harvOsc.type = 'sawtooth';
      harvOsc.frequency.value = 46;
      const harvNoise = ctx.createBufferSource();
      harvNoise.buffer = buf;
      harvNoise.loop = true;
      const harvFilter = ctx.createBiquadFilter();
      harvFilter.type = 'bandpass';
      harvFilter.frequency.value = 175;
      const harvGain = ctx.createGain();
      harvGain.gain.value = 0;
      harvOsc.connect(harvFilter);
      harvNoise.connect(harvFilter);
      harvFilter.connect(harvGain);

      if (ctx.createStereoPanner) {
        const pan = ctx.createStereoPanner();
        harvGain.connect(pan);
        pan.connect(master);
        this.harvPan = pan;
      } else {
        harvGain.connect(master);
      }
      harvOsc.start();
      harvNoise.start();
      this.harvGain = harvGain;

      // Periodic dawn/field birdsong
      if (!this.birdTimer) {
        this.birdTimer = setInterval(() => {
          if (!this.ctx || !this.masterGain || this.zone !== 'campo') return;
          if (Math.random() > 0.4) return;
          try {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            const f0 = 1900 + Math.random() * 1400;
            const now = this.ctx.currentTime;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f0, now);
            osc.frequency.exponentialRampToValueAtTime(f0 * 1.38, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(f0 * 0.92, now + 0.19);
            g.gain.setValueAtTime(0.001, now);
            g.gain.linearRampToValueAtTime(0.03, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start();
            osc.stop(now + 0.25);
          } catch {
            // ignore
          }
        }, 2800);
      }
    } catch {
      // AudioContext blocked or unavailable
    }
  }

  public setConfig(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = volume;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? volume : 0;
    }
  }

  public updateSpatial(
    dt: number,
    playerX: number,
    playerZ: number,
    playerYaw: number,
    harvesterX: number,
    harvesterZ: number,
    harvesterStopped: boolean,
    elapsed: number,
  ): void {
    this.zone = playerX < -8 ? 'campo' : playerX < 70 ? 'industria' : 'porto';
    if (!this.ctx) return;

    if (this.windGain) {
      const targetWind =
        this.zone === 'campo' ? 0.075 : this.zone === 'industria' ? 0.04 : 0.055;
      this.windGain.gain.value += (targetWind - this.windGain.gain.value) * Math.min(1, dt * 2);
    }

    if (this.indGain) {
      const distInd = Math.abs(playerX - 26) + Math.abs(playerZ - 22);
      this.indGain.gain.value = 0.12 * Math.max(0, 1 - distInd / 60);
    }

    if (this.harvGain) {
      const distHarv = Math.abs(playerX - harvesterX) + Math.abs(playerZ - harvesterZ);
      this.harvGain.gain.value =
        (harvesterStopped ? 0 : 0.15) *
        Math.max(0, 1 - distHarv / 55) *
        (1 + Math.sin(elapsed * 7) * 0.15);
    }

    if (this.harvPan) {
      const angle =
        Math.atan2(-(harvesterX - playerX), -(harvesterZ - playerZ)) - playerYaw;
      this.harvPan.pan.value = Math.max(-1, Math.min(1, -Math.sin(angle)));
    }
  }

  public playTone(freq: number, dur = 0.18): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start();
      osc.stop(now + dur);
    } catch {
      // ignore
    }
  }

  public playFootstep(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuf) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      const g = this.ctx.createGain();
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0.055, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start();
      src.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  public playRadioSquelch(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuf) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1850;
      const g = this.ctx.createGain();
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0.05, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start();
      src.stop(now + 0.15);
    } catch {
      // ignore
    }
  }

  public playCompletionChord(): void {
    [523, 659, 784, 1047].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.35), idx * 140);
    });
  }

  public dispose(): void {
    if (this.birdTimer) {
      clearInterval(this.birdTimer);
      this.birdTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
