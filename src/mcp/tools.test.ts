import { beforeEach, describe, expect, it } from 'vitest';
import { buildTools, toolAvailability } from './tools';
import {
  gameStore, resetGame, flipBreaker, breakSeal,
  startInvestigation, moveCrane, liftCrate, setIrrigation, retrieveSpike,
} from '../game/store';
import { AUTH_CODE, LAUNCH_AUTH, STAR_FIX } from '../game/content';

beforeEach(() => resetGame(0));

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
      ['get_deck_map', 'get_ship_status', 'ping_subsystems', 'read_emergency_bulletin', 'read_maintenance_log'].sort()
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

describe('agent steering (anti-deflection)', () => {
  // Regression guard for a real playtest failure: an agent told the human to
  // "type the code into the page" instead of calling the tool itself.
  it('unlock_door description forbids the imaginary keypad and demands a self-call', () => {
    const desc = buildTools().find((t) => t.name === 'unlock_door')!.definition.description;
    expect(desc).toMatch(/no keypad/i);
    expect(desc).toMatch(/call this tool/i);
  });

  it('initiate_launch_sequence description demands a self-call for the authorization', () => {
    const desc = buildTools().find((t) => t.name === 'initiate_launch_sequence')!.definition.description;
    expect(desc).toMatch(/call(ing)? this tool/i);
  });

  it('get_ship_status note states the interaction contract', () => {
    const tools = buildTools();
    const status = tools.find((t) => t.name === 'get_ship_status')!;
    return status.definition.execute({}).then((res) => {
      const note = (JSON.parse(res.content[0].text) as { note: string }).note;
      expect(note).toMatch(/calling tools/i);
    });
  });
});

describe('tool handlers', () => {
  it('unlock_door happy path via the tool surface', async () => {
    powerOn();
    const out = await call('unlock_door', { door: 'cryo_exit', auth_code: AUTH_CODE });
    expect(out.ok).toBe(true);
    expect(gameStore.getState().doors.cryo_exit).toBe(true);
  });

  it('unlock_door infers cryo_exit when the agent sends only the code', async () => {
    // Playtest regression: two different agents called unlock_door(0407) bare.
    powerOn();
    const out = await call('unlock_door', { auth_code: AUTH_CODE });
    expect(out.ok).toBe(true);
    expect(gameStore.getState().doors.cryo_exit).toBe(true);
  });

  it('unlock_door tolerates a numeric code that lost its leading zero', async () => {
    powerOn();
    const out = await call('unlock_door', { door: 'cryo_exit', auth_code: 407 });
    expect(out.ok).toBe(true);
    expect(gameStore.getState().doors.cryo_exit).toBe(true);
  });

  it('a bare unlock_door call targets the next locked door in progression', async () => {
    powerOn();
    await call('unlock_door', { auth_code: AUTH_CODE });
    gameStore.setState((s) => ({
      act: 2,
      room: 'engineering',
      powerAllocation: { ...s.powerAllocation, doors: 5, comms: 5 },
    }));
    const out = await call('unlock_door', {});
    expect(out.ok).toBe(true);
    expect(gameStore.getState().doors.engineering_exit).toBe(true);
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

  it('route_power with invalid subsystem returns error and leaves powerAllocation unchanged', async () => {
    gameStore.setState({ act: 2, room: 'engineering' });
    const before = JSON.stringify(gameStore.getState().powerAllocation);
    const out = await call('route_power', { from: 'warp_core', to: 'engines', amount: 10 });
    expect(out.ok).toBe(false);
    const after = JSON.stringify(gameStore.getState().powerAllocation);
    expect(before).toBe(after);
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
    gameStore.setState({ act: 3, room: 'bridge', starFixTaken: true });
    await call('compute_escape_trajectory', { symbols: [...STAR_FIX] });
    const init = await call('initiate_launch_sequence', { authorization: LAUNCH_AUTH });
    expect(init.ok).toBe(true);
    gameStore.setState((s) => ({ ritual: { ...s.ritual, held: true } }));
    const conf = await call('confirm_launch');
    expect(conf.ok).toBe(true);
    expect(gameStore.getState().won).toBe(true);
  });

  it('read_sealed_log is offline until the human breaks the seal, then returns the 94-second line', async () => {
    gameStore.setState({ act: 3, room: 'bridge', starFixTaken: true, trajectorySet: true });
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'read_sealed_log')!.online).toBe(false);
    const status1 = await call('get_ship_status');
    expect(status1.sealed_log).toBe('unread');
    expect(status1.sealed_log_hint).toBe('The crew member breaks the seal by hand at the launch console; you cannot open it.');
    breakSeal();
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'read_sealed_log')!.online).toBe(true);
    const out = await call('read_sealed_log');
    expect(out.ok).toBe(true);
    expect(out.text).toMatch(/94 seconds/);
    const status2 = await call('get_ship_status');
    expect(status2.sealed_log).toBe('read');
    expect(status2.sealed_log_hint).toBeUndefined();
  });

  it('get_deck_map lists every compartment with its status', async () => {
    const out = await call('get_deck_map');
    expect(out.ok).toBe(true);
    expect(out.rooms).toHaveLength(10);
    const byId = Object.fromEntries(out.rooms.map((r: { id: string; status: string }) => [r.id, r.status]));
    expect(byId.cryo_bay).toBe('current');
    expect(byId.engineering).toBe('locked');
    expect(byId.core_vault).toBe('sealed');
  });
});

