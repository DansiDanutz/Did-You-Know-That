// Minimal WebVTT reader for the localized subtitles (/assets/captions/<episode>/<lang>.vtt).
// Cue text comes back as plain text: callers must insert it with textContent, never innerHTML.

const TIMING = /^\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s+-->\s+(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;
const TAG = /<\/?[a-zA-Z][^>]*>/g;
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&quot;": '"' };

const seconds = (hours, minutes, secs, millis) =>
  Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(secs) + Number(millis.padEnd(3, "0")) / 1000;

const plain = (text) => text.replace(TAG, "").replace(/&(?:amp|lt|gt|nbsp|quot);/g, (entity) => ENTITIES[entity]);

/**
 * WebVTT text → cues [{ start, end, text }] in seconds, sorted by start. Tolerates a BOM, CRLF/CR line
 * ends, cue ids, optional hours, cue settings and multi-line cues (joined with "\n"). NOTE, STYLE and
 * REGION blocks and cues without a valid timing line are skipped.
 */
export function parseVtt(text) {
  const blocks = String(text ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => TIMING.test(line));
    if (at < 0 || at > 1) continue;
    const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = lines[at].match(TIMING);
    const start = seconds(h1, m1, s1, ms1);
    const end = seconds(h2, m2, s2, ms2);
    const cueText = plain(lines.slice(at + 1).join("\n")).trim();
    if (end > start && cueText) cues.push({ start, end, text: cueText });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * The text showing at time `t` (seconds), or "" in a gap. Binary search for the last cue that has
 * started; with overlapping cues the latest-starting one wins.
 */
export function cueAt(cues, t) {
  let low = 0;
  let high = cues.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (cues[mid].start <= t) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found >= 0 && t < cues[found].end ? cues[found].text : "";
}
