import offline from '../assets/cryo-room-offline.webp';
import offlineSmall from '../assets/cryo-room-offline-small.webp';
import powered from '../assets/cryo-room-powered.webp';
import poweredSmall from '../assets/cryo-room-powered-small.webp';
import open from '../assets/cryo-room-open.webp';
import openSmall from '../assets/cryo-room-open-small.webp';

const PLATES = [
  { state: 'offline', src: offline, small: offlineSmall },
  { state: 'powered', src: powered, small: poweredSmall },
  { state: 'open', src: open, small: openSmall },
];

// Decorative photography follows public room state, never puzzle secrets.
export function CryoChamber({ auxPower, unlocked }: { auxPower: boolean; unlocked: boolean }) {
  const state = unlocked ? 'open' : auxPower ? 'powered' : 'offline';
  return (
    <div className="cryo-room-art" aria-hidden="true" data-room-state={state}>
      {PLATES.map((plate) => (
        <picture key={plate.state} className="cryo-room-plate" data-visible={plate.state === state}>
          <source media="(max-width: 900px)" srcSet={`${plate.small} 960w, ${plate.src} 1672w`} sizes="100vw" />
          <img src={plate.src} width="1672" height="941" alt="" decoding="async" />
        </picture>
      ))}
      <div className="cryo-room-shade" />
      <div className="cryo-room-vapor"><i /><i /></div>
    </div>
  );
}
