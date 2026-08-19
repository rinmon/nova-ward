const KEY = "nova-ward-scores-v1";

export function loadScores() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => e && typeof e.score === "number")
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function submitScore(name, score, wave) {
  const list = loadScores();
  list.push({
    name: (name || "GUEST").trim().slice(0, 12) || "GUEST",
    score: Math.floor(score),
    wave: wave | 0,
    at: Date.now(),
  });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(top));
  return top;
}

export function isHighScore(score) {
  const list = loadScores();
  if (list.length < 10) return true;
  return score > list[list.length - 1].score;
}
