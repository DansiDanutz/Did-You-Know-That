"""Music bed + sound effects for an episode video project.

Reads <project>/timeline.json (written by the project's build.mjs) and writes
<project>/assets/bed.wav: a procedural, royalty-free bed whose mood follows each
scene, ducked under the narration, with a sound effect on every cue.

Usage: python3 tools/make_bed.py video/ep01-kids
"""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from make_audio import (  # noqa: E402
    SR, RNG, bell, finish, fft_bandpass, impact, kick, pad, place, pluck, shimmer, silence, t_axis, whoosh, write_wav, note_hz,
)

BED_GAIN = 0.55
DUCKED_GAIN = 0.2
DUCK_RAMP_S = 0.2
SFX_GAIN = 0.55

# mood → (bpm, bars of chords as MIDI note lists, arpeggio pattern, kick every n beats, kind)
# kind "chip" = bright game bed; "soft" = pads and plucks only (adults, lullaby).
MOODS = {
    "play": (120, [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 57, 60, 65]], [0, 1, 2, 3, 2, 1, 2, 3], 1, "chip"),
    "curious": (104, [[45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]], [0, 2, 1, 3, 0, 2, 1, 3], 2, "chip"),
    "warm": (96, [[41, 57, 60, 65], [36, 55, 60, 64], [38, 57, 62, 65], [43, 55, 59, 62]], [0, 1, 2, 1, 3, 2, 1, 0], 2, "chip"),
    "victory": (120, [[48, 60, 64, 67, 72], [53, 60, 65, 69, 72], [55, 62, 67, 71, 74], [48, 60, 64, 67, 72]], [0, 1, 2, 3, 4, 3, 2, 1], 1, "chip"),
    "lullaby": (72, [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]], [0, 2, 1, 3, 2, 1, 0, 2], 4, "soft"),
    "documentary": (76, [[45, 52, 57, 60], [41, 48, 55, 60], [43, 50, 55, 59], [38, 45, 50, 57]], [0, 1, 2, 1, 3, 2, 1, 2], 4, "soft"),
    "tension": (84, [[42, 49, 54, 57], [40, 47, 52, 56], [38, 45, 50, 54], [41, 48, 53, 56]], [0, 3, 1, 2, 0, 3, 1, 2], 2, "soft"),
    "resolve": (72, [[48, 55, 60, 64, 67], [53, 60, 65, 69], [50, 57, 62, 65], [48, 55, 60, 64, 67]], [0, 1, 2, 3, 2, 1, 0, 1], 4, "soft"),
}


def chip(midi, seconds=0.35):
    """Bright square-ish game blip."""
    t = t_axis(seconds)
    phase = (note_hz(midi) * t) % 1.0
    wave = np.where(phase < 0.5, 1.0, -1.0) * 0.6 + np.sin(2 * np.pi * note_hz(midi) * t) * 0.4
    return wave * np.exp(-t * 9) * np.minimum(1, t / 0.003)


def bass(midi, seconds):
    t = t_axis(seconds)
    return np.sin(2 * np.pi * note_hz(midi - 12) * t) * np.exp(-t * 2.5)


def music(mood, seconds):
    bpm, bars, pattern, kick_every, kind = MOODS[mood]
    beat = 60 / bpm
    bar = beat * 4
    out = silence(seconds + bar)
    for b in range(int(seconds / bar) + 1):
        chord = bars[b % len(bars)]
        start = b * bar
        if kind == "chip":
            out = place(out, pad(chord, bar + 0.4, attack=0.2, release=0.5, cutoff=1600), start, 0.22)
            out = place(out, bass(chord[0], bar), start, 0.35)
            for step, idx in enumerate(pattern):
                out = place(out, chip(chord[idx % len(chord)] + 12, beat * 0.9), start + step * beat / 2, 0.13)
            for k in range(0, 4, kick_every):
                out = place(out, kick(), start + k * beat, 0.35)
        else:
            out = place(out, pad(chord, bar + 1.2, attack=0.9, release=1.4, cutoff=1200), start, 0.26)
            out = place(out, bass(chord[0], bar), start, 0.18)
            for step, idx in enumerate(pattern[::2]):
                out = place(out, pluck(chord[idx % len(chord)] + 12, beat * 1.6), start + step * beat, 0.09)
    fade = np.ones(len(out))
    n = int(0.6 * SR)
    fade[:n] = np.linspace(0, 1, n)
    end = int(seconds * SR)
    fade[end - n:end] = np.linspace(1, 0, n)
    fade[end:] = 0
    return out[: int(seconds * SR)] * fade[: int(seconds * SR)]


