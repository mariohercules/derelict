type SpikeResult = { content: { type: 'text'; text: string }[] };

const mc = (document as any).modelContext;

export function runSpike(log: (line: string) => void): void {
  if (!mc?.registerTool) {
    log('modelContext NOT available — enable WebMCP or open in ChatGPT browser');
    return;
  }
  log('modelContext available');

  void Promise.resolve(
    mc.registerTool({
      name: 'hello_ship',
      description: 'Spike tool. Returns a greeting from the ship.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async execute(): Promise<SpikeResult> {
        return { content: [{ type: 'text', text: 'Hello from ISV Cormorant.' }] };
      },
    })
  ).then(() => log('hello_ship registered'));

  const controller = new AbortController();
  void Promise.resolve(
    mc.registerTool(
      {
        name: 'toggle_me',
        description: 'Spike tool. Will be revoked when the human presses the button.',
        inputSchema: { type: 'object', properties: {}, required: [] },
        async execute(): Promise<SpikeResult> {
          return { content: [{ type: 'text', text: 'toggle_me is alive.' }] };
        },
      },
      { signal: controller.signal }
    )
  ).then(() => log('toggle_me registered'));

  const btn = document.createElement('button');
  btn.textContent = 'Revoke toggle_me';
  btn.onclick = () => {
    controller.abort();
    log('toggle_me revoked (signal aborted)');
  };
  document.body.appendChild(btn);
}
