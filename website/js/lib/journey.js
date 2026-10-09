// Where Daxter stands on the map, derived purely from saved progress.

const isDone = (story, progress) => Boolean(progress.cards[story.card.id]);

export function currentHouseIndex(stories, progress) {
  const next = stories.findIndex((story) => story.comingSoon || !isDone(story, progress));
  return next === -1 ? stories.length - 1 : next;
}

export function houseStatus(stories, progress, index) {
  const story = stories[index];
  if (isDone(story, progress)) return "done";
  if (story.comingSoon) return "soon";
  return index === currentHouseIndex(stories, progress) ? "current" : "locked";
}

// Index of the house stop within `radius` of the given road distance, or -1.
export function nearestStop(distance, stops, radius) {
  let best = -1;
  stops.forEach((stop, i) => {
    if (Math.abs(stop - distance) <= radius && (best === -1 || Math.abs(stop - distance) < Math.abs(stops[best] - distance))) best = i;
  });
  return best;
}

export const clampRoad = (distance, min, max) => Math.min(max, Math.max(min, distance));
