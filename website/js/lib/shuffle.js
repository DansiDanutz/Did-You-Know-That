// Display order for quiz options (Fisher–Yates). Answers are always stored by the original index,
// so a reshuffle on the next visit never changes what was answered. `random` works like Math.random.
export function shuffledOrder(length, random = Math.random) {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
