import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { getAccent } from '../ui/accents';
import { useTheme } from '../ui/theme';
import { dayPhase, particlesFor, skyColors, type Particle } from './ambient';

interface P {
  kind: Particle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  phase: number;
  color: string;
}

const LEAF = ['#e8913a', '#d9632b', '#f2c14e', '#b5542c', '#c97b2e'];
const PETAL = ['#ffc2d9', '#ffd6e6', '#fff0f6', '#ffb0cc'];
const COUNT: Record<Particle, number> = { leaf: 9, snow: 24, petal: 11, seed: 7, firefly: 12, paw: 7, bat: 3, star: 7 };

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function spawn(kind: Particle, w: number, h: number, accent: string, anywhere: boolean): P {
  const r = Math.random;
  const base: P = { kind, x: r() * w, y: anywhere ? r() * h : -20, vx: 0, vy: 0, size: 6, rot: r() * Math.PI * 2, vr: 0, phase: r() * 10, color: '#fff' };
  switch (kind) {
    case 'leaf':
      return { ...base, size: 6 + r() * 4, vy: 16 + r() * 14, vx: -6 + r() * 12, vr: -1 + r() * 2, color: LEAF[Math.floor(r() * LEAF.length)] };
    case 'snow':
      return { ...base, size: 1.2 + r() * 2.2, vy: 14 + r() * 20, vx: -4 + r() * 8 };
    case 'petal':
      return { ...base, size: 3.5 + r() * 3, vy: 14 + r() * 12, vx: 6 + r() * 10, vr: -1.5 + r() * 3, color: PETAL[Math.floor(r() * PETAL.length)] };
    case 'seed':
      return { ...base, y: anywhere ? r() * h : h + 20, size: 2 + r() * 2, vy: -(10 + r() * 12), vx: 6 + r() * 10 };
    case 'firefly':
      return { ...base, y: h * 0.25 + r() * h * 0.7, size: 2 + r() * 1.5, vx: -8 + r() * 16, vy: -8 + r() * 16, color: '#e8ff8a' };
    case 'paw':
      return { ...base, size: 8 + r() * 5, vy: 16 + r() * 12, vx: -4 + r() * 8, vr: -0.5 + r() * 1, color: accent };
    case 'bat':
      return { ...base, x: anywhere ? r() * w : -30, y: h * 0.12 + r() * h * 0.3, size: 7 + r() * 4, vx: 28 + r() * 20, vy: 0, color: '#3a2f5a' };
    case 'star':
      return { ...base, y: r() * h * 0.45, size: 4 + r() * 5, color: '#ffe07a' };
  }
}

function drawPaw(g: CanvasRenderingContext2D, s: number) {
  g.beginPath();
  g.ellipse(0, s * 0.35, s * 0.45, s * 0.38, 0, 0, Math.PI * 2);
  for (const [x, y] of [[-0.55, -0.1], [-0.2, -0.45], [0.2, -0.45], [0.55, -0.1]]) {
    g.moveTo(x * s + s * 0.17, y * s);
    g.ellipse(x * s, y * s, s * 0.17, s * 0.22, 0, 0, Math.PI * 2);
  }
  g.fill();
}

