/** Hybrid keyboard + pointer controls */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = Object.create(null);
    this.pointer = { active: false, x: 0, y: 0 };
    this.mode = "none"; // keyboard | pointer
    this._bind();
  }

  _bind() {
    const onKey = (e, down) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "p", "escape"].includes(k)) {
        e.preventDefault();
      }
      this.keys[k] = down;
      if (down && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        this.mode = "keyboard";
      }
    };
    window.addEventListener("keydown", (e) => onKey(e, true));
    window.addEventListener("keyup", (e) => onKey(e, false));

    const map = (clientX, clientY) => {
      const r = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / r.width;
      const sy = this.canvas.height / r.height;
      return {
        x: (clientX - r.left) * sx,
        y: (clientY - r.top) * sy,
      };
    };

    const down = (x, y) => {
      this.pointer.active = true;
      this.pointer.x = x;
      this.pointer.y = y;
      this.mode = "pointer";
    };
    const move = (x, y) => {
      this.pointer.x = x;
      this.pointer.y = y;
      if (this.pointer.active) this.mode = "pointer";
    };
    const up = () => {
      this.pointer.active = false;
    };

    this.canvas.addEventListener("mousedown", (e) => {
      const p = map(e.clientX, e.clientY);
      down(p.x, p.y);
    });
    window.addEventListener("mousemove", (e) => {
      const p = map(e.clientX, e.clientY);
      move(p.x, p.y);
    });
    window.addEventListener("mouseup", up);

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        const p = map(t.clientX, t.clientY);
        down(p.x, p.y);
      },
      { passive: false }
    );
    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        const p = map(t.clientX, t.clientY);
        move(p.x, p.y);
      },
      { passive: false }
    );
    this.canvas.addEventListener("touchend", up);
    this.canvas.addEventListener("touchcancel", up);
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.keys["a"] || this.keys["arrowleft"]) x -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) x += 1;
    if (this.keys["w"] || this.keys["arrowup"]) y -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) y += 1;
    if (x && y) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  pausePressed() {
    return !!(this.keys["p"] || this.keys["escape"]);
  }

  clearPauseKeys() {
    this.keys["p"] = false;
    this.keys["escape"] = false;
  }
}
