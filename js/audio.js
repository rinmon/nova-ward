/**
 * NOVA WARD — Web Audio API bus
 * Oscillator + noise + filter SFX, optional pad BGM, master gain / mute
 */
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.muted = false;
    this._noise = null;
    this._padNodes = null;
  }

  /** Create AudioContext on first user gesture (autoplay policy). */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;

      this.sfxGain.connect(comp);
      this.musicGain.connect(comp);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);

      this._noise = this._makeNoiseBuffer(0.35);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return true;
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.03);
    }
    if (this.muted) this.stopPad();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _makeNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _out() {
    return this.sfxGain || this.ctx.destination;
  }

  tone({
    freq = 440,
    dur = 0.1,
    type = "square",
    gain = 0.05,
    slide = 0,
    filterFreq = 0,
    attack = 0.005,
    decay = null,
  } = {}) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const d = decay ?? dur;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    }

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);

    let node = osc;
    if (filterFreq > 0) {
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(filterFreq, t0);
      f.Q.value = 0.7;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this._out());
    osc.start(t0);
    osc.stop(t0 + d + 0.04);
  }

  noiseBurst({ dur = 0.15, gain = 0.06, filterFreq = 1200, type = "bandpass" } = {}) {
    if (this.muted || !this.ctx || !this._noise) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t0);
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this._out());
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() {
    if (!this.ensure()) return;
    this.tone({ freq: 920, dur: 0.045, type: "square", gain: 0.028, slide: -520, filterFreq: 2800 });
    this.tone({ freq: 1400, dur: 0.03, type: "triangle", gain: 0.012, slide: -600 });
  }

  hit() {
    if (!this.ensure()) return;
    this.tone({ freq: 240, dur: 0.07, type: "sawtooth", gain: 0.04, slide: -100, filterFreq: 900 });
    this.noiseBurst({ dur: 0.05, gain: 0.03, filterFreq: 1800, type: "highpass" });
  }

  explode() {
    if (!this.ensure()) return;
    this.noiseBurst({ dur: 0.28, gain: 0.09, filterFreq: 600, type: "lowpass" });
    this.tone({ freq: 140, dur: 0.24, type: "sawtooth", gain: 0.06, slide: -90, filterFreq: 500 });
    this.tone({ freq: 55, dur: 0.32, type: "triangle", gain: 0.05, slide: -20 });
  }

  power() {
    if (!this.ensure()) return;
    this.tone({ freq: 392, dur: 0.08, type: "sine", gain: 0.045, slide: 180 });
    this.tone({ freq: 523, dur: 0.1, type: "sine", gain: 0.04, slide: 160 });
    this.tone({ freq: 659, dur: 0.14, type: "triangle", gain: 0.03, slide: 120 });
  }

  hurt() {
    if (!this.ensure()) return;
    this.tone({ freq: 180, dur: 0.16, type: "sawtooth", gain: 0.055, slide: -90, filterFreq: 700 });
    this.noiseBurst({ dur: 0.12, gain: 0.04, filterFreq: 400, type: "lowpass" });
  }

  wave() {
    if (!this.ensure()) return;
    this.tone({ freq: 440, dur: 0.09, type: "triangle", gain: 0.035, slide: 80 });
    this.tone({ freq: 554, dur: 0.11, type: "sine", gain: 0.03, slide: 100 });
  }

  ui() {
    if (!this.ensure()) return;
    this.tone({ freq: 660, dur: 0.05, type: "sine", gain: 0.03 });
  }

  gameOver() {
    if (!this.ensure()) return;
    this.tone({ freq: 330, dur: 0.2, type: "sawtooth", gain: 0.04, slide: -80, filterFreq: 600 });
    this.tone({ freq: 220, dur: 0.35, type: "triangle", gain: 0.035, slide: -60 });
    this.noiseBurst({ dur: 0.4, gain: 0.05, filterFreq: 300, type: "lowpass" });
  }

  startPad() {
    if (!this.ensure() || this.muted || this._padNodes) return;
    const t0 = this.ctx.currentTime;
    const freqs = [110, 164.81, 220];
    const nodes = [];
    for (const f0 of freqs) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = f0;
      f.type = "lowpass";
      f.frequency.value = 600;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.04, t0 + 1.2);
      osc.connect(f);
      f.connect(g);
      g.connect(this.musicGain);
      osc.start(t0);
      nodes.push({ osc, g });
    }
    this._padNodes = nodes;
  }

  stopPad() {
    if (!this.ctx || !this._padNodes) return;
    const t0 = this.ctx.currentTime;
    for (const { osc, g } of this._padNodes) {
      try {
        g.gain.cancelScheduledValues(t0);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
        osc.stop(t0 + 0.5);
      } catch {
        /* already stopped */
      }
    }
    this._padNodes = null;
  }
}
