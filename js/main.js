import { Engine } from "./engine.js";
import { Input } from "./input.js";
import { AudioBus } from "./audio.js";
import { loadScores, submitScore, isHighScore } from "./scores.js";

const canvas = document.getElementById("game");
const audio = new AudioBus();
const input = new Input(canvas);
const engine = new Engine(canvas, audio);

const overlay = document.getElementById("overlay");
const hud = document.getElementById("hud");
const panels = {
  start: document.getElementById("panel-start"),
  pause: document.getElementById("panel-pause"),
  over: document.getElementById("panel-over"),
  scores: document.getElementById("panel-scores"),
};

function showPanel(name) {
  overlay.classList.remove("hidden");
  for (const [k, el] of Object.entries(panels)) {
    el.classList.toggle("hidden", k !== name);
  }
  hud.classList.toggle("hidden", name !== null && name !== "pause");
  if (name === null) {
    overlay.classList.add("hidden");
    hud.classList.remove("hidden");
  }
}

function renderScoreList() {
  const list = loadScores();
  const ol = document.getElementById("score-list");
  if (!list.length) {
    ol.innerHTML = "<li><span class='rank'>—</span><span>まだ記録がありません</span><span class='pts'></span></li>";
    return;
  }
  ol.innerHTML = list
    .map(
      (e, i) =>
        `<li><span class="rank">${i + 1}</span><span>${escapeHtml(e.name)}</span><span class="pts">${e.score.toLocaleString()}</span></li>`
    )
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c]));
}

function updateHud(data) {
  document.getElementById("score").textContent = data.score.toLocaleString();
  document.getElementById("wave").textContent = String(data.wave);
  document.getElementById("lives").textContent = "■".repeat(Math.max(0, data.lives)) || "—";
  const pills = document.getElementById("power-pills");
  const parts = [];
  if (data.multi) parts.push('<span class="pill multi">MULTI</span>');
  if (data.shield) parts.push('<span class="pill shield">SHIELD</span>');
  if (data.speed) parts.push('<span class="pill speed">SPEED</span>');
  pills.innerHTML = parts.join("");
}

engine.onHud = updateHud;
engine.onGameOver = ({ score, wave }) => {
  document.getElementById("final-score").textContent = score.toLocaleString();
  const rec = isHighScore(score);
  document.getElementById("new-record").classList.toggle("hidden", !rec);
  showPanel("over");
};

document.getElementById("btn-start").addEventListener("click", () => {
  audio.ensure();
  engine.startPlaying();
  showPanel(null);
});

document.getElementById("btn-pause").addEventListener("click", () => {
  if (engine.state === "playing") {
    engine.pause();
    showPanel("pause");
  }
});

document.getElementById("btn-resume").addEventListener("click", () => {
  engine.resume();
  showPanel(null);
});

document.getElementById("btn-restart").addEventListener("click", () => {
  engine.startPlaying();
  showPanel(null);
});

document.getElementById("btn-quit").addEventListener("click", () => {
  engine.state = "title";
  showPanel("start");
  hud.classList.add("hidden");
});

document.getElementById("btn-retry").addEventListener("click", () => {
  engine.startPlaying();
  showPanel(null);
});

document.getElementById("btn-title").addEventListener("click", () => {
  engine.state = "title";
  showPanel("start");
  hud.classList.add("hidden");
});

document.getElementById("btn-submit").addEventListener("click", () => {
  const name = document.getElementById("player-name").value;
  submitScore(name, engine.score, engine.wave);
  renderScoreList();
  showPanel("scores");
});

document.getElementById("btn-scores-open").addEventListener("click", () => {
  renderScoreList();
  showPanel("scores");
});

document.getElementById("btn-scores-close").addEventListener("click", () => {
  showPanel("start");
});

let last = performance.now();
let pauseLatch = false;

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (engine.state === "playing") {
    if (input.pausePressed()) {
      if (!pauseLatch) {
        pauseLatch = true;
        engine.pause();
        showPanel("pause");
        input.clearPauseKeys();
      }
    } else {
      pauseLatch = false;
    }
  } else if (engine.state === "paused") {
    if (input.pausePressed()) {
      if (!pauseLatch) {
        pauseLatch = true;
        engine.resume();
        showPanel(null);
        input.clearPauseKeys();
      }
    } else {
      pauseLatch = false;
    }
  }

  if (engine.state === "title" || engine.state === "over" || engine.state === "paused") {
    engine.renderIdle(dt);
  } else {
    engine.update(dt, input);
  }

  requestAnimationFrame(frame);
}

showPanel("start");
hud.classList.add("hidden");
requestAnimationFrame(frame);
