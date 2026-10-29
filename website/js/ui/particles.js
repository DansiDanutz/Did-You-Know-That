// The hero's 3D particle scene (WebGL, no dependencies), drawn over the channel banner with screen blending:
//   - a neon vortex of particles orbits the banner's question-mark bulb, tilted in 3D, with spiral arms;
//   - a field of far stars drifts upward behind it;
//   - every CYCLE_MS, part of the vortex streams across the banner and builds a slowly turning 3D "?" on the right,
//     holds it, then bursts back into the swirl (the series' mystery, in motion). Phones skip the "?" (no room).
// The pointer tilts the scene a little. Pauses off-screen and in background tabs; reduced motion draws one still
// frame; without WebGL the canvas stays empty and the 2D dust behind the banner (hero.js) carries the hero.
import { prefersReducedMotion } from "../lib/catalog-client.js";

const COLORS = [[1, 0.6, 0.12], [1, 0.24, 0.71], [0.55, 0.36, 0.96], [0.23, 0.51, 0.96], [0.13, 0.83, 0.93], [0.2, 0.82, 0.35]];
const MAX_DPR = 2;
const COUNT = { wide: 2600, narrow: 1100 };
const STAR_SHARE = 0.3; // seed.w below this = far star
const SHAPE_SHARE = 0.38; // seed.w in [STAR_SHARE, STAR_SHARE + SHAPE_SHARE) = builds the "?"
const CYCLE_MS = 14000;
// where the bulb and the "?" sit, as fractions of the banner image (wide crop / phone crop)
const FOCUS = { wide: { a: [0.29, 0.52], b: [0.88, 0.48] }, narrow: { a: [0.12, 0.48], b: null } };

const VERTEX = `
attribute vec4 aSeed; attribute vec3 aShape; attribute vec3 aColor;
uniform float uTime, uMorph, uBurst, uScale, uDpr; uniform vec2 uRes, uA, uB, uTilt;
varying vec3 vColor; varying float vAlpha;
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
void main() {
  vColor = aColor;
  float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed.z * 2.0) + aSeed.y * 40.0);
  if (aSeed.w < ${STAR_SHARE}) {
    vec2 p = vec2(aSeed.x * uRes.x, mod(aSeed.y * uRes.y - uTime * (6.0 + 22.0 * aSeed.z), uRes.y));
    p += uTilt * 26.0 * aSeed.z;
    gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0); gl_Position.y *= -1.0;
    gl_PointSize = (1.2 + 2.6 * aSeed.z) * uDpr;
    vAlpha = 0.35 + 0.55 * twinkle * aSeed.z;
    return;
  }
  float r = 0.22 + 1.55 * pow(aSeed.x, 1.5);
  float arm = floor(aSeed.z * 3.0) * 2.0944;
  float ang = aSeed.y * 0.9 + arm + r * 1.4 + uTime * 0.32 / (0.35 + r);
  vec3 swirl = vec3(cos(ang) * r, (aSeed.z - 0.5) * 0.22 * (1.0 + r) + 0.03 * sin(uTime * 0.7 + aSeed.y * 30.0), sin(ang) * r);
  swirl = rotX(swirl, 1.12 + uTilt.y * 0.12);
  swirl = rotY(swirl, uTilt.x * 0.25);
  bool builds = aSeed.w < ${STAR_SHARE + SHAPE_SHARE} && uB.x >= 0.0;
  float m = builds ? smoothstep(aSeed.x * 0.35, aSeed.x * 0.35 + 0.65, uMorph) : 0.0;
  vec3 shape = rotY(aShape, sin(uTime * 0.7) * 0.55 + uTilt.x * 0.3); // sways, never edge-on, so it always reads as a "?"
  shape += normalize(aShape + vec3(0.001)) * uBurst * (0.6 + aSeed.y);
  vec3 p = mix(swirl, shape, m);
  float persp = 4.0 / (4.0 - p.z);
  vec2 centre = mix(uA, uB, m);
  centre.y -= sin(m * 3.14159) * uScale * 0.35;
  vec2 screen = centre + vec2(p.x, -p.y) * persp * uScale;
  gl_Position = vec4(screen / uRes * 2.0 - 1.0, 0.0, 1.0); gl_Position.y *= -1.0;
  float bokeh = step(0.94, fract(aSeed.y * 13.7)); // ~6 %: big soft sparks
  gl_PointSize = mix(2.6 + 6.0 * aSeed.z, 16.0 + 22.0 * aSeed.z, bokeh) * persp * uDpr * clamp(uScale / 200.0, 0.6, 1.5) * (1.0 + 0.4 * m);
  vAlpha = (0.5 + 0.5 * twinkle) * (0.6 + 0.4 * persp) * mix(1.0, 0.35, bokeh) * (1.0 + 0.5 * m);
}`;
const FRAGMENT = `
precision mediump float; varying vec3 vColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float halo = exp(-d * d * 14.0), core = exp(-d * d * 90.0);
  float a = (halo * 0.75 + core) * vAlpha;
  gl_FragColor = vec4((vColor + core * 0.6) * a, a); // a white-hot core inside a coloured halo
}`;

