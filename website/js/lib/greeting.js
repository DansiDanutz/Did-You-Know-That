// Which greeting Daxter speaks when the game opens: a welcome the very first
// time, then one of the "welcome back" lines in turn, so he never repeats.

export const BACK_LINES = 3;

export function greetingKey(visits) {
  if (!Number.isInteger(visits) || visits <= 0) return "welcome";
  return `back${((visits - 1) % BACK_LINES) + 1}`;
}

export const greetingAudioPath = (lang, key) => `assets/voice/daxter/${lang}/${key}.mp3`;
