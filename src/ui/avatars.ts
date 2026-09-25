// Avatar illustrati (SVG disegnati a mano): musetti di animali in stile cartone.
// Sono stringhe fisse dell'app, mai testo scritto dall'utente.

const EYES = (y = 36, l = 25, r = 39, color = '#2a2440') =>
  `<circle cx="${l}" cy="${y}" r="2.7" fill="${color}"/><circle cx="${r}" cy="${y}" r="2.7" fill="${color}"/>` +
  `<circle cx="${l + 0.9}" cy="${y - 0.9}" r="0.9" fill="#fff"/><circle cx="${r + 0.9}" cy="${y - 0.9}" r="0.9" fill="#fff"/>`;

const CHEEKS = (y = 42, l = 20, r = 44) =>
  `<circle cx="${l}" cy="${y}" r="2.8" fill="#ff8fa3" opacity=".45"/><circle cx="${r}" cy="${y}" r="2.8" fill="#ff8fa3" opacity=".45"/>`;

const MOUTH = (y = 44, color = '#5a3a2a') =>
  `<path d="M32 ${y} v1.6 M32 ${y + 1.6} q-2.3 1.9 -4.2 .4 M32 ${y + 1.6} q2.3 1.9 4.2 .4" stroke="${color}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;

const CAT = (
  bg: string,
  fur: string,
  stripe: string | null,
  inner: string,
  muzzle: string,
  eyes: string,
  whisker: string,
  opts: { ear?: string; patches?: string; extra?: string } = {},
) =>
  `<circle cx="32" cy="32" r="32" fill="${bg}"/>` +
  `<path d="M14 31 L17 11 L29 22 Z" fill="${opts.ear ?? fur}"/><path d="M50 31 L47 11 L35 22 Z" fill="${opts.ear ?? fur}"/>` +
  `<path d="M17.8 25 L19.2 15.5 L25.2 21 Z" fill="${inner}"/><path d="M46.2 25 L44.8 15.5 L38.8 21 Z" fill="${inner}"/>` +
  `<ellipse cx="32" cy="37" rx="19" ry="17" fill="${fur}"/>` +
  (opts.patches ?? '') +
  (stripe
    ? `<path d="M28.5 21.5 L29.8 27 M32 20.8 V27 M35.5 21.5 L34.2 27" stroke="${stripe}" stroke-width="2.3" stroke-linecap="round"/>` +
      `<path d="M13.5 35 h4 M13.8 39 h3.5 M50.5 35 h-4 M50.2 39 h-3.5" stroke="${stripe}" stroke-width="2" stroke-linecap="round"/>`
    : '') +
  `<ellipse cx="32" cy="44.5" rx="9" ry="6.5" fill="${muzzle}"/>` +
  eyes +
  `<path d="M30 41.2 h4 l-2 2.4 z" fill="#E86A7A"/>` +
  MOUTH(43.6) +
  `<path d="M11 42 h8 M11.5 46 l7.5 -1.6 M53 42 h-8 M52.5 46 l-7.5 -1.6" stroke="${whisker}" stroke-width="1.1" stroke-linecap="round"/>` +
  CHEEKS(44, 21, 43) +
  (opts.extra ?? '');

/** Muso di cane: orecchie pendenti o a punta, macchie e accessori opzionali. */
const DOG = (
  bg: string,
  fur: string,
  ear: string,
  muzzle: string,
  o: { pointy?: boolean; spots?: string; blaze?: string; extra?: string; nose?: string; tongue?: boolean } = {},
) =>
  `<circle cx="32" cy="32" r="32" fill="${bg}"/>` +
  (o.pointy
    ? `<path d="M14.5 29 L16.5 8.5 L29.5 20 Z" fill="${ear}"/><path d="M49.5 29 L47.5 8.5 L34.5 20 Z" fill="${ear}"/>` +
      `<path d="M18.2 23 L19.2 14.5 L25 19.4 Z" fill="#F3C6CF"/><path d="M45.8 23 L44.8 14.5 L39 19.4 Z" fill="#F3C6CF"/>`
    : '') +
  `<ellipse cx="32" cy="36" rx="17" ry="17.5" fill="${fur}"/>` +
  (o.spots ?? '') +
  (o.blaze ? `<path d="M32 21 C28 27 27 33 25 38 L39 38 C37 33 36 27 32 21 Z" fill="${o.blaze}"/>` : '') +
  `<ellipse cx="32" cy="44.5" rx="10" ry="8" fill="${muzzle}"/>` +
  (o.pointy
    ? ''
    : `<path d="M16 22 Q8 36 13 49 Q19 52 21 45 L23 25 Z" fill="${ear}"/><path d="M48 22 Q56 36 51 49 Q45 52 43 45 L41 25 Z" fill="${ear}"/>`) +
  EYES(34) +
  `<ellipse cx="32" cy="41" rx="3.8" ry="2.7" fill="${o.nose ?? '#2a2440'}"/>` +
  MOUTH(43.4, '#2a2440') +
  (o.tongue === false ? '' : `<path d="M30 47.4 q2 4.2 4 0 z" fill="#F07C8C"/>`) +
  CHEEKS(43, 22, 42) +
  (o.extra ?? '');

// ---- Accessori ------------------------------------------------------------------
const CROWN = (y = 4) =>
  `<path d="M20 ${y + 12} L18 ${y} L25 ${y + 6} L32 ${y - 3} L39 ${y + 6} L46 ${y} L44 ${y + 12} Z" fill="#F5B400" stroke="#C48400" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<circle cx="32" cy="${y + 7}" r="1.9" fill="#FF5D8F"/><circle cx="24.5" cy="${y + 9}" r="1.3" fill="#5FF0D9"/><circle cx="39.5" cy="${y + 9}" r="1.3" fill="#5FF0D9"/>`;

const WIZARD_HAT =
  `<path d="M16 17 Q32 22 48 17 Q40 14 32 -2 Q24 14 16 17 Z" fill="#6B4FD8"/>` +
  `<path d="M14 18 Q32 25 50 18 Q32 14 14 18 Z" fill="#8B6CF0"/>` +
  `<path d="M30 6 l1 2.4 2.5.2-1.9 1.6.6 2.4-2.2-1.3-2.2 1.3.6-2.4-1.9-1.6 2.5-.2z" fill="#FFE07A"/>` +
  `<circle cx="37" cy="12" r="1.1" fill="#FFE07A"/><circle cx="26" cy="14" r=".9" fill="#FFE07A"/>`;

const PIRATE =
  `<path d="M12 18 Q32 2 52 18 Q32 13 12 18 Z" fill="#2A2440"/><path d="M12 18 Q32 22 52 18" stroke="#F5B400" stroke-width="1.6" fill="none"/>` +
  `<circle cx="32" cy="12" r="2.6" fill="#fff"/><path d="M30.5 13.5 l3-3 M33.5 13.5 l-3-3" stroke="#2A2440" stroke-width=".9"/>` +
  `<path d="M14 30 L50 24" stroke="#2A2440" stroke-width="1.4"/><ellipse cx="25" cy="36" rx="5" ry="4.4" fill="#2A2440"/>`;

const HELMET =
  `<circle cx="32" cy="34" r="25" fill="#BFE3FF" fill-opacity=".28" stroke="#E8EEF7" stroke-width="3.5"/>` +
  `<path d="M16 22 Q22 14 30 13" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-opacity=".85"/>` +
  `<rect x="22" y="56" width="20" height="6" rx="3" fill="#E8EEF7"/><circle cx="32" cy="59" r="1.6" fill="#FF5D8F"/>` +
  `<path d="M49 12 l4 -6" stroke="#E8EEF7" stroke-width="2"/><circle cx="53.5" cy="5.5" r="2.2" fill="#FF5D8F"/>`;

const CAPE = `<path d="M14 58 Q32 50 50 58 L50 64 L14 64 Z" fill="#E5484D"/><path d="M14 58 Q32 52 50 58" stroke="#fff" stroke-width="2" fill="none" stroke-dasharray="1 3"/>`;

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

  // ---- Nuovi avatar liberi ----
  labrador: DOG('#FFF3D6', '#F2C66D', '#D9A441', '#FFE7B0'),
  carlino:
    DOG('#F3E6DA', '#E8C9A0', '#3A3036', '#4A3F45', { tongue: true }) +
    `<path d="M26 27 q6 -3 12 0 M27.5 30 q4.5 -2 9 0" stroke="#b08a66" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  dalmata: DOG('#E8F1FB', '#FFFFFF', '#2A2440', '#F6F7FB', {
    spots: `<circle cx="22" cy="28" r="2.6" fill="#2A2440"/><circle cx="41" cy="25" r="3.2" fill="#2A2440"/><circle cx="45" cy="36" r="2" fill="#2A2440"/><circle cx="19" cy="38" r="1.8" fill="#2A2440"/><circle cx="36" cy="22" r="1.5" fill="#2A2440"/>`,
  }),
  'gatto-siamese': CAT('#EAF4FF', '#F3E6D2', null, '#C9A898', '#6B5448', SLIT_EYES('#4DA3FF'), '#d9ccc0', { ear: '#6B5448' }),
  'gatto-calico': CAT('#FFF1E6', '#FFFFFF', null, '#F8B9C8', '#FFF7F0', EYES(), '#c9b8a8', {
    patches: `<path d="M13.5 32 Q15 22 25 21 Q27 28 22 33 Q17 36 13.5 32 Z" fill="#F29A48"/><path d="M50.5 32 Q49 22 39 21 Q37 28 42 33 Q47 36 50.5 32 Z" fill="#35304A"/>`,
    ear: '#F29A48',
  }),
  'gatto-bianco': CAT(
    '#F1F6FF',
    '#FFFFFF',
    null,
    '#F8B9C8',
    '#F6F2FA',
    `<ellipse cx="25" cy="36" rx="3.4" ry="3.9" fill="#7FB8FF"/><ellipse cx="39" cy="36" rx="3.4" ry="3.9" fill="#F6D24A"/>` +
      `<ellipse cx="25" cy="36" rx="1.1" ry="3" fill="#1d1a26"/><ellipse cx="39" cy="36" rx="1.1" ry="3" fill="#1d1a26"/>` +
      `<circle cx="26" cy="34.6" r=".8" fill="#fff"/><circle cx="40" cy="34.6" r=".8" fill="#fff"/>`,
    '#d6d0e0',
  ),

  // ---- Avatar da sbloccare con i livelli ----
  bassotto: DOG('#FBE9DD', '#B5652E', '#7A3F1C', '#D9955E', { nose: '#3a2020' }),
  corgi: DOG('#FFF0DC', '#F0A04B', '#E08A34', '#FFFFFF', { pointy: true, blaze: '#FFFFFF' }),
  gufo:
    `<circle cx="32" cy="32" r="32" fill="#E9E2F7"/>` +
    `<path d="M14 18 L20 26 L12 28 Z M50 18 L44 26 L52 28 Z" fill="#8A6A4A"/>` +
    `<ellipse cx="32" cy="38" rx="20" ry="19" fill="#A57C55"/>` +
    `<ellipse cx="32" cy="45" rx="11" ry="10" fill="#E8D3B5"/>` +
    `<path d="M26 46 q2 2 4 0 M34 46 q2 2 4 0 M29 51 q3 2 6 0" stroke="#b89a76" stroke-width="1" fill="none"/>` +
    `<circle cx="24" cy="33" r="8" fill="#FFF6E0"/><circle cx="40" cy="33" r="8" fill="#FFF6E0"/>` +
    `<circle cx="24" cy="33" r="4.4" fill="#F6B73C"/><circle cx="40" cy="33" r="4.4" fill="#F6B73C"/>` +
    `<circle cx="24" cy="33" r="2.4" fill="#2a2440"/><circle cx="40" cy="33" r="2.4" fill="#2a2440"/>` +
    `<circle cx="25" cy="32" r=".9" fill="#fff"/><circle cx="41" cy="32" r=".9" fill="#fff"/>` +
    `<path d="M29.5 38 L32 43 L34.5 38 Z" fill="#F29A48"/>`,
  barboncino:
    `<circle cx="32" cy="32" r="32" fill="#FFEFF4"/>` +
    [[20, 17], [27, 12], [35, 12], [42, 17], [13, 30], [11, 40], [14, 49], [51, 30], [53, 40], [50, 49]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#F5DCC6"/>`)
      .join('') +
    `<ellipse cx="32" cy="38" rx="15" ry="16" fill="#FBE8D6"/>` +
    `<ellipse cx="32" cy="45.5" rx="8" ry="6.5" fill="#FFF4EA"/>` +
    EYES(35) +
    `<ellipse cx="32" cy="42" rx="3.2" ry="2.3" fill="#2a2440"/>` +
    MOUTH(44, '#2a2440') +
    `<path d="M26 12 q6 -5 12 0" fill="#FF8FB1"/><circle cx="32" cy="10" r="2.4" fill="#FF5D8F"/>` +
    CHEEKS(43, 22, 42),
  pinguino:
    `<circle cx="32" cy="32" r="32" fill="#DDF1FF"/>` +
    `<ellipse cx="32" cy="37" rx="20" ry="20" fill="#2E3244"/>` +
    `<path d="M32 22 C24 22 18 30 18 40 C18 50 25 55 32 55 C39 55 46 50 46 40 C46 30 40 22 32 22 Z" fill="#FFFFFF"/>` +
    EYES(35, 26, 38) +
    `<path d="M28.5 40 Q32 38 35.5 40 Q32 45 28.5 40 Z" fill="#F6A623"/>` +
    CHEEKS(42, 22, 42),
  'gatto-tigre': CAT('#FFF1D6', '#F59A2E', '#3A2A1E', '#FFC2A0', '#FFF6EA', SLIT_EYES('#9BD35A'), '#b5733a', {
    patches: `<path d="M14 30 l6 2 M14.5 34 l6 1 M50 30 l-6 2 M49.5 34 l-6 1 M24 24 l2 4 M40 24 l-2 4" stroke="#3A2A1E" stroke-width="2.2" stroke-linecap="round"/>`,
  }),
  'volpe-artica':
    `<circle cx="32" cy="32" r="32" fill="#E4F2FA"/>` +
    `<path d="M12.5 29 L15.5 8 L29 19 Z" fill="#F4F7FB"/><path d="M51.5 29 L48.5 8 L35 19 Z" fill="#F4F7FB"/>` +
    `<path d="M15.5 12 L16.2 18 L21 15.5 Z" fill="#C9D6E6"/><path d="M48.5 12 L47.8 18 L43 15.5 Z" fill="#C9D6E6"/>` +
    `<path d="M11 30 Q13 19 32 19 Q51 19 53 30 Q50 45 32 55 Q14 45 11 30 Z" fill="#FFFFFF" stroke="#D6E2EE" stroke-width="1"/>` +
    `<circle cx="24" cy="33" r="2.8" fill="#3B7FD1"/><circle cx="40" cy="33" r="2.8" fill="#3B7FD1"/><circle cx="24.9" cy="32.1" r=".9" fill="#fff"/><circle cx="40.9" cy="32.1" r=".9" fill="#fff"/>` +
    `<ellipse cx="32" cy="50" rx="2.8" ry="2.2" fill="#2a2440"/>` +
    CHEEKS(40, 20, 44),
  lupo:
    `<circle cx="32" cy="32" r="32" fill="#DDE3EE"/>` +
    `<path d="M13.5 30 L16 7 L29.5 20 Z" fill="#5F6675"/><path d="M50.5 30 L48 7 L34.5 20 Z" fill="#5F6675"/>` +
    `<path d="M17.5 23 L18.6 13.5 L24.6 19 Z" fill="#C9CED8"/><path d="M46.5 23 L45.4 13.5 L39.4 19 Z" fill="#C9CED8"/>` +
    `<ellipse cx="32" cy="36" rx="18.5" ry="17.5" fill="#7A8292"/>` +
    `<path d="M32 26 C27 26 24 34 19 37 C20 48 26 53.5 32 53.5 C38 53.5 44 48 45 37 C40 34 37 26 32 26 Z" fill="#E6E9EF"/>` +
    `<path d="M21 31 L28 34 M43 31 L36 34" stroke="#3E4452" stroke-width="1.6" stroke-linecap="round"/>` +
    `<ellipse cx="25" cy="36" rx="3.2" ry="2.8" fill="#F6C94A"/><ellipse cx="39" cy="36" rx="3.2" ry="2.8" fill="#F6C94A"/>` +
    `<circle cx="25" cy="36" r="1.4" fill="#1d1a26"/><circle cx="39" cy="36" r="1.4" fill="#1d1a26"/>` +
    `<ellipse cx="32" cy="44" rx="3.6" ry="2.6" fill="#2a2440"/>` +
    MOUTH(46.2, '#2a2440'),
  'gatto-pirata': CAT('#E3EEF7', '#35304A', null, '#7A5E86', '#4A4462', SLIT_EYES('#F6D24A'), '#cfc8e0', { extra: PIRATE }),
  leone:
    `<circle cx="32" cy="32" r="32" fill="#FFF0D0"/>` +
    Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return `<circle cx="${(32 + Math.cos(a) * 19).toFixed(1)}" cy="${(36 + Math.sin(a) * 19).toFixed(1)}" r="8" fill="${i % 2 ? '#C9772A' : '#E08E35'}"/>`;
    }).join('') +
    `<circle cx="20" cy="22" r="4.5" fill="#F2BF5E"/><circle cx="44" cy="22" r="4.5" fill="#F2BF5E"/>` +
    `<circle cx="32" cy="37" r="16" fill="#F7CA6B"/>` +
    `<ellipse cx="32" cy="44.5" rx="8" ry="6" fill="#FFF0D6"/>` +
    EYES(35) +
    `<path d="M29.5 41 h5 l-2.5 2.8 z" fill="#8A4B2A"/>` +
    MOUTH(43.8, '#8A4B2A') +
    CHEEKS(43, 21, 43),
  'cane-astronauta': DOG('#1E2346', '#F2C66D', '#D9A441', '#FFE7B0', {
    extra:
      HELMET +
      `<circle cx="8" cy="10" r=".9" fill="#fff"/><circle cx="56" cy="30" r=".7" fill="#fff"/><circle cx="6" cy="44" r=".8" fill="#fff"/>`,
  }),
  'gatto-mago': CAT('#EDE6FF', '#A3ADBD', '#77829A', '#F4C3CE', '#EEF1F6', SLIT_EYES('#86D08F'), '#8c96a8', { extra: WIZARD_HAT }),
  unicorno:
    `<circle cx="32" cy="32" r="32" fill="#FDEBFF"/>` +
    `<path d="M16 26 Q10 34 14 46 Q20 40 20 30 Z" fill="#FF9EC4"/><path d="M14 30 Q9 40 16 50 Q20 42 19 34 Z" fill="#9FD7FF"/>` +
    `<path d="M20 25 L19 13 L27 20 Z M44 25 L45 13 L37 20 Z" fill="#FFFFFF" stroke="#EAD9F2"/>` +
    `<ellipse cx="32" cy="37" rx="15.5" ry="17" fill="#FFFFFF" stroke="#EAD9F2"/>` +
    `<path d="M29 20 L32 3 L35 20 Z" fill="#FFD45C"/><path d="M29.8 16 L34.2 14.5 M30.6 11.5 L33.4 10.5" stroke="#F5A800" stroke-width="1"/>` +
    `<ellipse cx="32" cy="47" rx="9" ry="6.5" fill="#FFE3F1"/><circle cx="29" cy="47" r="1" fill="#d69ab8"/><circle cx="35" cy="47" r="1" fill="#d69ab8"/>` +
    `<path d="M22 35 q3 -3 6 0 M36 35 q3 -3 6 0" stroke="#2a2440" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    CHEEKS(41, 21, 43),
  drago:
    `<circle cx="32" cy="32" r="32" fill="#E4F7E8"/>` +
    `<path d="M18 22 L12 6 L25 17 Z M46 22 L52 6 L39 17 Z" fill="#F6C94A"/>` +
    `<path d="M9 30 L3 24 L10 22 Z M55 30 L61 24 L54 22 Z" fill="#3FA45B"/>` +
    `<ellipse cx="32" cy="36" rx="20" ry="18" fill="#5CBF6A"/>` +
    `<path d="M26 20 l2 -3 2 3 2 -3 2 3 2 -3 2 3" fill="#3FA45B"/>` +
    `<ellipse cx="32" cy="45" rx="12" ry="8" fill="#A8E6A0"/>` +
    `<circle cx="28" cy="43" r="1.3" fill="#2F6B33"/><circle cx="36" cy="43" r="1.3" fill="#2F6B33"/>` +
    `<ellipse cx="24.5" cy="33" rx="3.6" ry="4.2" fill="#FFF7D6"/><ellipse cx="39.5" cy="33" rx="3.6" ry="4.2" fill="#FFF7D6"/>` +
    `<ellipse cx="24.5" cy="33.5" rx="1.3" ry="3" fill="#2a2440"/><ellipse cx="39.5" cy="33.5" rx="1.3" ry="3" fill="#2a2440"/>` +
    `<path d="M26 49 q6 4 12 0" stroke="#2F6B33" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    CHEEKS(40, 18, 46),
  'gatto-re': CAT('#FFF0D0', '#F6A246', '#D9731C', '#FFB3A7', '#FFEBD6', EYES(), '#b5733a', { extra: CROWN(3) + CAPE }),

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
  const body = Object.hasOwn(SVGS, id) ? SVGS[id] : SVGS[DEFAULT_AVATAR];
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}
