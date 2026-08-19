/**
 * NOVA WARD — full-style top-down space shooter engine
 * Waves, multishot / shield / speed power-ups, lives, score, parallax, muzzle flash
 */

export const W = 480;
export const H = 720;

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
export function rand(a, b) {
  return a + Math.random() * (b - a);
}
export function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

export class Engine {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = audio;
    this.W = W;
    this.H = H;

    this.state = "title";
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.combo = 0;
    this.comboTimer = 0;

    this.player = null;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.muzzles = [];
    this.stars = this._makeStars();

    this.waveTimer = 0;
    this.waveClearDelay = 0;
    this.spawnQueue = [];
    this.shake = 0;
    this.hitStop = 0;
    this.invuln = 0;

    this.onHud = null;
    this.onGameOver = null;
  }

  _makeStars() {
    const layers = [[], [], []];
    for (let i = 0; i < 60; i++) layers[0].push({ x: Math.random() * W, y: Math.random() * H, s: 0.4, sp: 20 });
    for (let i = 0; i < 40; i++) layers[1].push({ x: Math.random() * W, y: Math.random() * H, s: 0.9, sp: 45 });
    for (let i = 0; i < 20; i++) layers[2].push({ x: Math.random() * W, y: Math.random() * H, s: 1.6, sp: 90 });
    return layers;
  }

  reset() {
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.combo = 0;
    this.comboTimer = 0;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.muzzles = [];
    this.waveTimer = 0;
    this.waveClearDelay = 0;
    this.spawnQueue = [];
    this.shake = 0;
    this.hitStop = 0;
    this.invuln = 0;
    this.player = {
      x: W / 2,
      y: H - 100,
      vx: 0,
      vy: 0,
      r: 14,
      baseSpeed: 280,
      speedMul: 1,
      speedTimer: 0,
      multi: 0,
      multiTimer: 0,
      shield: 0,
      fireCd: 0,
    };
    this.state = "playing";
    this._queueWave(1);
    this._hud();
  }

  _hud() {
    if (this.onHud) {
      this.onHud({
        score: this.score,
        wave: this.wave,
        lives: this.lives,
        multi: this.player?.multi > 0,
        shield: this.player?.shield > 0,
        speed: this.player?.speedTimer > 0,
      });
    }
  }

  _queueWave(n) {
    this.spawnQueue = [];
    this.waveTimer = 0.6;
    const count = 4 + Math.min(12, n * 2);
    for (let i = 0; i < count; i++) {
      const t = i * (0.35 + Math.max(0, 0.25 - n * 0.01));
      let kind = "scout";
      if (n >= 2 && Math.random() < 0.35) kind = "drone";
      if (n >= 4 && Math.random() < 0.22) kind = "bruiser";
      this.spawnQueue.push({ t, kind, x: rand(40, W - 40) });
    }
    this.audio.wave();
  }

  startPlaying() {
    this.reset();
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
  }

  resume() {
    if (this.state === "paused") this.state = "playing";
  }

  update(dt, input) {
    if (this.state !== "playing") {
      this._drawStars(dt * 0.3);
      this._render(false);
      return;
    }

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this._render(true);
      return;
    }

    const p = this.player;
    const axis = input.axis();

    let targetVx = 0;
    let targetVy = 0;
    if (input.mode === "pointer" && input.pointer.active) {
      const dx = input.pointer.x - p.x;
      const dy = input.pointer.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const spd = p.baseSpeed * p.speedMul;
        targetVx = (dx / dist) * Math.min(spd, dist * 8);
        targetVy = (dy / dist) * Math.min(spd, dist * 8);
      }
    } else {
      const spd = p.baseSpeed * p.speedMul;
      targetVx = axis.x * spd;
      targetVy = axis.y * spd;
    }
    p.vx += (targetVx - p.vx) * Math.min(1, dt * 14);
    p.vy += (targetVy - p.vy) * Math.min(1, dt * 14);
    p.x = clamp(p.x + p.vx * dt, 20, W - 20);
    p.y = clamp(p.y + p.vy * dt, 40, H - 24);

    p.fireCd = Math.max(0, p.fireCd - dt);
    p.multiTimer = Math.max(0, p.multiTimer - dt);
    if (p.multiTimer <= 0) p.multi = 0;
    p.speedTimer = Math.max(0, p.speedTimer - dt);
    if (p.speedTimer <= 0) p.speedMul = 1;
    this.invuln = Math.max(0, this.invuln - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    this.shake = Math.max(0, this.shake - dt * 4);

    if (p.fireCd <= 0) {
      this._fire();
      p.fireCd = 0.12;
    }

    for (const layer of this.stars) {
      for (const s of layer) {
        s.y += s.sp * dt;
        if (s.y > H) {
          s.y = 0;
          s.x = Math.random() * W;
        }
      }
    }

    this.waveTimer += dt;
    this.spawnQueue = this.spawnQueue.filter((job) => {
      if (this.waveTimer >= job.t) {
        this._spawnEnemy(job.kind, job.x);
        return false;
      }
      return true;
    });

    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveClearDelay += dt;
      if (this.waveClearDelay > 1.2) {
        this.waveClearDelay = 0;
        this.wave += 1;
        this._queueWave(this.wave);
        this._hud();
      }
    } else {
      this.waveClearDelay = 0;
    }

    for (const e of this.enemies) {
      e.age += dt;
      if (e.kind === "scout") {
        e.y += e.vy * dt;
        e.x += Math.sin(e.age * 3 + e.phase) * 40 * dt;
      } else if (e.kind === "drone") {
        e.y += e.vy * dt;
        e.x += Math.sin(e.age * 2 + e.phase) * 90 * dt;
        e.fireCd -= dt;
        if (e.fireCd <= 0 && e.y > 40 && e.y < H * 0.7) {
          e.fireCd = 1.4 + Math.random() * 0.6;
          this.enemyBullets.push({ x: e.x, y: e.y + 10, vx: 0, vy: 180, r: 3 });
        }
      } else {
        e.y += e.vy * dt;
        e.fireCd -= dt;
        if (e.fireCd <= 0 && e.y > 30) {
          e.fireCd = 1.1;
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          this.enemyBullets.push({
            x: e.x,
            y: e.y + 8,
            vx: Math.cos(a) * 160,
            vy: Math.sin(a) * 160,
            r: 4,
          });
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.y < H + 40 && e.hp > 0);

    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.y > -20);

    for (const b of this.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.enemyBullets = this.enemyBullets.filter((b) => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);

    for (const u of this.pickups) {
      u.y += u.vy * dt;
      u.x += Math.sin(u.age * 3) * 20 * dt;
      u.age += dt;
    }
    this.pickups = this.pickups.filter((u) => u.y < H + 30);

    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const m of this.muzzles) m.life -= dt;
    this.muzzles = this.muzzles.filter((m) => m.life > 0);

    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
          b.dead = true;
          e.hp -= 1;
          this._spark(b.x, b.y, "#3ee0c8", 4);
          this.audio.hit();
          if (e.hp <= 0) this._killEnemy(e);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);

    if (this.invuln <= 0) {
      for (const e of this.enemies) {
        if (this._hitPlayer(e.x, e.y, e.r)) break;
      }
      for (const b of this.enemyBullets) {
        if (this._hitPlayer(b.x, b.y, b.r)) {
          b.y = H + 100;
          break;
        }
      }
    }

    for (const u of this.pickups) {
      const dx = u.x - p.x;
      const dy = u.y - p.y;
      if (dx * dx + dy * dy < (u.r + p.r) * (u.r + p.r)) {
        u.y = H + 50;
        this._applyPickup(u.kind);
      }
    }

    this._hud();
    this._render(true);
  }

  _fire() {
    const p = this.player;
    const level = p.multi;
    const shots =
      level >= 2
        ? [
            { ox: 0, vx: 0 },
            { ox: -10, vx: -40 },
            { ox: 10, vx: 40 },
            { ox: -18, vx: -80 },
            { ox: 18, vx: 80 },
          ]
        : level >= 1
          ? [
              { ox: 0, vx: 0 },
              { ox: -12, vx: -55 },
              { ox: 12, vx: 55 },
            ]
          : [{ ox: 0, vx: 0 }];

    for (const s of shots) {
      this.bullets.push({
        x: p.x + s.ox,
        y: p.y - 16,
        vx: s.vx,
        vy: -520,
        r: 3,
        life: 1.2,
        dead: false,
      });
    }
    this.muzzles.push({ x: p.x, y: p.y - 18, life: 0.06 });
    this.audio.shoot();
  }

  _spawnEnemy(kind, x) {
    const base = {
      x,
      y: -20,
      phase: Math.random() * Math.PI * 2,
      age: 0,
      fireCd: 0.5 + Math.random(),
      kind,
    };
    if (kind === "scout") Object.assign(base, { r: 14, hp: 1, vy: 90 + this.wave * 4 });
    else if (kind === "drone") Object.assign(base, { r: 16, hp: 2, vy: 70 + this.wave * 3 });
    else Object.assign(base, { r: 22, hp: 5 + Math.floor(this.wave / 2), vy: 45 + this.wave * 2 });
    this.enemies.push(base);
  }

  _killEnemy(e) {
    e.hp = 0;
    this.combo += 1;
    this.comboTimer = 2.2;
    const base = e.kind === "bruiser" ? 250 : e.kind === "drone" ? 120 : 50;
    const pts = Math.floor(base * (1 + Math.min(4, this.combo) * 0.15));
    this.score += pts;
    this._explode(e.x, e.y, e.kind === "bruiser" ? 18 : 10);
    this.audio.explode();
    this.shake = Math.min(1.2, this.shake + 0.25);
    this.hitStop = 0.03;
    if (Math.random() < (e.kind === "bruiser" ? 0.55 : 0.18)) {
      const kinds = ["multi", "shield", "speed", "life"];
      const weights = e.kind === "bruiser" ? [0.3, 0.25, 0.25, 0.2] : [0.35, 0.25, 0.3, 0.1];
      let r = Math.random();
      let kind = "multi";
      for (let i = 0; i < kinds.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          kind = kinds[i];
          break;
        }
      }
      this.pickups.push({ x: e.x, y: e.y, vy: 70, r: 12, kind, age: 0 });
    }
  }

  _hitPlayer(x, y, r) {
    const p = this.player;
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy >= (r + p.r) * (r + p.r)) return false;
    if (p.shield > 0) {
      p.shield -= 1;
      this.invuln = 0.8;
      this.shake = 0.6;
      this._spark(p.x, p.y, "#7ad7ff", 10);
      this.audio.hurt();
      this._hud();
      return true;
    }
    this.lives -= 1;
    this.invuln = 1.5;
    this.shake = 1;
    this.combo = 0;
    this._explode(p.x, p.y, 14);
    this.audio.hurt();
    this._hud();
    if (this.lives <= 0) {
      this.state = "over";
      if (this.onGameOver) this.onGameOver({ score: this.score, wave: this.wave });
    }
    return true;
  }

  _applyPickup(kind) {
    const p = this.player;
    this.audio.power();
    this._spark(p.x, p.y, "#ffd56a", 12);
    if (kind === "multi") {
      p.multi = Math.min(2, p.multi + 1);
      p.multiTimer = 12;
    } else if (kind === "shield") {
      p.shield = Math.min(3, p.shield + 1);
    } else if (kind === "speed") {
      p.speedMul = 1.45;
      p.speedTimer = 10;
    } else if (kind === "life") {
      this.lives = Math.min(5, this.lives + 1);
    }
    this._hud();
  }

  _spark(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(40, 180);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.2, 0.55),
        color,
        s: rand(1, 3),
      });
    }
  }

  _explode(x, y, n) {
    this._spark(x, y, "#ff8a5c", n);
    this._spark(x, y, "#ffd56a", n >> 1);
  }
}
