import { useEffect, useRef } from 'react';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Inclinazione 3D di una carta: segue il giroscopio del telefono (o il dito /
 * il mouse) e aggiorna le variabili CSS --rx, --ry (rotazione) e --px, --py
 * (posizione del riflesso olografico).
 */
export function useTilt<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    let base: { beta: number; gamma: number } | null = null;

    const apply = () => {
      raf = 0;
      el.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
      el.style.setProperty('--px', `${(50 + x * 45).toFixed(1)}%`);
      el.style.setProperty('--py', `${(50 + y * 45).toFixed(1)}%`);
    };
    const set = (nx: number, ny: number) => {
      x = clamp(nx);
      y = clamp(ny);
      if (!raf) raf = requestAnimationFrame(apply);
    };

    // Giroscopio: la prima lettura è la posizione "neutra" in cui tieni il telefono.
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      base ??= { beta: e.beta, gamma: e.gamma };
      set((e.gamma - base.gamma) / 25, (e.beta - base.beta) / 25);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => set(0, 0);

    // Su iPhone il giroscopio richiede il permesso, che si può chiedere solo dopo un tocco.
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    const listen = () => window.addEventListener('deviceorientation', onOrient);
    const askPermission = () => {
      DOE?.requestPermission?.().then((s) => s === 'granted' && listen(), () => {});
    };
    if (DOE?.requestPermission) el.addEventListener('pointerdown', askPermission, { once: true });
    else if (DOE) listen();

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('deviceorientation', onOrient);
      el.removeEventListener('pointerdown', askPermission);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  return ref;
}
