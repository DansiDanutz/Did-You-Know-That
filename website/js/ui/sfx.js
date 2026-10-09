// Tiny synthesized sound effects (Web Audio): no files to download.

const MUTE_KEY = "dykt-muted";

export function createSfx() {
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }

  const audio = () => {
    if (muted) return null;
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  function tone(freq, { at = 0, dur = 0.25, type = "sine", gain = 0.18, slideTo } = {}) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + at;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise({ dur = 0.3, gain = 0.15, from = 800, to = 3000 } = {}) {
    const ac = audio();
    if (!ac) return;
    const length = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / length);
    const src = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const amp = ac.createGain();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(from, ac.currentTime);
    filter.frequency.exponentialRampToValueAtTime(to, ac.currentTime + dur);
    amp.gain.value = gain;
    src.buffer = buffer;
    src.connect(filter).connect(amp).connect(ac.destination);
    src.start();
  }

  return {
    get muted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch {
        /* storage unavailable: keep the in-memory setting */
      }
      return muted;
    },
    flip: () => noise({ dur: 0.35, gain: 0.22, from: 600, to: 2600 }),
    step: () => tone(90, { dur: 0.09, type: "triangle", gain: 0.08, slideTo: 60 }),
    knock: () => [0, 0.16].forEach((at) => tone(140, { at, dur: 0.1, type: "square", gain: 0.06, slideTo: 90 })),
    coin: () => [988, 1319].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.18, type: "square", gain: 0.06 })),
    spark: () => [1320, 1760, 2640].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.3, gain: 0.09 })),
    right: () => [660, 990].forEach((f, i) => tone(f, { at: i * 0.1, dur: 0.3, type: "triangle", gain: 0.14 })),
    wrong: () => tone(180, { dur: 0.3, type: "sawtooth", gain: 0.06, slideTo: 120 }),
    seal: () => {
      noise({ dur: 0.5, gain: 0.25, from: 300, to: 900 });
      tone(220, { dur: 0.6, type: "triangle", gain: 0.12, slideTo: 110 });
    },
    unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.6, type: "triangle", gain: 0.12 })),
  };
}
