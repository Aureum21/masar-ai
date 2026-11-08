/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Self-contained Web Audio API synthesizer for Al Fahidi Secret Sikka Run.
 * Zero external audio file dependencies.
 */
export class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Rolling rumble sound
  private rollingOsc: OscillatorNode | null = null;
  private rollingGain: GainNode | null = null;
  private rollingFilter: BiquadFilterNode | null = null;
  private isRollingActive: boolean = false;

  // Stone / Rock Floor Crunch & Friction Synthesizer
  private crunchSource: AudioBufferSourceNode | null = null;
  private crunchGain: GainNode | null = null;
  private crunchFilter: BiquadFilterNode | null = null;
  private crunchHighpass: BiquadFilterNode | null = null;
  private crunchBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy initialized on user interaction
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Generates a 2-second looped stone friction texture buffer.
   * Granular pink noise mixed with randomized micro-spikes simulates pebbles,
   * grit, and coral stone flagstone texture under a heavy rolling sphere.
   */
  private getOrCreateCrunchBuffer(ctx: AudioContext): AudioBuffer {
    if (this.crunchBuffer) return this.crunchBuffer;

    const sampleRate = ctx.sampleRate;
    const duration = 2.0; // 2 seconds loop
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation (Paul Kellet's algorithm)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;

      // Add sporadic stone grit crunch micro-spikes (tiny gravel grains crushing)
      const gritSpike = Math.random() < 0.012 ? (Math.random() - 0.5) * 1.8 : 0;
      data[i] = (pink * 0.14 + gritSpike) * 0.7;
    }

    this.crunchBuffer = buffer;
    return buffer;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
    if (muted && this.ctx) {
      if (this.rollingGain) this.rollingGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.crunchGain) this.crunchGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Continuous rolling sound combining:
   * 1. Low rumble oscillator (sub-bass weight of the rolling sphere).
   * 2. Rock floor crunch & stone friction noise (granular bandpassed grit).
   * Dynamically modulated in real-time by the ball's rolling speed, and muted when airborne.
   */
  public setRolling(isRolling: boolean, speed = 36) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    if (isRolling) {
      // 1. Initialize Rumble Oscillator if needed
      if (!this.rollingOsc) {
        try {
          this.rollingOsc = ctx.createOscillator();
          this.rollingOsc.type = 'triangle';
          this.rollingOsc.frequency.setValueAtTime(45, ctx.currentTime);

          this.rollingFilter = ctx.createBiquadFilter();
          this.rollingFilter.type = 'lowpass';
          this.rollingFilter.frequency.setValueAtTime(140, ctx.currentTime);

          this.rollingGain = ctx.createGain();
          this.rollingGain.gain.setValueAtTime(0.01, ctx.currentTime);

          this.rollingOsc.connect(this.rollingFilter);
          this.rollingFilter.connect(this.rollingGain);
          this.rollingGain.connect(this.masterGain);

          this.rollingOsc.start();
        } catch {
          // Ignore audio startup race conditions
        }
      }

      // 2. Initialize Stone Floor Crunch Loop if needed
      if (!this.crunchSource) {
        try {
          const buffer = this.getOrCreateCrunchBuffer(ctx);
          this.crunchSource = ctx.createBufferSource();
          this.crunchSource.buffer = buffer;
          this.crunchSource.loop = true;

          // Bandpass filter to isolate the crisp, crunchy grit of rock pavers (800Hz - 1600Hz)
          this.crunchFilter = ctx.createBiquadFilter();
          this.crunchFilter.type = 'bandpass';
          this.crunchFilter.frequency.setValueAtTime(1100, ctx.currentTime);
          this.crunchFilter.Q.setValueAtTime(1.8, ctx.currentTime);

          // Highpass filter to strip muddiness
          this.crunchHighpass = ctx.createBiquadFilter();
          this.crunchHighpass.type = 'highpass';
          this.crunchHighpass.frequency.setValueAtTime(420, ctx.currentTime);

          this.crunchGain = ctx.createGain();
          this.crunchGain.gain.setValueAtTime(0.01, ctx.currentTime);

          this.crunchSource.connect(this.crunchHighpass);
          this.crunchHighpass.connect(this.crunchFilter);
          this.crunchFilter.connect(this.crunchGain);
          this.crunchGain.connect(this.masterGain);

          this.crunchSource.start();
        } catch {
          // Ignore audio startup race conditions
        }
      }

      this.isRollingActive = true;

      // 3. Modulate Rumble and Crunch by speed
      const speedRatio = Math.max(0.4, Math.min(speed / 36, 1.8));

      if (this.rollingOsc && this.rollingGain && this.rollingFilter) {
        const targetFreq = 38 + speedRatio * 16;
        const targetGain = Math.min(0.02 + speedRatio * 0.03, 0.06);
        this.rollingOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.06);
        this.rollingGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.06);
        this.rollingFilter.frequency.setTargetAtTime(110 + speedRatio * 45, ctx.currentTime, 0.06);
      }

      if (this.crunchGain && this.crunchFilter && this.crunchSource) {
        // Crunch frequency and volume scale with roll speed
        const crunchFreq = 950 + speedRatio * 450;
        const targetCrunchGain = Math.min(0.03 + speedRatio * 0.045, 0.08);
        this.crunchFilter.frequency.setTargetAtTime(crunchFreq, ctx.currentTime, 0.06);
        this.crunchGain.gain.setTargetAtTime(targetCrunchGain, ctx.currentTime, 0.06);
        // Playback rate subtly shifts with speed for tactile friction feel
        this.crunchSource.playbackRate.setTargetAtTime(0.85 + speedRatio * 0.35, ctx.currentTime, 0.06);
      }
    } else {
      // Mute smoothly when airborne (jumping) or paused
      if (this.rollingGain) {
        this.rollingGain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      }
      if (this.crunchGain) {
        this.crunchGain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      }
    }
  }

  /**
   * playLandingCrunch: Tactile stone impact crunch when landing from a jump
   */
  public playLandingCrunch() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    try {
      const t = ctx.currentTime;
      const buffer = this.getOrCreateCrunchBuffer(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(700, t + 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      src.start(t);
      src.stop(t + 0.15);
    } catch {
      // Ignore audio glitches
    }
  }

  /**
   * playCountdown: Plays authentic Arabic brass/wood countdown chime cues
   * @param count 3, 2, 1 (regular beats) or 0 ("GO!" celebratory chime)
   */
  public playCountdown(count: number) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;

    if (count > 0) {
      // Pitched tones for 3 (D5), 2 (E5), 1 (G5)
      const freqs = [0, 783.99, 659.25, 587.33]; // index by count
      const freq = freqs[count] || 659.25;

      const osc = ctx.createOscillator();
      const clickOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      // Fast percussive astrolabe gear click transient
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(freq * 2.5, t);
      clickOsc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      clickOsc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      clickOsc.start(t);
      osc.stop(t + 0.23);
      clickOsc.stop(t + 0.04);
    } else {
      // Count 0: "GO!" fanfare chord (A5 + E6)
      const chord = [880.0, 1318.5];
      chord.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(t);
        osc.stop(t + 0.46);
      });
    }
  }

  /**
   * playCoin: High-pitched dual sine tone (988Hz -> 1318Hz) with exponential gain decay (0.25s)
   */
  public playCoin() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(988, t); // B5
    osc1.frequency.exponentialRampToValueAtTime(1318.5, t + 0.09); // E6

    osc2.frequency.setValueAtTime(1976, t); // B6 overtone sparkle
    osc2.frequency.exponentialRampToValueAtTime(2637, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.26);
    osc2.stop(t + 0.26);
  }

  /**
   * playJump: Upward frequency sweep (220Hz -> 680Hz) with smooth triangle wave
   */
  public playJump() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.28);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.33);
  }

  /**
   * playCrash: Downward sawtooth sweep (160Hz -> 40Hz) with rapid attack and decay
   */
  public playCrash() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.35);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.41);
  }

  /**
   * playFanfare: 4-note ascending chord sequence (523.25Hz, 659.25Hz, 783.99Hz, 1046.50Hz)
   */
  public playFanfare() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = ctx.currentTime + 0.05;

    notes.forEach((freq, index) => {
      const noteTime = startTime + index * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index === 3 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + (index === 3 ? 0.9 : 0.45));

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + (index === 3 ? 0.95 : 0.5));
    });
  }

  public dispose() {
    if (this.rollingOsc) {
      try {
        this.rollingOsc.stop();
        this.rollingOsc.disconnect();
      } catch {
        // Ignored
      }
      this.rollingOsc = null;
    }
    if (this.crunchSource) {
      try {
        this.crunchSource.stop();
        this.crunchSource.disconnect();
      } catch {
        // Ignored
      }
      this.crunchSource = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.masterGain = null;
    this.isRollingActive = false;
  }
}

export const sound = new SoundController();
