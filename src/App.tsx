import { lazy, Suspense, useEffect } from 'react';
import { startLocation } from './game/location';
import { useGame } from './game/store';
import { MapHud } from './map/MapHud';
import { MapView } from './map/MapView';
import { useRoute } from './router';
import { AlbumScreen } from './screens/AlbumScreen';
import { AnimalScreen } from './screens/AnimalScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { Onboarding } from './screens/Onboarding';
import { ProfileScreen } from './screens/ProfileScreen';
import { BottomNav } from './ui/BottomNav';
import { Logo } from './ui/common';
import { Celebrations, Toasts } from './ui/Overlays';

// La cattura (con la AI) si carica a parte: l'avvio dell'app resta leggero.
const CaptureScreen = lazy(() => import('./capture/CaptureScreen').then((m) => ({ default: m.CaptureScreen })));

const TABS = ['', 'collezione', 'album', 'profilo'];

export function App() {
  const ready = useGame((s) => s.ready);
  const onboarded = useGame((s) => s.player.onboarded);
  const [page = '', param] = useRoute();

  useEffect(() => {
    void useGame.getState().init();
    const onVisible = () => document.visibilityState === 'visible' && useGame.getState().ensureToday();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (!ready || !onboarded) return;
    startLocation();
    // Prepara la AI in anticipo, così la prima cattura è immediata (salvo risparmio dati).
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData) return;
    const t = setTimeout(() => void import('./vision/engine').then((m) => m.loadVision()).catch(() => {}), 5000);
    return () => clearTimeout(t);
  }, [ready, onboarded]);

  if (!ready) {
    return (
      <div className="onboarding" style={{ justifyContent: 'center' }}>
        <Logo />
      </div>
    );
  }
  if (!onboarded) return <Onboarding />;

  const known = TABS.includes(page) || ['animale', 'cattura'].includes(page);
  const route = known ? page : '';
  const tab = route === 'animale' ? 'collezione' : route;

  return (
    <>
      <MapView />
      {route === '' && <MapHud />}
      {route === 'collezione' && <CollectionScreen />}
      {route === 'album' && <AlbumScreen entryId={param} key={param ? 'entry' : 'list'} />}
      {route === 'profilo' && <ProfileScreen />}
      {route === 'animale' && param && <AnimalScreen id={param} />}
      {route === 'cattura' && (
        <Suspense fallback={<div className="capture" />}>
          <CaptureScreen />
        </Suspense>
      )}
      {TABS.includes(route) && <BottomNav active={tab} />}
      <Toasts />
      {route !== 'cattura' && <Celebrations />}
    </>
  );
}
