import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RARITY_INFO, type Rarity } from '../data/types';
import { vibrationOn } from './sound';

export function rarityStyle(r: Rarity): CSSProperties {
  return { '--rarity': RARITY_INFO[r].color } as CSSProperties;
}

export function RarityPill({ rarity }: { rarity: Rarity }) {
  return (
    <span className={`rarity-pill ${rarity}`} style={rarityStyle(rarity)}>
      {rarity === 'leggendario' ? '★' : '●'} {RARITY_INFO[rarity].label}
    </span>
  );
}

export function XpBar({ value, max, style }: { value: number; max: number; style?: CSSProperties }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="xp-bar" style={style}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Switch({ on }: { on: boolean }) {
  return <span className={`switch ${on ? 'on' : ''}`} aria-hidden />;
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Il pannello viene disegnato direttamente nella pagina, sopra tutto (anche la barra in basso).
  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        {children}
      </div>
    </>,
    document.body,
  );
}

export function formatDate(ts: number, withYear = true): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('it-IT');
}

export function vibrate(pattern: number | number[]): void {
  if (!vibrationOn()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supportato */
  }
}

export function Logo({ size = 132, className = 'logo' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 128 128" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-b)' }} />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="120" height="120" rx="36" fill="url(#logo-g)" />
      <g fill="#fff">
        <ellipse cx="38" cy="54" rx="10" ry="13" transform="rotate(-24 38 54)" />
        <ellipse cx="55" cy="36" rx="10" ry="13" transform="rotate(-8 55 36)" />
        <ellipse cx="76" cy="36" rx="10" ry="13" transform="rotate(8 76 36)" />
        <ellipse cx="92" cy="54" rx="10" ry="13" transform="rotate(24 92 54)" />
        <path d="M65 58c-14 0-31 18-31 32 0 9 7 13 15 13 6 0 10-3 16-3s10 3 16 3c8 0 15-4 15-13 0-14-17-32-31-32z" />
      </g>
    </svg>
  );
}
