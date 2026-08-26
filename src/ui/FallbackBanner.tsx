import { useLocale } from './useLocale';

export function FallbackBanner() {
  const locale = useLocale();
  return (
    <div className="panel" style={{ margin: 16, borderColor: 'var(--red)' }}>
      {locale === 'pt-BR' ? (
        <>
          <h2 style={{ color: 'var(--red)' }}>Link com a IA rompido</h2>
          <p>
            DERELICT se joga <em>junto com o seu agente de IA</em> — e este navegador não expõe WebMCP,
            então sua IA não consegue alcançar a nave.
          </p>
          <p>
            Abra esta página no <strong>navegador do app do ChatGPT</strong> (WebMCP funciona de fábrica), ou no{' '}
            <strong>Chrome 149+</strong> após ativar <code>chrome://flags/#enable-webmcp-testing</code>.
          </p>
          <p className="status-dim">Você ainda pode andar pela nave sozinho. É bem silencioso.</p>
        </>
      ) : (
        <>
          <h2 style={{ color: 'var(--red)' }}>AI link severed</h2>
          <p>
            DERELICT is played <em>together with your AI agent</em> — and this browser is not exposing WebMCP,
            so your AI cannot reach the ship.
          </p>
          <p>
            Open this page in the <strong>ChatGPT app's browser</strong> (WebMCP works out of the box), or in{' '}
            <strong>Chrome 149+</strong> after enabling <code>chrome://flags/#enable-webmcp-testing</code>.
          </p>
          <p className="status-dim">You can still walk the ship alone. It is very quiet.</p>
        </>
      )}
    </div>
  );
}