function draw(g: CanvasRenderingContext2D, p: P, t: number) {
  g.save();
  g.translate(p.x, p.y);
  switch (p.kind) {
    case 'leaf': {
      // Foglia che "gira" su se stessa cadendo: si schiaccia e si allarga.
      g.rotate(p.rot);
      g.scale(0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + p.phase)), 1);
      const s = p.size;
      const grd = g.createLinearGradient(0, -s, 0, s);
      grd.addColorStop(0, p.color);
      grd.addColorStop(1, 'rgba(120, 50, 10, 0.9)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, -s);
      g.bezierCurveTo(s * 0.75, -s * 0.55, s * 0.7, s * 0.45, 0, s);
      g.bezierCurveTo(-s * 0.7, s * 0.45, -s * 0.75, -s * 0.55, 0, -s);
      g.fill();
      g.strokeStyle = 'rgba(255, 240, 210, 0.55)';
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(0, -s * 0.8);
      g.lineTo(0, s * 1.25);
      g.stroke();
      break;
    }
    case 'snow':
      g.fillStyle = 'rgba(255, 255, 255, 0.92)';
      g.shadowColor = 'rgba(160, 180, 255, 0.8)';
      g.shadowBlur = 4;
      g.beginPath();
      g.arc(0, 0, p.size, 0, Math.PI * 2);
      g.fill();
      break;
    case 'petal': {
      // Petalo a cuore (come quelli del ciliegio).
      g.rotate(p.rot);
      g.scale(1, 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + p.phase)));
      const s = p.size;
      g.fillStyle = p.color;
      g.beginPath();
      g.moveTo(0, s);
      g.bezierCurveTo(s * 1.1, s * 0.2, s * 0.8, -s, s * 0.18, -s * 0.8);
      g.lineTo(0, -s * 0.45);
      g.lineTo(-s * 0.18, -s * 0.8);
      g.bezierCurveTo(-s * 0.8, -s, -s * 1.1, s * 0.2, 0, s);
      g.fill();
      break;
    }
    case 'seed':
      g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      g.lineWidth = 0.7;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.4;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * p.size * 2.2, Math.sin(a) * p.size * 2.2);
        g.stroke();
      }
      g.fillStyle = 'rgba(255, 255, 255, 0.95)';
      g.beginPath();
      g.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
      g.fill();
      break;
    case 'firefly': {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.8 + p.phase));
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, p.size * 5);
      grd.addColorStop(0, `rgba(232, 255, 138, ${a})`);
      grd.addColorStop(1, 'rgba(232, 255, 138, 0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(0, 0, p.size * 5, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'paw':
      g.rotate(p.rot);
      g.globalAlpha *= 0.55;
      g.fillStyle = p.color;
      drawPaw(g, p.size);
      break;
    case 'bat': {
      const flap = Math.sin(t * 14 + p.phase);
      g.fillStyle = p.color;
      g.globalAlpha *= 0.8;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-p.size * 0.6, -p.size * (0.2 + 0.5 * flap), -p.size * 1.3, -p.size * 0.1 * flap);
      g.quadraticCurveTo(-p.size * 0.7, p.size * 0.1, 0, p.size * 0.25);
      g.quadraticCurveTo(p.size * 0.7, p.size * 0.1, p.size * 1.3, -p.size * 0.1 * flap);
      g.quadraticCurveTo(p.size * 0.6, -p.size * (0.2 + 0.5 * flap), 0, 0);
      g.fill();
      break;
    }
    case 'star': {
      const a = 0.25 + 0.75 * Math.abs(Math.sin(t * 1.3 + p.phase));
      g.globalAlpha *= a;
      g.fillStyle = p.color;
      g.shadowColor = 'rgba(255, 220, 110, 0.9)';
      g.shadowBlur = 8;
      const s = p.size;
      g.beginPath();
      g.moveTo(0, -s);
      g.lineTo(s * 0.25, -s * 0.25);
      g.lineTo(s, 0);
      g.lineTo(s * 0.25, s * 0.25);
      g.lineTo(0, s);
      g.lineTo(-s * 0.25, s * 0.25);
      g.lineTo(-s, 0);
      g.lineTo(-s * 0.25, -s * 0.25);
      g.closePath();
      g.fill();
      break;
    }
  }
  g.restore();
}

/** Cielo colorato e particelle sopra la mappa (solo quando la mappa è visibile). */
export function Ambient({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fx = useGame((s) => s.player.settings.fx);
  const accentId = useTheme((s) => s.accent);
  const dark = useTheme((s) => s.dark);
  const [phase, setPhase] = useState(dayPhase());
  const accent = getAccent(accentId);
  const sky = skyColors(dark && phase === 'day' ? 'night' : phase, accent.h);

  useEffect(() => {
    const t = setInterval(() => setPhase(dayPhase()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !active || !fx || reducedMotion()) return;
    const g = c.getContext('2d');
    if (!g) return;
    const kinds = particlesFor();
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#9f7aea';
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const ps: P[] = kinds.flatMap((k) => Array.from({ length: Math.round(COUNT[k] / kinds.length) + (kinds.length > 1 ? 2 : 0) }, () => spawn(k, w, h, color, true)));
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      if (dt < 1 / 40) return; // circa 30 fotogrammi al secondo bastano (batteria)
      last = now;
      const t = now / 1000;
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const sway = p.kind === 'leaf' || p.kind === 'petal' || p.kind === 'snow' ? Math.sin(t * 1.2 + p.phase) * 18 : 0;
        if (p.kind === 'firefly') {
          p.vx += (Math.random() - 0.5) * 20 * dt;
          p.vy += (Math.random() - 0.5) * 20 * dt;
          p.vx = Math.max(-14, Math.min(14, p.vx));
          p.vy = Math.max(-14, Math.min(14, p.vy));
        }
        p.x += (p.vx + sway) * dt;
        p.y += p.vy * dt + (p.kind === 'bat' ? Math.sin(t * 2 + p.phase) * 0.6 : 0);
        p.rot += p.vr * dt;
        const out = p.y > h + 30 || p.y < -40 || p.x < -60 || p.x > w + 60;
        if (out && p.kind !== 'star') ps[i] = spawn(p.kind, w, h, color, p.kind === 'firefly');
        // Sfuma ai bordi alto e basso: niente particelle che "tagliano" i pulsanti.
        const fade = Math.min(1, Math.max(0, ps[i].y / 60), Math.max(0, (h - ps[i].y) / 140));
        g.globalAlpha = 0.85 * fade;
        draw(g, ps[i], t);
        g.globalAlpha = 1;
      }
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible') {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      g.clearRect(0, 0, w, h);
    };
  }, [active, fx, accentId]);

  return (
    <>
      <div
        className={`map-sky sky-${phase}`}
        aria-hidden
        style={{ background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.horizon} 45%, transparent 100%)` }}
      />
      <canvas ref={canvas} className="map-ambient" aria-hidden />
    </>
  );
}
