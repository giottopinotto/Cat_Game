import { BookOpen, Camera, LayoutGrid, Map, User } from 'lucide-react';
import { go } from '../router';

const TABS = [
  { path: '', label: 'Mappa', Icon: Map },
  { path: 'collezione', label: 'Collezione', Icon: LayoutGrid },
  null,
  { path: 'album', label: 'Album', Icon: BookOpen },
  { path: 'profilo', label: 'Profilo', Icon: User },
];

// Dalla mappa si "entra" in una scheda (il tasto indietro riporta alla mappa);
// tra una scheda e l'altra invece si sostituisce la pagina corrente.
export function BottomNav({ active, dots = [] }: { active: string; dots?: string[] }) {
  return (
    <nav className="nav">
      {TABS.map((t) =>
        t ? (
          <button key={t.path} className={`nav-item ${active === t.path ? 'active' : ''}`} onClick={() => t.path !== active && go(t.path, active !== '')}>
            <t.Icon size={25} strokeWidth={2.3} />
            {dots.includes(t.path) && <i className="nav-dot" aria-label="Novità" />}
            {t.label}
          </button>
        ) : (
          <button key="capture" className="nav-capture" aria-label="Cattura" onClick={() => go('cattura')}>
            <Camera size={34} strokeWidth={2.4} />
          </button>
        ),
      )}
    </nav>
  );
}
