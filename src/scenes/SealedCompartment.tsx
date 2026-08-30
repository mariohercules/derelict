import { useGame } from '../ui/useGame';
import { useStrings } from '../ui/useLocale';

export function SealedCompartment() {
  const stirring = useGame((s) => s.killswitch === 'stirring');
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.sealed.title}</h2>
        <p className={stirring ? 'status-bad' : 'status-dim'}>{stirring ? t.sealed.stirring : t.sealed.body}</p>
      </div>
    </div>
  );
}
