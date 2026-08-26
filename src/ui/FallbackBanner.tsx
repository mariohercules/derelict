export function FallbackBanner() {
  return (
    <div className="panel" style={{ margin: 16, borderColor: 'var(--red)' }}>
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
    </div>
  );
}
