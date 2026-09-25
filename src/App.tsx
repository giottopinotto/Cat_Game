import { lazy, Suspense, useEffect, useState } from 'react';
import { releaseLocation, startLocation } from './game/location';
import { useGame } from './game/store';
import { MapHud } from './map/MapHud';
import { MapView } from './map/MapView';
import { AlbumScreen } from './screens/AlbumScreen';
import { AnimalScreen } from './screens/AnimalScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { DiaryScreen } from './screens/DiaryScreen';
import { FriendLink, FriendsScreen } from './screens/FriendsScreen';
import { Onboarding } from './screens/Onboarding';
import { ProfileScreen } from './screens/ProfileScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { useRoute } from './router';
import { BottomNav } from './ui/BottomNav';
import { Splash } from './ui/Splash';
import { Celebrations, Toasts } from './ui/Overlays';
import { useAppearance } from './ui/theme';

// La cattura (con la AI) si carica a parte: l'avvio dell'app resta leggero.
const CaptureScreen = lazy(() => import('./capture/CaptureScreen').then((m) => ({ default: m.CaptureScreen })));

// Aperta dalla scorciatoia "Cattura" (tenendo premuta l'icona): si prepara subito la
// fotocamera e il riconoscimento, mentre l'app finisce di caricare i dati.
const startedOnCapture = typeof location !== 'undefined' && location.hash.startsWith('#/cattura');
if (startedOnCapture) {
  void import('./capture/CaptureScreen').catch(() => {});
  void import('./vision/engine').then((m) => m.loadDetector()).catch(() => {});
}

const TABS = ['', 'collezione', 'album', 'profilo'];

export function App() {
  const ready = useGame((s) => s.ready);
  const onboarded = useGame((s) => s.player.onboarded);
  const gpsOnlyPhoto = useGame((s) => s.player.settings.gpsOnlyPhoto);
  // Pallino sull'album quando ci sono figurine nuove da vedere.
  const albumNew = useGame((s) => {
    const seen = new Set(s.player.albumSeen);
    return s.animals.some((a) => !seen.has(a.entryId));
  });
  const [page = '', param] = useRoute();
  // La mappa (pesante) parte solo quando serve: aprendo dalla scorciatoia "Cattura" aspetta.
  const [mapOn, setMapOn] = useState(!startedOnCapture);
  useEffect(() => {
    if (page !== 'cattura') setMapOn(true);
  }, [page]);
  useAppearance();

  useEffect(() => {
    void useGame.getState().init();
    const onVisible = () => document.visibilityState === 'visible' && useGame.getState().ensureToday();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // GPS sempre acceso, oppure solo mentre si fotografa (lo accende la schermata di cattura).
  useEffect(() => {
    if (!ready || !onboarded) return;
    if (gpsOnlyPhoto) {
      if (page !== 'cattura') releaseLocation();
    } else startLocation();
  }, [ready, onboarded, gpsOnlyPhoto, page]);

  useEffect(() => {
    if (!ready || !onboarded) return;
    // Scarica in anticipo i file della AI (solo rete, niente lavoro per il telefono):
    // la si prepara davvero quando si apre la fotocamera. Niente se c'è il risparmio dati.
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData) return;
    const t = setTimeout(() => void import('./vision/engine').then((m) => m.prefetchVision()).catch(() => {}), 8000);
    return () => clearTimeout(t);
  }, [ready, onboarded]);

  if (!ready) return <Splash />;
  if (!onboarded) return <Onboarding />;

  const known = TABS.includes(page) || ['animale', 'cattura', 'diario', 'amici', 'amico', 'premi'].includes(page);
  const route = known ? page : '';
  const tab = route === 'animale' ? 'collezione' : route === 'diario' || route === 'amici' || route === 'premi' ? 'profilo' : route;

  return (
    <>
      {mapOn && <MapView />}
      {route === '' && <MapHud />}
      {route === 'collezione' && <CollectionScreen />}
      {route === 'album' && <AlbumScreen entryId={param} key={param ? 'entry' : 'list'} />}
      {route === 'profilo' && <ProfileScreen />}
      {route === 'diario' && <DiaryScreen />}
      {route === 'premi' && <RewardsScreen />}
      {route === 'amici' && <FriendsScreen id={param} key={param ?? 'list'} />}
      {route === 'amico' && param && <FriendLink token={param} key={param} />}
      {route === 'animale' && param && <AnimalScreen id={param} />}
      {route === 'cattura' && (
        <Suspense fallback={<div className="capture" />}>
          <CaptureScreen />
        </Suspense>
      )}
      {(TABS.includes(route) || route === 'diario' || route === 'amici' || route === 'premi') && (
        <BottomNav active={tab} dots={albumNew && route !== 'album' ? ['album'] : []} />
      )}
      <Toasts />
      {route !== 'cattura' && <Celebrations />}
    </>
  );
}
