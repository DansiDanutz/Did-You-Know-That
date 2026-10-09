"""Synthesize the intro and outro soundtracks for "Did You Know That?".

Everything is generated procedurally with numpy (no samples, no paid services),
so the output is royalty-free and reproducible: the RNG is seeded.

Usage: python3 tools/make_audio.py <out_dir>
Writes intro.wav (7 s), outro.wav (15 s) and neon-kids/neon-adults.wav (8 s), 48 kHz stereo 16-bit.
"""

import sys
import wave
from pathlib import Path

import numpy as np

SR = 48_000
INTRO_SECONDS = 7.0
OUTRO_SECONDS = 15.0
RNG = np.random.default_rng(2026)


def silence(seconds):
    return np.zeros(int(seconds * SR))


def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def note_hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def place(track, clip, at_seconds, gain=1.0):
    """Return a new track with `clip` mixed in at `at_seconds`."""
    start = int(at_seconds * SR)
    end = min(len(track), start + len(clip))
    out = track.copy()
    out[start:end] += clip[: end - start] * gain
    return out


def one_pole_lowpass(signal, cutoff_hz):
    """Simple 1-pole low-pass; cutoff may be a scalar or a per-sample array."""
    cutoff = np.broadcast_to(np.asarray(cutoff_hz, dtype=float), signal.shape)
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(signal)
    acc = 0.0
    for i, (x, a) in enumerate(zip(signal, alpha)):
        acc += a * (x - acc)
        out[i] = acc
    return out


def fft_lowpass(signal, cutoff_hz):
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / SR)
    rolloff = 1 / (1 + (freqs / cutoff_hz) ** 4)
    return np.fft.irfft(spectrum * rolloff, len(signal))


def fft_bandpass(signal, low_hz, high_hz):
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / SR)
    mask = 1 / (1 + (low_hz / np.maximum(freqs, 1)) ** 4) / (1 + (freqs / high_hz) ** 4)
    return np.fft.irfft(spectrum * mask, len(signal))


def reverb(signal, seconds=2.2, wet=0.35, brightness=6000):
    """Convolution reverb with a decaying-noise impulse response (stereo)."""
    n = int(seconds * SR)
    decay = np.exp(-6.0 * np.arange(n) / n)
    channels = []
    for _ in range(2):
        ir = fft_lowpass(RNG.standard_normal(n), brightness) * decay
        ir /= np.sqrt(np.sum(ir**2))
        size = len(signal) + n
        wet_sig = np.fft.irfft(np.fft.rfft(signal, size) * np.fft.rfft(ir, size), size)
        channels.append(signal * (1 - wet) + wet_sig[: len(signal)] * wet * 0.6)
    return np.stack(channels, axis=1)


def envelope(n, attack, release, curve=4.0):
    t = np.arange(n) / SR
    env = np.minimum(1.0, t / max(attack, 1e-4))
    tail = np.clip((n / SR - t) / max(release, 1e-4), 0, 1)
    return env * tail**curve


# ---------------------------------------------------------------- sound atoms


def riser(seconds):
    t = t_axis(seconds)
    progress = t / seconds
    noise = RNG.standard_normal(len(t))
    swept = one_pole_lowpass(noise, 300 + 9000 * progress**2.5)
    sweep_hz = 120 + 900 * progress**2
    tone = np.sin(2 * np.pi * np.cumsum(sweep_hz) / SR) * 0.25
    return (swept * 0.8 + tone) * progress**2.2


def impact(seconds=2.5):
    t = t_axis(seconds)
    pitch = 38 + 70 * np.exp(-t * 14)
    boom = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-t * 2.4)
    crack = fft_lowpass(RNG.standard_normal(len(t)), 3500) * np.exp(-t * 28)
    return boom * 1.1 + crack * 0.5


def whoosh(seconds=0.55, center=2500):
    n = int(seconds * SR)
    noise = fft_bandpass(RNG.standard_normal(n), center * 0.4, center * 1.8)
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** 2.5
    return noise * shape * 1.4