describe('chapter 2 tools', () => {
  function investigating() {
    resetGame(0);
    gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true });
    startInvestigation();
  }

  it('the seven tools are offline in chapter 1 and gated correctly in chapter 2', async () => {
    const offline = ['read_medbay_records', 'trace_command_origin', 'decrypt_private_log', 'run_irrigation', 'read_data_spike', 'query_manifest', 'analyze_sample'];
    const before = toolAvailability(gameStore.getState()).filter((t) => offline.includes(t.name));
    expect(before.every((t) => !t.online)).toBe(true);
    investigating();
    const online = toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);
    expect(online).toEqual(expect.arrayContaining(['read_medbay_records', 'trace_command_origin', 'run_irrigation', 'query_manifest']));
    expect(online).not.toContain('decrypt_private_log');
    expect(online).not.toContain('read_data_spike');
    expect(online).not.toContain('analyze_sample');
  });

  it('the manifest now carries Vasquez\'s commission number', async () => {
    gameStore.setState({ auxPower: true });
    const out = await call('access_crew_manifest');
    expect(out.manifest).toContain('2263941');
  });

  it('query_manifest names the quarantine slot and analyze_sample closes the chapter', async () => {
    investigating();
    const m = await call('query_manifest');
    expect(m.quarantine_slot).toBe('C2');
    gameStore.setState({ room: 'cargo_bay' });
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    const bad = await call('analyze_sample', { registry_fragment: 1234 });
    expect(bad.ok).toBe(false);
    const good = await call('analyze_sample', { registry_fragment: '7741' });
    expect(good.ok).toBe(true);
    expect(good.analysis).toMatch(/KESTREL/);
    const status = await call('get_ship_status');
    expect(status.killswitch).toBe('stirring');
  });

  it('run_irrigation reports bed states and read_data_spike unlocks after retrieval', async () => {
    investigating();
    setIrrigation(0, 4); setIrrigation(1, 3); setIrrigation(2, 3);
    const r = await call('run_irrigation');
    expect(r.beds).toEqual(['ok', 'ok', 'ok']);
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'read_data_spike')!.online).toBe(false);
    retrieveSpike();
    const spike = await call('read_data_spike');
    expect(spike.ok).toBe(true);
    expect(spike.telemetry).toMatch(/01:34/);
  });

  it('analyze_sample is offline before liftCrate() and online after; calling it early refuses without touching the killswitch', async () => {
    investigating();
    gameStore.setState({ room: 'cargo_bay' });
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'analyze_sample')!.online).toBe(false);
    const early = await call('analyze_sample', { registry_fragment: '7741' });
    expect(early.ok).toBe(false);
    expect(gameStore.getState().killswitch).toBe('dormant');
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    expect(toolAvailability(gameStore.getState()).find((t) => t.name === 'analyze_sample')!.online).toBe(true);
    const late = await call('analyze_sample', { registry_fragment: '7741' });
    expect(late.ok).toBe(true);
    expect(gameStore.getState().killswitch).toBe('stirring');
  });

  it('get_deck_map reflects chapter-2 room status from the bridge after startInvestigation', async () => {
    investigating();
    // a real crew member cannot reach the bridge without both doors open
    gameStore.setState({ doors: { cryo_exit: true, engineering_exit: true } });
    const out = await call('get_deck_map');
    const byId = Object.fromEntries(
      (out.rooms as { id: string; status: string; adjacent: boolean }[]).map((r) => [r.id, r])
    );
    expect(byId.hydroponics.status).toBe('open');
    expect(byId.engineering.status).toBe('open');
    expect(byId.medbay).toMatchObject({ status: 'locked', adjacent: false });
    expect(byId.comms_array.status).toBe('sealed');
  });
});
