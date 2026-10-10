// Neon dust drifting upward behind the hero (the channel banner's atmosphere, in motion).
// Pauses off-screen and in background tabs; draws one still frame for reduced motion.
import { prefersReducedMotion } from "../lib/catalog-client.js";

const COLORS = ["#ff9a1f", "#ff3db4", "#8b5cf6", "#3b82f6", "#22d3ee", "#34d058"];
const DENSITY = 1 / 14000; // particles per CSS pixel²
const MAX_PARTICLES = 110;
const MAX_DPR = 2;

const seeded = (n) => {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

function makeParticles(count, width, height) {
  return Array.from({ length: count }, (_, i) => ({
    x: seeded(i + 200) * width,
    y: seeded(i + 300) * height,
    size: 0.8 + seeded(i + 400) * 2.2,
    speed: 0.12 + seeded(i + 500) * 0.35,
    phase: seeded(i + 600) * Math.PI * 2,
    color: COLORS[i % COLORS.length],
  }));
}

export function init() {
  const canvas = document.querySelector("[data-dust]");
  const context = canvas?.getContext("2d");
  if (!context) return;

  let particles = [];
  let size = { width: 0, height: 0 };
  let frame = 0;
  let running = false;
  let visible = true;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    size = { width: canvas.clientWidth, height: canvas.clientHeight };
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = makeParticles(Math.min(MAX_PARTICLES, Math.round(size.width * size.height * DENSITY)), size.width, size.height);
  };

  const draw = (t) => {
    context.clearRect(0, 0, size.width, size.height);
    for (const p of particles) {
      const y = (((p.y - t * p.speed * 0.06) % size.height) + size.height) % size.height;
      const x = p.x + Math.sin(t / 2400 + p.phase) * 14;
      context.globalAlpha = 0.35 + 0.35 * Math.sin(t / 700 + p.phase);
      context.fillStyle = p.color;
      context.shadowColor = p.color;
      context.shadowBlur = p.size * 4;
      context.beginPath();
      context.arc(x, y, p.size, 0, Math.PI * 2);
      context.fill();
    }
  };

  const loop = (t) => {
    draw(t);
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
