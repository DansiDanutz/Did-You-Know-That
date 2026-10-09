// Daily video rules. Kids may start 3 new episode videos a day, adults 5.
// The order of today's videos sets the card rarity (a ladder from silver to
// legendary) so players are rewarded for watching them all. Re-watching an
// episode already counted today is free and keeps its rung.

export const DAILY_VIDEOS = Object.freeze({ kids: 3, adults: 5 });

export const RARITY_LADDER = Object.freeze({
  kids: Object.freeze(["silver", "gold", "legendary"]),
  adults: Object.freeze(["silver", "silver", "gold", "gold", "legendary"]),
});

export function emptyDays() {
  return { kids: { day: "", stories: [] }, adults: { day: "", stories: [] } };
}

export function todayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function watchedToday(days, day, audience) {
  const record = days?.[audience];
  return record?.day === day && Array.isArray(record.stories) ? record.stories : [];
}

export function videosLeft(days, day, audience) {
  return Math.max(0, DAILY_VIDEOS[audience] - watchedToday(days, day, audience).length);
}

export function canWatch(days, day, storyId, audience) {
  const today = watchedToday(days, day, audience);
  return today.includes(storyId) || today.length < DAILY_VIDEOS[audience];
}

export function registerVideo(days, day, storyId, audience) {
  const today = watchedToday(days, day, audience);
  if (today.includes(storyId) || today.length >= DAILY_VIDEOS[audience]) return days;
  return { ...emptyDays(), ...days, [audience]: { day, stories: [...today, storyId] } };
}

// The rung this story occupies today (or the next free rung if not yet counted).
export function slotFor(days, day, storyId, audience) {
  const today = watchedToday(days, day, audience);
  const index = today.indexOf(storyId);
  return Math.min(index === -1 ? today.length : index, DAILY_VIDEOS[audience] - 1);
}

export function rarityForSlot(days, day, storyId, audience) {
  return RARITY_LADDER[audience][slotFor(days, day, storyId, audience)];
}