const seeded = (n) => {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** A point on a 3D question mark (hook arc, neck, stem, dot), about 2 units tall, centred on 0. */
function questionPoint(i) {
  const t = seeded(i + 7000);
  const jitter = [(seeded(i + 7100) - 0.5) * 0.12, (seeded(i + 7200) - 0.5) * 0.12, (seeded(i + 7300) - 0.5) * 0.22];
  let x;
  let y;
  if (t < 0.6) {
    const a = Math.PI * (1.05 - (t / 0.6) * 1.45); // from the left, over the top, down the right
    x = Math.cos(a) * 0.5;
    y = 0.42 + Math.sin(a) * 0.5;
  } else if (t < 0.78) {
    const k = (t - 0.6) / 0.18; // neck: curl back to the middle
    x = 0.3 * (1 - k);
    y = 0.02 - k * 0.2;
  } else if (t < 0.9) {
    x = 0;
    y = -0.18 - ((t - 0.78) / 0.12) * 0.25;
  } else {
    const a = seeded(i + 7400) * Math.PI * 2;
    const rr = Math.sqrt(seeded(i + 7500)) * 0.1;
    x = Math.cos(a) * rr;
    y = -0.72 + Math.sin(a) * rr;
  }
  return [x + jitter[0], y + jitter[1], jitter[2]];
}

function buildBuffers(gl, program, count) {
  const seeds = new Float32Array(count * 4);
  const shapes = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) seeds[i * 4 + k] = seeded(i * 4 + k + 1);
    shapes.set(questionPoint(i), i * 3);
    colors.set(COLORS[i % COLORS.length], i * 3);
  }
  for (const [name, data, size] of [["aSeed", seeds, 4], ["aShape", shapes, 3], ["aColor", colors, 3]]) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }
}

function compile(gl) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`hero particles: ${gl.getShaderInfoLog(shader)}`);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`hero particles: ${gl.getProgramInfoLog(program)}`);
  return program;
}

const smooth = (x) => x * x * (3 - 2 * x);
/** The "?" timeline: swirl, stream over, hold, burst. Returns { morph, burst } for a time in the cycle. */
export function morphAt(ms) {
  const t = (ms % CYCLE_MS) / 1000;
  if (t < 8) return { morph: 0, burst: 0 };
  if (t < 10) return { morph: smooth((t - 8) / 2), burst: 0 };
  if (t < 12.5) return { morph: 1, burst: 0 };
  if (t < 13.3) { const k = (t - 12.5) / 0.8; return { morph: 1 - smooth(k), burst: Math.sin(k * Math.PI) }; }
  return { morph: 0, burst: 0 };
}

export function init() {
  const canvas = document.querySelector("[data-particles]");
  const banner = document.querySelector(".hero-banner-img");
  const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl || !banner) return;
  let program;
  try {
    program = compile(gl);
  } catch (error) {
    console.error(error);
    return;
  }
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  const u = Object.fromEntries(["uTime", "uMorph", "uBurst", "uScale", "uDpr", "uRes", "uA", "uB", "uTilt"].map((n) => [n, gl.getUniformLocation(program, n)]));

  let count = 0;
  let layout = null;
  let tilt = [0, 0];
  let tiltTarget = [0, 0];
  let running = false;
  let visible = true;
  let frame = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const box = canvas.getBoundingClientRect();
    const img = banner.getBoundingClientRect();
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const narrow = box.width < 640;
    const focus = narrow ? FOCUS.narrow : FOCUS.wide;
    const at = ([fx, fy]) => [(img.left - box.left + fx * img.width) * dpr, (img.top - box.top + fy * img.height) * dpr];
    const want = narrow ? COUNT.narrow : COUNT.wide;
    if (want !== count) {
      count = want;
      buildBuffers(gl, program, count);
    }
    layout = { dpr, a: at(focus.a), b: focus.b ? at(focus.b) : [-1, -1], scale: img.height * dpr * 0.55 };
  };

  const draw = (ms) => {
    tilt = tilt.map((v, i) => v + (tiltTarget[i] - v) * 0.04);
    const { morph, burst } = morphAt(ms);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.uTime, ms / 1000);
    gl.uniform1f(u.uMorph, morph);
    gl.uniform1f(u.uBurst, burst);
    gl.uniform1f(u.uScale, layout.scale);
    gl.uniform1f(u.uDpr, layout.dpr);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uA, ...layout.a);
    gl.uniform2f(u.uB, ...layout.b);
    gl.uniform2f(u.uTilt, ...tilt);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  const loop = (ms) => {
    draw(ms);
    frame = running ? requestAnimationFrame(loop) : 0;
  };
  const update = () => {
    const shouldRun = visible && !document.hidden && !prefersReducedMotion();
    if (shouldRun && !running) {
      running = true;
      frame = requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frame);
    }
  };

  window.addEventListener("pointermove", (event) => {
    tiltTarget = [(event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1];
  }, { passive: true });
  resize();
  draw(0);
  new ResizeObserver(() => {
    resize();
    draw(performance.now());
  }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(canvas);
  document.addEventListener("visibilitychange", update);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", update);
  update();
}
