export const RARITY = Object.freeze({
  SILVER: "silver",
  GOLD: "gold",
  LEGENDARY: "legendary",
});

export const RARITY_RANK = Object.freeze({ silver: 1, gold: 2, legendary: 3 });

export const RARITY_LABEL = Object.freeze({
  silver: "Silver",
  gold: "Gold",
  legendary: "Legendary",
});

const POINTS_FIRST_TRY = 2;
const POINTS_SECOND_TRY = 1;
const LEGENDARY_SHARE = 0.9;
const GOLD_SHARE = 0.6;

export function quizPoints(attempts) {
  if (attempts === 1) return POINTS_FIRST_TRY;
  if (attempts === 2) return POINTS_SECOND_TRY;
  return 0;
}

export function maxSparks(pages) {
  return pages.reduce((sum, page) => {
    if (page.type === "quiz") return sum + POINTS_FIRST_TRY;
    if (page.spark) return sum + 1;
    return sum;
  }, 0);
}

export function rarityFor(sparks, max) {
  if (!max) return RARITY.SILVER;
  const share = sparks / max;
  if (share >= LEGENDARY_SHARE) return RARITY.LEGENDARY;
  if (share >= GOLD_SHARE) return RARITY.GOLD;
  return RARITY.SILVER;
}