def sfx_bank():
    t = lambda s: t_axis(s)  # noqa: E731
    boing_t = t(0.45)
    boing = np.sin(2 * np.pi * np.cumsum(180 + 420 * np.exp(-boing_t * 6) * np.abs(np.sin(boing_t * 30))) / SR) * np.exp(-boing_t * 5)
    deflate_t = t(0.9)
    deflate = np.sin(2 * np.pi * np.cumsum(520 - 380 * deflate_t / 0.9) / SR) * np.exp(-deflate_t * 2.5) * 0.7
    sad = np.concatenate([bell(64, 0.5) * 0.6, bell(60, 0.9) * 0.6])
    hoot = sum(np.sin(2 * np.pi * f * t(0.5)) for f in (420, 440)) * np.sin(np.pi * np.linspace(0, 1, int(0.5 * SR))) * 0.6
    hoot = np.concatenate([hoot, silence(0.12), hoot * 0.8])
    autoplay = np.concatenate([chip(84, 0.12), silence(0.05), chip(88, 0.12), silence(0.05), chip(91, 0.2)])
    tick = chip(96, 0.07) * 0.8
    click = np.concatenate([chip(72, 0.04), silence(0.03), chip(66, 0.06)])
    ring_t = t(0.9)
    ring = np.sin(2 * np.pi * 1760 * ring_t) * (np.sin(2 * np.pi * 18 * ring_t) > 0) * np.exp(-ring_t * 1.5) * 0.5
    page = fft_bandpass(RNG.standard_normal(int(0.35 * SR)), 1200, 6000) * np.exp(-t(0.35) * 9) * 0.5
    return {
        "coin": np.concatenate([chip(83, 0.08), chip(88, 0.4)]),
        "tap": chip(76, 0.12) * 0.9,
        "pop": np.concatenate([chip(79, 0.06), chip(91, 0.18)]) * 0.9,
        "whoosh": whoosh(0.6, 2400),
        "boing": boing,
        "deflate": deflate,
        "sad": sad,
        "ding": bell(91, 1.2) * 0.8,
        "chime": np.sum([place(silence(1.2), bell(m, 0.9) * 0.7, i * 0.12) for i, m in enumerate([79, 84, 88])], axis=0),
        "brass": pad([48, 55, 60, 64, 67], 1.2, attack=0.02, release=0.6, cutoff=3500) * 2.2,
        "autoplay": autoplay,
        "tick": tick,
        "click": click,
        "ring": ring,
        "page": page,
        "hoot": hoot,
        "victory": np.sum([place(silence(1.6), chip(m, 0.5), i * 0.12) for i, m in enumerate([72, 76, 79, 84, 88])], axis=0),
        "card": place(shimmer(1.2), whoosh(0.4, 3000), 0, 0.6),
        "fanfare": np.sum([place(silence(2.4), pad(c, 0.9, attack=0.02, release=0.4, cutoff=4000) * 1.6, i * 0.3) for i, c in enumerate([[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]])], axis=0),
        "low": impact(1.6) * 0.5,
        "sting": place(shimmer(1.6), bell(72, 1.4) * 0.6, 0.1, 0.8),
    }


def duck_envelope(total, vo):
    gain = np.full(int(total * SR), BED_GAIN)
    ramp = int(DUCK_RAMP_S * SR)
    for clip in vo:
        a, b = int(clip["start"] * SR), int((clip["start"] + clip["len"]) * SR)
        gain[a:b] = DUCKED_GAIN
        gain[max(0, a - ramp):a] = np.linspace(BED_GAIN, DUCKED_GAIN, a - max(0, a - ramp))
        gain[b:b + ramp] = np.linspace(DUCKED_GAIN, BED_GAIN, len(gain[b:b + ramp]))
    return gain


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: python3 tools/make_bed.py <project dir>")
    root = Path(sys.argv[1]).resolve()
    plan = json.loads((root / "timeline.json").read_text())
    total = plan["total"]
    bed = silence(total)
    for scene in plan["scenes"]:
        mood = plan["moods"].get(scene["id"])
        if mood:
            bed = place(bed, music(mood, scene["length"]), scene["start"], 1.0)
    bed = bed * duck_envelope(total, plan["vo"])
    bank = sfx_bank()
    for name, at in plan["sfx"]:
        bed = place(bed, bank[name], at, SFX_GAIN)
    stereo = np.stack([bed, bed], axis=1)
    out = finish(stereo, fade_out=0.5)
    write_wav(root / "assets" / "bed.wav", out)
    print(f"bed.wav {total:.1f}s, {len(plan['sfx'])} sfx, ducked under {len(plan['vo'])} narration clips")


if __name__ == "__main__":
    main()
