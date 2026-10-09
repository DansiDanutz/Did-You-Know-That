// Coins on the road: every earned card drops a trail of coins on the stretch
// of road after its house. Collected coin ids are saved in progress.coins.

export const COINS_PER_RARITY = Object.freeze({ silver: 5, gold: 10, legendary: 20 });

// [{ id, house, t }] where t ∈ (0, 1) is the position between this house and the next.
export function coinsOnRoad(stories, cards, collected) {
  const taken = new Set(collected);
  return stories.flatMap((story, house) => {
    const owned = cards[story.card.id];
    if (!owned) return [];
    const count = COINS_PER_RARITY[owned.rarity] ?? 0;
    return Array.from({ length: count }, (_, i) => ({ id: `${story.id}:${i}`, house, t: (i + 1) / (count + 1) })).filter(
      (coin) => !taken.has(coin.id),
    );
  });
}

export function withCoinCollected(progress, coinId) {
  if (progress.coins.includes(coinId)) return progress;
  return { ...progress, coins: [...progress.coins, coinId] };
}

export const coinTotal = (progress) => progress.coins.length;
