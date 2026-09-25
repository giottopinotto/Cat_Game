// Avatar illustrati (SVG disegnati a mano): musetti di animali in stile cartone.
// Sono stringhe fisse dell'app, mai testo scritto dall'utente.

const EYES = (y = 36, l = 25, r = 39, color = '#2a2440') =>
  `<circle cx="${l}" cy="${y}" r="2.7" fill="${color}"/><circle cx="${r}" cy="${y}" r="2.7" fill="${color}"/>` +
  `<circle cx="${l + 0.9}" cy="${y - 0.9}" r="0.9" fill="#fff"/><circle cx="${r + 0.9}" cy="${y - 0.9}" r="0.9" fill="#fff"/>`;

const CHEEKS = (y = 42, l = 20, r = 44) =>
  `<circle cx="${l}" cy="${y}" r="2.8" fill="#ff8fa3" opacity=".45"/><circle cx="${r}" cy="${y}" r="2.8" fill="#ff8fa3" opacity=".45"/>`;

const MOUTH = (y = 44, color = '#5a3a2a') =>
  `<path d="M32 ${y} v1.6 M32 ${y + 1.6} q-2.3 1.9 -4.2 .4 M32 ${y + 1.6} q2.3 1.9 4.2 .4" stroke="${color}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;

const CAT = (bg: string, fur: string, stripe: string | null, inner: string, muzzle: string, eyes: string, whisker: string) =>
  `<circle cx="32" cy="32" r="32" fill="${bg}"/>` +
  `<path d="M14 31 L17 11 L29 22 Z" fill="${fur}"/><path d="M50 31 L47 11 L35 22 Z" fill="${fur}"/>` +
  `<path d="M17.8 25 L19.2 15.5 L25.2 21 Z" fill="${inner}"/><path d="M46.2 25 L44.8 15.5 L38.8 21 Z" fill="${inner}"/>` +
  `<ellipse cx="32" cy="37" rx="19" ry="17" fill="${fur}"/>` +
  (stripe
    ? `<path d="M28.5 21.5 L29.8 27 M32 20.8 V27 M35.5 21.5 L34.2 27" stroke="${stripe}" stroke-width="2.3" stroke-linecap="round"/>` +
      `<path d="M13.5 35 h4 M13.8 39 h3.5 M50.5 35 h-4 M50.2 39 h-3.5" stroke="${stripe}" stroke-width="2" stroke-linecap="round"/>`
    : '') +
  `<ellipse cx="32" cy="44.5" rx="9" ry="6.5" fill="${muzzle}"/>` +
  eyes +
  `<path d="M30 41.2 h4 l-2 2.4 z" fill="#E86A7A"/>` +
  MOUTH(43.6) +
  `<path d="M11 42 h8 M11.5 46 l7.5 -1.6 M53 42 h-8 M52.5 46 l-7.5 -1.6" stroke="${whisker}" stroke-width="1.1" stroke-linecap="round"/>` +
  CHEEKS(44, 21, 43);

const SLIT_EYES = (color: string) =>
  `<ellipse cx="25" cy="36" rx="3.4" ry="3.9" fill="${color}"/><ellipse cx="39" cy="36" rx="3.4" ry="3.9" fill="${color}"/>` +
  `<ellipse cx="25" cy="36" rx="1.1" ry="3" fill="#1d1a26"/><ellipse cx="39" cy="36" rx="1.1" ry="3" fill="#1d1a26"/>` +
  `<circle cx="26" cy="34.6" r=".8" fill="#fff"/><circle cx="40" cy="34.6" r=".8" fill="#fff"/>`;

const SVGS: Record<string, string> = {
  'gatto-rosso': CAT('#FFE3C2', '#F6A246', '#D9731C', '#FFB3A7', '#FFEBD6', EYES(), '#b5733a'),
  'gatto-nero': CAT('#E6DFF7', '#35304A', null, '#7A5E86', '#4A4462', SLIT_EYES('#F6D24A'), '#cfc8e0'),
  'gatto-grigio': CAT('#DDEBF7', '#A3ADBD', '#77829A', '#F4C3CE', '#EEF1F6', SLIT_EYES('#86D08F'), '#8c96a8'),

  beagle:
    `<circle cx="32" cy="32" r="32" fill="#FFE9D6"/>` +
    `<ellipse cx="32" cy="36" rx="16.5" ry="17.5" fill="#D99A5B"/>` +
    `<rect x="30" y="19" width="4" height="18" rx="2" fill="#FFF6EC"/>` +
    `<ellipse cx="32" cy="45" rx="10" ry="8" fill="#FFF6EC"/>` +
    `<path d="M16 22 Q8 36 13 49 Q19 52 21 45 L23 25 Z" fill="#8A5A33"/><path d="M48 22 Q56 36 51 49 Q45 52 43 45 L41 25 Z" fill="#8A5A33"/>` +
    EYES(34) +
    `<ellipse cx="32" cy="41" rx="3.8" ry="2.7" fill="#2a2440"/>` +
    MOUTH(43.4, '#2a2440') +
    `<path d="M30 47.4 q2 4.2 4 0 z" fill="#F07C8C"/>` +
    CHEEKS(43, 22, 42),

  husky:
    `<circle cx="32" cy="32" r="32" fill="#DCEFF7"/>` +
    `<path d="M14.5 28 L17.5 8.5 L29.5 20 Z" fill="#5B6472"/><path d="M49.5 28 L46.5 8.5 L34.5 20 Z" fill="#5B6472"/>` +
    `<path d="M18.2 22.5 L19.6 14 L25 19.4 Z" fill="#F3C6CF"/><path d="M45.8 22.5 L44.4 14 L39 19.4 Z" fill="#F3C6CF"/>` +
    `<ellipse cx="32" cy="36" rx="18.5" ry="17.5" fill="#6B7483"/>` +
    `<path d="M32 23 C27 23 25 31 17 35 C18 47 25 53.5 32 53.5 C39 53.5 46 47 47 35 C39 31 37 23 32 23 Z" fill="#FAFBFD"/>` +
    `<circle cx="25" cy="36" r="3" fill="#4DA3FF"/><circle cx="39" cy="36" r="3" fill="#4DA3FF"/>` +
    `<circle cx="25" cy="36" r="1.4" fill="#1d2a3a"/><circle cx="39" cy="36" r="1.4" fill="#1d2a3a"/>` +
    `<circle cx="25.9" cy="35" r=".8" fill="#fff"/><circle cx="39.9" cy="35" r=".8" fill="#fff"/>` +
    `<ellipse cx="32" cy="43" rx="3.5" ry="2.5" fill="#2a2440"/>` +
    MOUTH(45.2, '#2a2440'),

  samoiedo:
    `<circle cx="32" cy="32" r="32" fill="#FDECF2"/>` +
    `<path d="M16 27 L18 11 L28 20 Z" fill="#FFFFFF" stroke="#EBD9E1" stroke-width="1"/><path d="M48 27 L46 11 L36 20 Z" fill="#FFFFFF" stroke="#EBD9E1" stroke-width="1"/>` +
    `<path d="M19.3 22 L20.2 15 L24.8 19.2 Z" fill="#F8B9C8"/><path d="M44.7 22 L43.8 15 L39.2 19.2 Z" fill="#F8B9C8"/>` +
    [
      [16, 30],
      [14, 38],
      [17, 46],
      [24, 52],
      [32, 54],
      [40, 52],
      [47, 46],
      [50, 38],
      [48, 30],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#FFFFFF" stroke="#EBD9E1" stroke-width="1"/>`)
      .join('') +
    `<circle cx="32" cy="37" r="17" fill="#FFFFFF"/>` +
    EYES(35) +
    `<ellipse cx="32" cy="41.5" rx="3.2" ry="2.3" fill="#2a2440"/>` +
    `<path d="M26 44.5 q6 5.5 12 0" stroke="#2a2440" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    CHEEKS(42, 22, 42),

  volpe:
    `<circle cx="32" cy="32" r="32" fill="#FFE0CC"/>` +
    `<path d="M12.5 29 L15.5 8 L29 19 Z" fill="#E8742A"/><path d="M51.5 29 L48.5 8 L35 19 Z" fill="#E8742A"/>` +
    `<path d="M15.5 8 L14.4 16 L20.6 12.6 Z" fill="#3a2a2a"/><path d="M48.5 8 L49.6 16 L43.4 12.6 Z" fill="#3a2a2a"/>` +
    `<path d="M11 30 Q13 19 32 19 Q51 19 53 30 Q50 45 32 55 Q14 45 11 30 Z" fill="#EF8233"/>` +
    `<path d="M11 30 Q17 45 32 55 Q27 42 23 37 Q16 35 11 30 Z" fill="#FFF6EC"/><path d="M53 30 Q47 45 32 55 Q37 42 41 37 Q48 35 53 30 Z" fill="#FFF6EC"/>` +
    EYES(33, 24, 40) +
    `<ellipse cx="32" cy="50" rx="2.8" ry="2.2" fill="#2a2440"/>`,

  orso:
    `<circle cx="32" cy="32" r="32" fill="#F1E3D3"/>` +
    `<circle cx="16.5" cy="20.5" r="7" fill="#8B5E3C"/><circle cx="16.5" cy="20.5" r="3.6" fill="#C98F63"/>` +
    `<circle cx="47.5" cy="20.5" r="7" fill="#8B5E3C"/><circle cx="47.5" cy="20.5" r="3.6" fill="#C98F63"/>` +
    `<circle cx="32" cy="36" r="18" fill="#8B5E3C"/>` +
    `<ellipse cx="32" cy="43.5" rx="8.8" ry="7" fill="#D7AE85"/>` +
    EYES(33) +
    `<ellipse cx="32" cy="40.5" rx="3.3" ry="2.4" fill="#2a2440"/>` +
    MOUTH(42.8, '#2a2440') +
    CHEEKS(41, 20, 44),

  panda:
    `<circle cx="32" cy="32" r="32" fill="#E4F4E8"/>` +
    `<circle cx="16.5" cy="20.5" r="7" fill="#2E2A3A"/><circle cx="47.5" cy="20.5" r="7" fill="#2E2A3A"/>` +
    `<circle cx="32" cy="36" r="18" fill="#FFFFFF"/>` +
    `<ellipse cx="24" cy="35" rx="4.8" ry="6.4" transform="rotate(28 24 35)" fill="#2E2A3A"/><ellipse cx="40" cy="35" rx="4.8" ry="6.4" transform="rotate(-28 40 35)" fill="#2E2A3A"/>` +
    `<circle cx="24.6" cy="34.4" r="2" fill="#fff"/><circle cx="39.4" cy="34.4" r="2" fill="#fff"/>` +
    `<circle cx="24.9" cy="34.7" r="1" fill="#2E2A3A"/><circle cx="39.1" cy="34.7" r="1" fill="#2E2A3A"/>` +
    `<ellipse cx="32" cy="42" rx="3.1" ry="2.2" fill="#2E2A3A"/>` +
    MOUTH(44, '#2E2A3A') +
    CHEEKS(44, 20, 44),

  coniglio:
    `<circle cx="32" cy="32" r="32" fill="#F9E3EC"/>` +
    `<ellipse cx="24.5" cy="16" rx="5.2" ry="13" transform="rotate(-10 24.5 16)" fill="#F4F2F7"/><ellipse cx="24.5" cy="16" rx="2.4" ry="9" transform="rotate(-10 24.5 16)" fill="#F8B4C4"/>` +
    `<ellipse cx="39.5" cy="16" rx="5.2" ry="13" transform="rotate(10 39.5 16)" fill="#F4F2F7"/><ellipse cx="39.5" cy="16" rx="2.4" ry="9" transform="rotate(10 39.5 16)" fill="#F8B4C4"/>` +
    `<ellipse cx="32" cy="39" rx="16.5" ry="15" fill="#F4F2F7"/>` +
    EYES(37, 26, 38) +
    `<path d="M30 42 h4 l-2 2.3 z" fill="#F07C8C"/>` +
    MOUTH(44.2, '#6a5a70') +
    `<rect x="30.6" y="46.4" width="2.8" height="3.2" rx=".7" fill="#fff" stroke="#d9cfe0" stroke-width=".6"/>` +
    CHEEKS(44, 21, 43),

  rana:
    `<circle cx="32" cy="32" r="32" fill="#E1F5D9"/>` +
    `<circle cx="21.5" cy="23" r="8" fill="#5DBB63"/><circle cx="42.5" cy="23" r="8" fill="#5DBB63"/>` +
    `<ellipse cx="32" cy="39" rx="20.5" ry="15" fill="#5DBB63"/>` +
    `<ellipse cx="32" cy="45" rx="13" ry="7" fill="#9BDD8F"/>` +
    `<circle cx="21.5" cy="23" r="5" fill="#fff"/><circle cx="42.5" cy="23" r="5" fill="#fff"/>` +
    `<circle cx="22.2" cy="23.6" r="2.5" fill="#2a2440"/><circle cx="41.8" cy="23.6" r="2.5" fill="#2a2440"/>` +
    `<path d="M22 41 q10 8.5 20 0" stroke="#2F6B33" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    CHEEKS(39, 16.5, 47.5),

  koala:
    `<circle cx="32" cy="32" r="32" fill="#E3ECF4"/>` +
    `<circle cx="14.5" cy="25" r="9.5" fill="#9AA3AE"/><circle cx="14.5" cy="25" r="5.5" fill="#EEE8F0"/>` +
    `<circle cx="49.5" cy="25" r="9.5" fill="#9AA3AE"/><circle cx="49.5" cy="25" r="5.5" fill="#EEE8F0"/>` +
    `<ellipse cx="32" cy="36.5" rx="17.5" ry="16.5" fill="#AAB2BD"/>` +
    EYES(33, 23.5, 40.5) +
    `<ellipse cx="32" cy="40" rx="4.6" ry="6.2" fill="#3a3544"/>` +
    `<path d="M28 49 q4 2.5 8 0" stroke="#3a3544" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
    CHEEKS(44, 21, 43),
};

export const AVATAR_IDS = Object.keys(SVGS);
export const DEFAULT_AVATAR = 'gatto-rosso';

/** SVG dell'avatar (se l'id non esiste, ad esempio un vecchio avatar emoji, quello predefinito). */
export function avatarSvg(id: string): string {
  const body = SVGS[id] ?? SVGS[DEFAULT_AVATAR];
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}
