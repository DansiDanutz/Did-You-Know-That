// Tracks which whole seconds of a video were actually played.
// Skipping ahead never counts the skipped part, so the seal only breaks
// for people who genuinely listened.

export function recordTime(watched, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return watched;
  const second = Math.floor(seconds);
  if (watched.has(second)) return watched;
  return new Set([...watched, second]);
}

export function watchRatio(watched, durationSeconds) {
  const total = Math.floor(durationSeconds);
  if (!total || total <= 0) return 0;
  return Math.min(1, watched.size / total);
}

export function hasWatchedEnough(ratio, requiredRatio) {
  return ratio >= requiredRatio;
}
