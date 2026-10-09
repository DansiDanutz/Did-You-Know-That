"""Music bed + sound effects for Episode 1 (Kids) "The Scroll Monster".

Reads video/ep01-kids/timeline.json (written by build.mjs) and writes
video/ep01-kids/assets/bed.wav: a chiptune-orchestral bed whose mood follows
each level, dipped under Brian's narration, with a sound effect on every beat.
Procedural and royalty-free (same building blocks as make_audio.py).

Usage: python3 tools/make_ep01_kids_audio.py
"""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from make_audio import (  # noqa: E402
    SR, RNG, bell, finish, fft_bandpass, impact, kick, pad, place, pluck, riser, shimmer, silence, t_axis, whoosh, write_wav, note_hz,
)

ROOT = Path(__file__).resolve().parent.parent / "video" / "ep01-kids"
BED_GAIN = 0.55
DUCKED_GAIN = 0.2
DUCK_RAMP_S = 0.2
SFX_GAIN = 0.55

# mood → (bpm, bars of chords as MIDI note lists, arpeggio pattern, kick every n beats)
MOODS = {
    "play": (120, [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 57, 60, 65]], [0, 1, 2, 3, 2, 1, 2, 3], 1),
    "villain": (100, [[45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]], [0, 2, 1, 3, 0, 2, 1, 2], 2),
    "battle": (140, [[38, 50, 53, 57], [34, 50, 53, 58], [36, 48, 52, 55], [33, 49, 52, 57]], [0, 1, 2, 3, 3, 2, 1, 2], 1),
    "warm": (96, [[41, 57, 60, 65], [36, 55, 60, 64], [38, 57, 62, 65], [43, 55, 59, 62]], [0, 1, 2, 3, 2, 3, 1, 2], 2),
    "victory": (120, [[48, 60, 64, 67, 72], [53, 60, 65, 69, 72], [55, 62, 67, 71, 74], [48, 60, 64, 67, 72]], [0, 2, 4, 2, 0, 2, 4, 3], 1),
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
    bpm, bars, pattern, kick_every = MOODS[mood]
    beat = 60 / bpm
    bar = beat * 4
    out = silence(seconds + bar)
    for b in range(int(seconds / bar) + 1):
        chord = bars[b % len(bars)]
        start = b * bar
        out = place(out, pad(chord, bar + 0.4, attack=0.2, release=0.5, cutoff=1600), start, 0.22)
        out = place(out, bass(chord[0], bar), start, 0.35)
        for step, idx in enumerate(pattern):
            out = place(out, chip(chord[idx % len(chord)] + 12, beat * 0.9), start + step * beat / 2, 0.13)
        for k in range(0, 4, kick_every):
            out = place(out, kick(), start + k * beat, 0.35)
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
    yoink_t = t(0.5)
    yoink = np.sin(2 * np.pi * np.cumsum(300 + 1500 * yoink_t ** 1.5) / SR) * np.exp(-yoink_t * 3)
    rumble = place(fft_bandpass(RNG.standard_normal(int(2.2 * SR)), 30, 180) * np.linspace(1, 0, int(2.2 * SR)) * 3, impact(2.2), 0, 0.8)
    hoot = sum(np.sin(2 * np.pi * f * t(0.5)) for f in (420, 440)) * np.sin(np.pi * np.linspace(0, 1, int(0.5 * SR))) * 0.6
    hoot = np.concatenate([hoot, silence(0.12), hoot * 0.8])
    autoplay = np.concatenate([chip(84, 0.12), silence(0.05), chip(88, 0.12), silence(0.05), chip(91, 0.2)])
    return {
        "coin": np.concatenate([chip(83, 0.08), chip(88, 0.4)]),
        "whoosh": whoosh(0.6, 2400),
        "levelup": np.sum([place(silence(1.0), chip(m, 0.4), i * 0.08) for i, m in enumerate([72, 76, 79, 84])], axis=0),
        "boing": boing,
        "ding": bell(91, 1.2) * 0.8,
        "brass": pad([48, 55, 60, 64, 67], 1.2, attack=0.02, release=0.6, cutoff=3500) * 2.2,
        "autoplay": autoplay,
        "rumble": rumble,
        "yoink": yoink,
        "victory": np.sum([place(silence(1.6), chip(m, 0.5), i * 0.12) for i, m in enumerate([72, 76, 79, 84, 88])], axis=0),
        "hoot": hoot,
        "card": place(shimmer(1.2), whoosh(0.4, 3000), 0, 0.6),
        "fanfare": np.sum([place(silence(2.4), pad(c, 0.9, attack=0.02, release=0.4, cutoff=4000) * 1.6, i * 0.3) for i, c in enumerate([[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]])], axis=0),
        "fireworks": np.sum([place(silence(2.5), impact(0.6) * 0.5 + fft_bandpass(RNG.standard_normal(int(0.6 * SR)), 2000, 9000) * np.exp(-t(0.6) * 6) * 0.6, i * 0.35) for i in range(5)], axis=0),
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
    plan = json.loads((ROOT / "timeline.json").read_text())
    total = plan["total"]
    bed = silence(total)
    for scene in plan["scenes"]:
        mood = plan["moods"].get(scene["id"])
        if mood:  # video clips (intro, neon card, end screen) carry their own sound
            bed = place(bed, music(mood, scene["length"]), scene["start"], 1.0)
    bed = bed * duck_envelope(total, plan["vo"])
    bank = sfx_bank()
    for name, at in plan["sfx"]:
        bed = place(bed, bank[name], at, SFX_GAIN)
    stereo = np.stack([bed, bed], axis=1)
    out = finish(stereo, fade_out=0.5)
    write_wav(ROOT / "assets" / "bed.wav", out)
    print(f"bed.wav {total:.1f}s, {len(plan['sfx'])} sfx, ducked under {len(plan['vo'])} narration clips")


if __name__ == "__main__":
    main()
