import { useStrings } from '../ui/useLocale';

export function SealedCompartment() {
  const t = useStrings();
  return (
    <div className="scene">
      <div className="panel">
        <h2>{t.sealed.title}</h2>
        <p className="status-dim">{t.sealed.body}</p>
      </div>
    </div>
  );
}
