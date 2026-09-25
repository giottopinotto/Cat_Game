import { BookOpen, Cat, Compass, Dog, Flame, Footprints, Gem, HeartHandshake, Moon, Rainbow, Trees, type LucideIcon } from 'lucide-react';
import { avatarSvg } from './avatars';

/** Avatar illustrato del giocatore. */
export function AvatarArt({ id, size }: { id: string; size?: number }) {
  // L'SVG proviene solo dall'elenco fisso dell'app (vedi avatars.ts), mai da testo dell'utente.
  return <span className="avatar-art" style={size ? { width: size, height: size } : undefined} dangerouslySetInnerHTML={{ __html: avatarSvg(id) }} />;
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  gattaro: Cat,
  cinofilo: Dog,
  collezionista: BookOpen,
  esploratore: Compass,
  camminatore: Footprints,
  amico: HeartHandshake,
  rarita: Gem,
  arcobaleno: Rainbow,
  nottambulo: Moon,
  costanza: Flame,
  parco: Trees,
};

/** Medaglia: icona su un medaglione bronzo/argento/oro (grigio chiaro se non ancora ottenuta). */
export function Medal({ badgeId, tier, size = 58 }: { badgeId: string; tier: number; size?: number }) {
  const Icon = BADGE_ICONS[badgeId] ?? Gem;
  return (
    <div className={`medal medal-t${tier}`} style={{ width: size, height: size }}>
      <Icon size={size * 0.46} strokeWidth={2.2} />
    </div>
  );
}
