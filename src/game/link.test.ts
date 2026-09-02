import { beforeEach, describe, expect, it } from 'vitest';
import { LINK_CAPACITY, clearLink, linkStore, pushLinkEvent, summarizeInput } from './link';
import { resetGame } from './store';

beforeEach(() => clearLink());

describe('the link buffer', () => {
  it('keeps the newest LINK_CAPACITY events, oldest first', () => {
    for (let i = 0; i < LINK_CAPACITY + 1; i++) pushLinkEvent({ kind: 'call', at: i, tool: `t${i}`, input: '', status: 'ok' });
    const events = linkStore.getState().events;
    expect(events).toHaveLength(LINK_CAPACITY);
    expect(events[0]).toMatchObject({ tool: 't1' });
    expect(events[LINK_CAPACITY - 1]).toMatchObject({ tool: `t${LINK_CAPACITY}` });
  });

  it('clears, and a new run starts empty', () => {
    pushLinkEvent({ kind: 'link', at: 1, online: ['a'], offline: [] });
    clearLink();
    expect(linkStore.getState().events).toEqual([]);
    pushLinkEvent({ kind: 'link', at: 2, online: ['b'], offline: [] });
    resetGame(0);
    expect(linkStore.getState().events).toEqual([]);
  });
});

describe('summarizeInput', () => {
  it('renders key=value pairs; arrays with commas; nested objects as JSON; skips undefined', () => {
    expect(summarizeInput({ door: 'cryo_exit', code: '0407' })).toBe('door=cryo_exit code=0407');
    expect(summarizeInput({ symbols: ['KAV', 'ORO', 'SET'] })).toBe('symbols=KAV,ORO,SET');
    expect(summarizeInput({ dish: { az: 217, el: 34 } })).toBe('dish={"az":217,"el":34}');
    expect(summarizeInput({ amount: 20, skip: undefined })).toBe('amount=20');
  });

  it('is empty for no input or a non-object, and truncates long inputs with an ellipsis', () => {
    expect(summarizeInput({})).toBe('');
    expect(summarizeInput('abc' as unknown as Record<string, unknown>)).toBe('');
    const long = summarizeInput({ authorization: 'X'.repeat(80) });
    expect(long).toHaveLength(48);
    expect(long.endsWith('…')).toBe(true);
  });
});
