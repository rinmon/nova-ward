import { Engine, W, H, rand } from "./engine-core.js";

Object.assign(Engine.prototype, {
  _drawStars(dt) {
    for (const layer of this.stars) {
      for (const s of layer) {
        s.y += s.sp * dt;
        if (s.y > H) {
          s.y = 0;
          s.x = Math.random() * W;
        }
      }
    }
  },

  _render(withEntities) {
    const ctx = this.ctx;
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 10 : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 10 : 0;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    ctx.fillStyle = "#02040a";
    ctx.fillRect(-10, -10, W + 20, H + 20);

    const colors = ["#3a4a6a", "#7a8cb0", "#c8d6ff"];
    this.stars.forEach((layer, i) => {
      ctx.fillStyle = colors[i];
      for (const s of layer) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (!withEntities || !this.player) {
      ctx.restore();
      return;
    }

    for (const u of this.pickups) this._drawPickup(ctx, u);

    for (const b of this.enemyBullets) {
      ctx.fillStyle = "#ff5c7a";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,92,122,0.25)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of this.enemies) this._drawEnemy(ctx, e);

    for (const b of this.bullets) {
      const g = ctx.createLinearGradient(b.x, b.y + 8, b.x, b.y - 8);
      g.addColorStop(0, "rgba(62,224,200,0)");
      g.addColorStop(1, "#3ee0c8");
      ctx.fillStyle = g;
      ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
      ctx.fillStyle = "#fff";
      ctx.fillRect(b.x - 1, b.y - 6, 2, 6);
    }

    for (const m of this.muzzles) {
      const a = Math.max(0, m.life / 0.06);
      ctx.fillStyle = `rgba(255,230,150,${a})`;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - 10);
      ctx.lineTo(m.x - 8, m.y + 4);
      ctx.lineTo(m.x + 8, m.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 4 * a, 0, Math.PI * 2);
      ctx.fill();
    }

    this._drawPlayer(ctx, this.player);

    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life * 2);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.s, q.s);
      ctx.globalAlpha = 1;
    }

    if (this.player.shield > 0) {
      ctx.strokeStyle = `rgba(122,215,255,${0.35 + 0.25 * Math.sin(performance.now() / 120)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.r + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  _drawPlayer(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const eg = ctx.createRadialGradient(0, 16, 0, 0, 16, 18);
    eg.addColorStop(0, "rgba(62,224,200,0.7)");
    eg.addColorStop(1, "rgba(62,224,200,0)");
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(0, 18, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a2a40";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 10);
    ctx.lineTo(4, 6);
    ctx.lineTo(-4, 6);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#3ee0c8";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(6, 2);
    ctx.lineTo(-6, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#7aa2ff";
    ctx.fillRect(-3, -2, 6, 6);
    ctx.restore();
  },

  _drawEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.kind === "scout") {
      ctx.fillStyle = "#ff5c7a";
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(11, -8);
      ctx.lineTo(0, -4);
      ctx.lineTo(-11, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffb0c0";
      ctx.fillRect(-3, -2, 6, 4);
    } else if (e.kind === "drone") {
      ctx.fillStyle = "#c47bff";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e8c4ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#2a1040";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ff9f43";
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(16, 4);
      ctx.lineTo(12, -14);
      ctx.lineTo(-12, -14);
      ctx.lineTo(-16, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5a2a10";
      ctx.fillRect(-6, -6, 12, 10);
      ctx.fillStyle = "#ffd56a";
      ctx.fillRect(-3, -3, 6, 5);
    }
    ctx.restore();
  },

  _drawPickup(ctx, u) {
    const map = {
      multi: "#ffd56a",
      shield: "#7ad7ff",
      speed: "#b6ff7a",
      life: "#ff7aad",
    };
    const c = map[u.kind] || "#fff";
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(u.age * 2);
    ctx.strokeStyle = c;
    ctx.fillStyle = c + "33";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = i % 2 === 0 ? 11 : 6;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  renderIdle(dt) {
    this._drawStars(dt * 0.4);
    this._render(false);
  }
});

export { Engine };
