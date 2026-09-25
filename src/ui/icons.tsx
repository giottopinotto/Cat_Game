import {
  Award,
  BookOpen,
  Bot,
  Camera,
  CameraOff,
  Car,
  Cat,
  ChartColumn,
  Check,
  ClipboardList,
  Compass,
  Dog,
  Flame,
  Footprints,
  Gem,
  Gift,
  Hand,
  CalendarDays,
  Volume2,
  Vibrate,
  ShieldCheck,
  Heart,
  HeartHandshake,
  House,
  Images,
  Layers,
  Lightbulb,
  Lock,
  Map,
  MapPin,
  Medal as MedalIcon,
  Moon,
  Palette,
  PartyPopper,
  PawPrint,
  QrCode,
  Rainbow,
  ScanLine,
  Satellite,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  TrafficCone,
  Trees,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Species } from '../data/types';
import { avatarSvg } from './avatars';

// Un solo set di icone disegnate per tutta l'app (niente emoji: hanno un aspetto
// diverso su ogni telefono).

const ICONS = {
  award: Award,
  calendar: CalendarDays,
  sound: Volume2,
  vibrate: Vibrate,
  shield: ShieldCheck,
  book: BookOpen,
  bot: Bot,
  camera: Camera,
  'camera-off': CameraOff,
  car: Car,
  cat: Cat,
  chart: ChartColumn,
  check: Check,
  clipboard: ClipboardList,
  compass: Compass,
  dog: Dog,
  flame: Flame,
  footprints: Footprints,
  gem: Gem,
  gift: Gift,
  hand: Hand,
  heart: Heart,
  friends: HeartHandshake,
  home: House,
  images: Images,
  layers: Layers,
  lightbulb: Lightbulb,
  lock: Lock,
  map: Map,
  pin: MapPin,
  medal: MedalIcon,
  moon: Moon,
  palette: Palette,
  party: PartyPopper,
  paw: PawPrint,
  rainbow: Rainbow,
  qr: QrCode,
  scan: ScanLine,
  satellite: Satellite,
  search: Search,
  settings: Settings,
  sparkles: Sparkles,
  sun: Sun,
  target: Target,
  traffic: TrafficCone,
  trees: Trees,
  alert: TriangleAlert,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function GameIcon({ name, size = 20, style }: { name: IconName | string; size?: number; style?: CSSProperties }) {
  const Icon = ICONS[name as IconName] ?? PawPrint;
  return <Icon size={size} strokeWidth={2.2} style={style} aria-hidden />;
}

/** Icona dentro un cerchio colorato (tono lilla di default). */
export function IconBubble({ name, size = 44, tone = 'lilac' }: { name: IconName | string; size?: number; tone?: 'lilac' | 'mint' | 'pink' | 'gold' }) {
  return (
    <span className={`icon-bubble tone-${tone}`} style={{ width: size, height: size }}>
      <GameIcon name={name} size={size * 0.5} />
    </span>
  );
}

export function SpeciesIcon({ species, size = 18 }: { species: Species; size?: number }) {
  return <GameIcon name={species} size={size} />;
}

/** Avatar illustrato del giocatore. */
export function AvatarArt({ id, size }: { id: string; size?: number }) {
  // L'SVG proviene solo dall'elenco fisso dell'app (vedi avatars.ts), mai da testo dell'utente.
  return <span className="avatar-art" style={size ? { width: size, height: size } : undefined} dangerouslySetInnerHTML={{ __html: avatarSvg(id) }} />;
}

const BADGE_ICONS: Record<string, IconName> = {
  gattaro: 'cat',
  cinofilo: 'dog',
  collezionista: 'book',
  esploratore: 'compass',
  camminatore: 'footprints',
  amico: 'friends',
  rarita: 'gem',
  arcobaleno: 'rainbow',
  nottambulo: 'moon',
  costanza: 'flame',
  parco: 'trees',
};

/** Medaglia: icona su un medaglione bronzo/argento/oro (lilla chiaro se non ancora ottenuta). */
export function Medal({ badgeId, tier, size = 58 }: { badgeId: string; tier: number; size?: number }) {
  return (
    <div className={`medal medal-t${tier}`} style={{ width: size, height: size }}>
      <GameIcon name={BADGE_ICONS[badgeId] ?? 'gem'} size={size * 0.46} />
    </div>
  );
}

/** Cuori dell'amicizia, disegnati (pieni fino al livello raggiunto). */
export function Hearts({ level, max = 5, size = 16 }: { level: number; max?: number; size?: number }) {
  return (
    <span className="hearts" aria-label={`Amicizia ${level} su ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Heart key={i} size={size} strokeWidth={2.2} className={i < level ? 'on' : ''} aria-hidden />
      ))}
    </span>
  );
}

/** Sagome disegnate per le voci dell'album non ancora scoperte. */
export function Silhouette({ species, size = 44 }: { species: Species; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="silhouette" aria-hidden>
      {species === 'cat' ? (
        <g fill="currentColor">
          <path d="M19 59 C17 45 22 35 32 35 C42 35 47 45 45 59 Z" />
          <circle cx="32" cy="24" r="10.5" />
          <path d="M22.5 20 L23.5 8.5 L30.5 15.5 Z M41.5 20 L40.5 8.5 L33.5 15.5 Z" />
          <path d="M44 55 C55 53 57 42 50 37" stroke="currentColor" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g fill="currentColor">
          <path d="M18 59 C16 45 21 34 32 34 C43 34 48 45 46 59 Z" />
          <ellipse cx="32" cy="22" rx="11" ry="10" />
          <ellipse cx="32" cy="28" rx="6.5" ry="5" />
          <ellipse cx="20.5" cy="24" rx="4.2" ry="8.5" transform="rotate(18 20.5 24)" />
          <ellipse cx="43.5" cy="24" rx="4.2" ry="8.5" transform="rotate(-18 43.5 24)" />
          <path d="M46 55 C54 55 58 49 55 43" stroke="currentColor" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