def bell(midi, seconds=3.0):
    """Inharmonic bell/chime partials: the 'lightbulb moment' sound."""
    t = t_axis(seconds)
    base = note_hz(midi)
    partials = [(1.0, 1.0, 1.6), (2.0, 0.55, 2.4), (2.76, 0.35, 3.2), (5.4, 0.18, 5.0), (8.9, 0.08, 7.0)]
    tone = sum(a * np.sin(2 * np.pi * base * r * t) * np.exp(-t * d) for r, a, d in partials)
    return tone * np.minimum(1, t / 0.003)


def pluck(midi, seconds=0.9):
    t = t_axis(seconds)
    hz = note_hz(midi)
    tone = np.sin(2 * np.pi * hz * t) + 0.35 * np.sin(4 * np.pi * hz * t) + 0.12 * np.sin(6 * np.pi * hz * t)
    return tone * np.exp(-t * 5.5) * np.minimum(1, t / 0.004)


def pad(midis, seconds, attack=0.8, release=1.5, cutoff=1800):
    """Warm detuned-saw chord pad."""
    t = t_axis(seconds)
    voices = []
    for m in midis:
        for detune in (-0.08, 0.0, 0.08):
            hz = note_hz(m + detune)
            phase = (hz * t + RNG.random()) % 1.0
            voices.append(2 * phase - 1)
    chord = fft_lowpass(np.sum(voices, axis=0) / len(voices), cutoff)
    return chord * envelope(len(t), attack, release, curve=1.5)


def kick(seconds=0.35):
    t = t_axis(seconds)
    pitch = 45 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-t * 9)


def shimmer(seconds=2.0):
    """Rising cascade of tiny sparkle tones."""
    out = silence(seconds)
    notes = [84, 88, 91, 96, 100, 103, 108]
    for i, m in enumerate(notes):
        out = place(out, bell(m, 0.9) * 0.4, i * seconds / (len(notes) + 2))
    return out


# ---------------------------------------------------------------- arrangements

# C major brand chord: C - E - G - B (maj7) for a bright, curious feel.
BRAND_CHORD = [48, 55, 60, 64, 67, 71]


def build_intro():
    dry = silence(INTRO_SECONDS)
    dry = place(dry, riser(1.5), 0.0, 0.55)
    dry = place(dry, impact(), 1.45, 0.9)  # bulb lands
    dry = place(dry, whoosh(0.45, 1800), 1.75, 0.45)  # "DID YOU"
    dry = place(dry, whoosh(0.45, 2600), 2.05, 0.45)  # "KNOW THAT?"
    dry = place(dry, kick(), 2.35, 0.7)
    for midi, offset in ((72, 0.0), (79, 0.06), (84, 0.12)):  # lightbulb "ding"
        dry = place(dry, bell(midi), 2.4 + offset, 0.32)
    dry = place(dry, pad(BRAND_CHORD, 5.4, attack=0.6, release=1.4), 1.5, 0.5)
    for i, m in enumerate([72, 76, 79, 83, 84, 83, 79, 76]):  # tagline arpeggio
        dry = place(dry, pluck(m), 3.0 + i * 0.18, 0.22)
    dry = place(dry, shimmer(1.8), 4.6, 0.5)
    dry = place(dry, riser(0.9)[::-1] * 0.0 + whoosh(0.9, 3200), 5.8, 0.55)
    dry = place(dry, impact(1.2), 6.55, 0.35)
    return finish(reverb(dry, 2.4, 0.38), fade_out=0.35)


