import { useGame } from '../game/store';
import { Logo } from './common';
import type { LevelReward } from './cosmetics';
import { AvatarArt } from './icons';

/** Anteprima disegnata di un premio: l'avatar, la cornice, lo sfondo o il pacchetto. */
export function RewardPreview({ reward, size = 56 }: { reward: Pick<LevelReward, 'kind' | 'id'>; size?: number }) {
  const avatar = useGame((s) => s.player.avatar);
  switch (reward.kind) {
    case 'avatar':
      return (
        <span className="avatar" style={{ width: size, height: size }}>
          <AvatarArt id={reward.id} />
        </span>
      );
    case 'cornice':
      return (
        <span className={`avatar frame-${reward.id}`} style={{ width: size, height: size }}>
          <AvatarArt id={avatar} />
        </span>
      );
    case 'sfondo':
      return <span className={`profile-head banner-swatch banner-${reward.id}`} style={{ width: size * 1.5, height: size * 0.8 }} />;
    case 'pacchetto':
      return (
        <span className={`pack pack-mini r-raro skin-${reward.id}`} style={{ width: size * 0.72, height: size }}>
          <Logo size={size * 0.42} className="logo" />
        </span>
      );
  }
}
