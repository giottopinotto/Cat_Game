import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';

// Fuochi d'artificio a forma di zampetta (per i festeggiamenti).

const COLORS = ['#ffd45c', '#ff5d8f', '#5ff0d9', '#ffffff', '#ffb347'];

interface Spark {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vy: number;
  life: number;
  color: string;
}

/** Punti di una zampetta (cuscinetto + 4 dita), centrata in 0,0 e grande circa 1. */
function pawPoints(): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    pts.push([Math.cos(a) * 0.46, 0.34 + Math.sin(a) * 0.36]);
  }
  for (const [cx, cy] of [[-0.58, -0.12], [-0.22, -0.5], [0.22, -0.5], [0.58, -0.12]]) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * 0.15, cy + Math.sin(a) * 0.2]);
    }
  }
  return pts;
}

const PAW = pawPoints();

export function Fireworks({ bursts = 5, accent = true, front = false }: { bursts?: number; accent?: boolean; front?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fx = useGame((s) => s.player.settings.fx);
  useEffect(() => {
    const c = ref.current;
    if (!c || !fx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const g = c.getContext('2d');
    if (!g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const colors = accent && primary ? [primary, ...COLORS] : COLORS;
    const sparks: Spark[] = [];
    let fired = 0;
    const fire = () => {
      const cx = w * (0.2 + Math.random() * 0.6);
      const cy = h * (0.15 + Math.random() * 0.35);
      const size = 70 + Math.random() * 50;
      const color = colors[fired % colors.length];
      const rot = (Math.random() - 0.5) * 0.6;
      for (const [px, py] of PAW) {
        const x = px * Math.cos(rot) - py * Math.sin(rot);
        const y = px * Math.sin(rot) + py * Math.cos(rot);
        sparks.push({ x: cx, y: cy, tx: cx + x * size, ty: cy + y * size, vy: 0, life: 1, color });
      }
      fired++;
    };
    fire();
    const timer = setInterval(() => (fired < bursts ? fire() : clearInterval(timer)), 550);
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.clearRect(0, 0, w, h);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        // Prima si apre verso la forma della zampetta, poi cade piano e sfuma.
        s.x += (s.tx - s.x) * Math.min(1, dt * 7);
        s.y += (s.ty - s.y) * Math.min(1, dt * 7) + s.vy * dt;
        s.ty += 14 * dt;
        s.vy += 30 * dt;
        s.life -= dt * 0.55;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        g.globalAlpha = Math.min(1, s.life * 1.6);
        g.fillStyle = s.color;
        g.shadowColor = s.color;
        g.shadowBlur = 8;
        g.beginPath();
        g.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
        g.fill();
      }
      if (sparks.length || fired < bursts) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, [fx, bursts, accent]);
  return <canvas ref={ref} className={`fireworks ${front ? 'front' : ''}`} aria-hidden />;
}
