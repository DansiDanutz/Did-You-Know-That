// A vertical object (tree, post) on flat ground, lit by a point light.
// Light travels in straight lines: the ray from the light past the top of the
// object meets the ground at the shadow's tip. Ground is y = 0, up is +y.
// Pure geometry for the "Missing Shadow" mission (claims: shadow mission ledger).

export function castShadow(object, light, { maxLength = 2000 } = {}) {
  const { x: ox, height: h } = object;
  const away = Math.sign(ox - light.x) || 0;
  let length;
  if (light.y <= h) length = maxLength; // light at or below the top: shadow runs off the scene
  else length = Math.min(maxLength, Math.abs(ox - light.x) * (h / (light.y - h)));
  return { base: ox, tip: ox + away * length, length };
}

// True when the shade on the ground fully covers a span (e.g. a picnic blanket).
export function covers(shadow, { from, to }) {
  const lo = Math.min(shadow.base, shadow.tip);
  const hi = Math.max(shadow.base, shadow.tip);
  return Math.min(from, to) >= lo && Math.max(from, to) <= hi;
}