def build_outro():
    dry = silence(OUTRO_SECONDS)
    dry = place(dry, whoosh(0.7, 2200), 0.0, 0.5)
    dry = place(dry, impact(1.5), 0.55, 0.5)
    bar = 2.0  # 120 bpm, 4/4
    progression = [  # I - V - vi - IV in C
        [48, 60, 64, 67, 71],
        [43, 59, 62, 67, 74],
        [45, 60, 64, 69, 72],
        [41, 57, 60, 65, 69],
    ]
    arp_pattern = [0, 2, 3, 4, 3, 2, 1, 2]
    for bar_index in range(int(OUTRO_SECONDS / bar)):
        start = 0.5 + bar_index * bar
        chord = progression[bar_index % len(progression)]
        dry = place(dry, pad(chord, bar + 0.6, attack=0.4, release=0.8, cutoff=1500), start, 0.42)
        for step, idx in enumerate(arp_pattern):
            dry = place(dry, pluck(chord[idx] + 12, 0.6), start + step * bar / 8, 0.13)
        for beat in range(4):
            dry = place(dry, kick(), start + beat * bar / 4, 0.35 if beat % 2 == 0 else 0.2)
    dry = place(dry, shimmer(2.0), 1.0, 0.4)
    return finish(reverb(dry, 2.0, 0.3), fade_out=2.5)


NEON_SECONDS = 8.0


def neon_buzz(seconds):
    """Electric hum of a neon tube flickering on (adults card)."""
    t = t_axis(seconds)
    hum = np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t) + 0.25 * np.sin(2 * np.pi * 300 * t)
    flicker = (RNG.random(len(t)) > 0.15).astype(float)
    flicker = fft_lowpass(flicker, 40)
    return hum * flicker * 0.3


def build_neon_kids():
    dry = silence(NEON_SECONDS)
    dry = place(dry, whoosh(0.8, 2200), 0.05, 0.5)
    dry = place(dry, shimmer(1.6), 0.7, 0.7)
    for i, m in enumerate([72, 76, 79, 84, 88]):  # power-up arpeggio as letters light up
        dry = place(dry, pluck(m, 0.7), 1.5 + i * 0.12, 0.35)
    for midi, offset in ((84, 0.0), (91, 0.05), (96, 0.1)):
        dry = place(dry, bell(midi, 2.5), 2.3 + offset, 0.3)
    dry = place(dry, pad([60, 64, 67, 71, 76], 5.2, attack=0.8, release=1.6, cutoff=2400), 2.4, 0.35)
    dry = place(dry, whoosh(0.6, 3000), 7.3, 0.4)
    return finish(reverb(dry, 2.6, 0.4), fade_out=0.5)


def build_neon_adults():
    dry = silence(NEON_SECONDS)
    dry = place(dry, whoosh(0.9, 1400), 0.0, 0.45)
    dry = place(dry, neon_buzz(1.0), 0.7, 0.8)
    dry = place(dry, impact(2.5), 1.45, 0.9)  # sub-bass hit as the word lands
    for i, m in enumerate([60, 63, 67, 70, 72, 75]):
        dry = place(dry, pluck(m, 0.5) * 0.8, 1.5 + i * 0.12, 0.25)
    dry = place(dry, pad([36, 48, 55, 60, 63], 5.0, attack=1.0, release=1.8, cutoff=1200), 2.4, 0.45)
    dry = place(dry, neon_buzz(5.0) * 0.25, 2.4, 0.3)
    dry = place(dry, whoosh(0.7, 2000), 7.2, 0.4)
    return finish(reverb(dry, 2.2, 0.32), fade_out=0.5)


def finish(stereo, fade_out):
    n = len(stereo)
    fade = np.ones(n)
    k = int(fade_out * SR)
    fade[-k:] = np.linspace(1, 0, k) ** 2
    fade[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
    out = stereo * fade[:, None]
    peak = np.max(np.abs(out))
    return out / peak * 0.89 if peak > 0 else out  # ~ -1 dBFS peak


def write_wav(path, stereo):
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: make_audio.py <out_dir>")
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    write_wav(out_dir / "intro.wav", build_intro())
    write_wav(out_dir / "outro.wav", build_outro())
    write_wav(out_dir / "neon-kids.wav", build_neon_kids())
    write_wav(out_dir / "neon-adults.wav", build_neon_adults())
    print(f"wrote {out_dir / 'intro.wav'} and {out_dir / 'outro.wav'}")


if __name__ == "__main__":
    main()
