/** Minimal Web Audio SFX synth for NOVA WARD */
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur, type = "square", gain = 0.04, slide = 0) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  shoot() {
    this.ensure();
    this.tone(880, 0.05, "square", 0.03, -400);
  }

  hit() {
    this.ensure();
    this.tone(220, 0.08, "sawtooth", 0.05, -120);
  }

  explode() {
    this.ensure();
    this.tone(120, 0.22, "sawtooth", 0.07, -80);
    this.tone(60, 0.28, "triangle", 0.05, -30);
  }

  power() {
    this.ensure();
    this.tone(440, 0.08, "sine", 0.05, 220);
    this.tone(660, 0.12, "sine", 0.04, 200);
  }

  hurt() {
    this.ensure();
    this.tone(160, 0.18, "sawtooth", 0.07, -100);
  }

  wave() {
    this.ensure();
    this.tone(520, 0.1, "triangle", 0.04, 120);
  }
}
