import { beforeEach, describe, expect, it } from 'vitest';
import { buildTools, toolAvailability } from './tools';
import { gameStore, resetGame, flipBreaker } from '../game/store';
import { AUTH_CODE, LAUNCH_AUTH, STAR_FIX } from '../game/content';

beforeEach(() => resetGame());

function powerOn() {
  flipBreaker('C'); flipBreaker('A'); flipBreaker('B');
}

async function call(name: string, input: unknown = {}) {
  const tool = buildTools().find((t) => t.name === name)!;
  const res = await tool.definition.execute(input);
  return JSON.parse(res.content[0].text);
}

describe('availability gating', () => {
  it('starts with only the always-on tools', () => {
    const online = toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);
    expect(online.sort()).toEqual(
      ['get_ship_status', 'ping_subsystems', 'read_emergency_bulletin', 'read_maintenance_log'].sort()
    );
  });

  it('brings crew manifest and door control online with aux power', () => {
    powerOn();
    const online = toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);
    expect(online).toContain('access_crew_manifest');
    expect(online).toContain('unlock_door');
  });

  it('confirm_launch is online only during a countdown', () => {
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'confirm_launch')!.online).toBe(false);
  });
});

describe('tool handlers', () => {
  it('unlock_door happy path via the tool surface', async () => {
    powerOn();
    const out = await call('unlock_door', { door: 'cryo_exit', auth_code: AUTH_CODE });
    expect(out.ok).toBe(true);
    expect(gameStore.getState().doors.cryo_exit).toBe(true);
  });

  it('unlock_door returns an in-fiction error for a bad door id (never throws)', async () => {
    powerOn();
    const out = await call('unlock_door', { door: 'airlock_9', auth_code: AUTH_CODE });
    expect(out.ok).toBe(false);
  });

  it('read_sensors marks the coolant manifold sensor as FAULT', async () => {
    gameStore.setState({ act: 2, room: 'engineering' });
    const out = await call('read_sensors', { system: 'coolant' });
    expect(out.ok).toBe(true);
    expect(JSON.stringify(out)).toContain('FAULT');
  });

  it('read_crew_logs refuses entries that are not yet unlocked', async () => {
    gameStore.setState({ act: 2, room: 'engineering' });
    const out = await call('read_crew_logs', { entry_id: 5 });
    expect(out.ok).toBe(false);
  });

  it('every tool call increments the toolCalls counter', async () => {
    await call('get_ship_status');
    await call('ping_subsystems');
    expect(gameStore.getState().toolCalls).toBe(2);
  });

  it('full agent-side run to victory', async () => {
    powerOn();
    await call('unlock_door', { door: 'cryo_exit', auth_code: AUTH_CODE });
    gameStore.setState({ act: 2, room: 'engineering' });
    await call('route_power', { from: 'life_support', to: 'engines', amount: 10 });
    await call('route_power', { from: 'medbay', to: 'engines', amount: 5 });
    await call('route_power', { from: 'comms', to: 'engines', amount: 5 });
    await call('route_power', { from: 'comms', to: 'doors', amount: 5 });
    gameStore.setState({ fuseInstalled: '10A', valveSettings: [6, 3, 7] });
    await call('unlock_door', { door: 'engineering_exit' });
    gameStore.setState({ act: 3, room: 'bridge' });
    await call('compute_escape_trajectory', { symbols: [...STAR_FIX] });
    const init = await call('initiate_launch_sequence', { authorization: LAUNCH_AUTH });
    expect(init.ok).toBe(true);
    gameStore.setState((s) => ({ launch: { ...s.launch, handleHeld: true } }));
    const conf = await call('confirm_launch');
    expect(conf.ok).toBe(true);
    expect(gameStore.getState().won).toBe(true);
  });
});
