/** Schermata di apertura: uguale a quella scritta in index.html, così non c'è nessuno "stacco". */
export function Splash() {
  return (
    <div className="splash" aria-label="Zampe in Giro">
      <div className="splash-logo">
        <svg viewBox="0 0 128 128" width="112" height="112" aria-hidden="true">
          <g fill="#fff">
            <ellipse cx="38" cy="54" rx="10" ry="13" transform="rotate(-24 38 54)" />
            <ellipse cx="55" cy="36" rx="10" ry="13" transform="rotate(-8 55 36)" />
            <ellipse cx="76" cy="36" rx="10" ry="13" transform="rotate(8 76 36)" />
            <ellipse cx="92" cy="54" rx="10" ry="13" transform="rotate(24 92 54)" />
            <path d="M65 58c-14 0-31 18-31 32 0 9 7 13 15 13 6 0 10-3 16-3s10 3 16 3c8 0 15-4 15-13 0-14-17-32-31-32z" />
          </g>
        </svg>
      </div>
      <div className="splash-title">Zampe in Giro</div>
      <div className="splash-dots">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
