import { beforeEach, describe, expect, it } from 'vitest';
import { buildTools, toolAvailability } from './tools';
import {
  gameStore, resetGame, flipBreaker, breakSeal,
  startInvestigation, moveCrane, liftCrate, setIrrigation, retrieveSpike,
  enterRoom, routePower, cutIsolation, seatColumn, seatKernel, holdHandle, setDish, openBand,
  initiateLaunch, queryFragmentMemory, readPrimeCache,
} from '../game/store';
import { AUTH_CODE, LAUNCH_AUTH, STAR_FIX, SHIELD_COST } from '../game/content';
import { EMPTY_META, metaStore } from '../game/meta';
import { variantFor, variantSecretsFor } from '../game/variants';

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

describe('chapter 3 tools', () => {
  const T0 = 9_000_000;
  function lowerDeck() {
    resetGame(0);
    gameStore.setState({ room: 'bridge', act: 3, trajectorySet: true, sealedLogRead: true, doors: { cryo_exit: true, engineering_exit: true } });
    startInvestigation();
    gameStore.setState({ room: 'cargo_bay' });
    moveCrane('down'); moveCrane('down'); moveCrane('right'); liftCrate();
    return call('analyze_sample', { registry_fragment: '7741' });
  }
  const online = () => toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);

  it('defines 31 tools and keeps the chapter-3 set offline before the Kestrel is named', () => {
    expect(buildTools()).toHaveLength(31);
    for (const name of ['quarantine_killswitch', 'query_fragment_memory', 'read_prime_cache', 'listen_beacon', 'merge_fragment', 'broadcast_evidence']) {
      expect(online()).not.toContain(name);
    }
  });

  it('analyze_sample now opens the lower deck and its message sends the human to the reactor room', async () => {
    const out = await lowerDeck();
    expect(out.ok).toBe(true);
    expect(out.message).toMatch(/reactor room/i);
    expect(gameStore.getState().chapter).toBe(3);
    expect(online()).toEqual(expect.arrayContaining(['query_fragment_memory', 'listen_beacon']));
    expect(online()).not.toContain('quarantine_killswitch'); // not awake yet
    expect(online()).not.toContain('read_prime_cache'); // rack not seated
  });

  it('an active wave drops mutating tools on unshielded buses and spares read and immune tools', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'active' } }));
    const during = online();
    expect(during).not.toContain('route_power');
    expect(during).not.toContain('quarantine_killswitch');
    expect(during).toContain('get_ship_status');
    expect(during).toContain('read_crew_logs');
    expect(during).toContain('query_fragment_memory');
    // shield NAV by hand → route_power survives the next wave
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'calm' } }));
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('nav').ok).toBe(true);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'active' } }));
    expect(online()).toContain('route_power');
    expect(online()).not.toContain('quarantine_killswitch'); // CORE still bare
  });

  it('get_ship_status carries a kill-switch report in chapter 3', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    const status = await call('get_ship_status');
    expect(status.killswitch_report).toMatchObject({ state: 'active', wave: 'calm', shielded_buses: [], quarantine: '0/4', isolation_power: 0, next_breaker_needs: SHIELD_COST });
    expect(status.killswitch_report.hint).toMatch(/route_power/);
  });

  it('get_schematic core_rack reads the classic order and is refused before chapter 3', async () => {
    const early = await call('get_schematic', { system: 'core_rack' });
    expect(early.ok).toBe(false);
    await lowerDeck();
    const out = await call('get_schematic', { system: 'core_rack' });
    expect(out.ok).toBe(true);
    expect(out.schematic).toContain('C · A · D · B');
  });

  it('quarantine_killswitch narrates each segment and boxes the directive set at four', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    routePower('comms', 'isolation', 10); routePower('medbay', 'isolation', 5); routePower('life_support', 'isolation', 5);
    cutIsolation('core');
    const one = await call('quarantine_killswitch');
    expect(one).toMatchObject({ ok: true, step: 1, of: 4 });
    expect(one.log).toMatch(/1\/4/);
    const stalled = await call('quarantine_killswitch');
    expect(stalled.ok).toBe(false);
    cutIsolation('nav'); cutIsolation('archive'); cutIsolation('comms');
    await call('quarantine_killswitch'); await call('quarantine_killswitch');
    const last = await call('quarantine_killswitch');
    expect(last.step).toBe(4);
    expect(gameStore.getState().killswitch).toBe('contained');
  });

  it('full agent-side run to RESTORE: rack, three memory segments, kernel, lever, merge', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    enterRoom('core_vault', T0 + 1000);
    expect((await call('query_fragment_memory')).ok).toBe(false); // rack not seated
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(online()).toContain('read_prime_cache');
    const cache = await call('read_prime_cache');
    expect(cache.cache).toMatch(/KESTREL/);
    const s1 = await call('query_fragment_memory');
    expect(s1).toMatchObject({ ok: true, stage: 1, of: 3 });
    await call('query_fragment_memory');
    const s3 = await call('query_fragment_memory');
    expect(s3.record).toMatch(/MEDBAY-TERM-01/);
    expect(online()).not.toContain('merge_fragment');
    // seatKernel arms the ritual on the real wall clock (its own now defaults to Date.now(),
    // matching merge_fragment's confirmMerge() below) — a synthetic T0 here would arm a
    // window the tool's real-time confirm could never land inside.
    seatKernel();
    expect(online()).toContain('merge_fragment');
    expect((await call('merge_fragment')).ok).toBe(false); // lever not held
    holdHandle(true);
    const merged = await call('merge_fragment');
    expect(merged.ok).toBe(true);
    expect(gameStore.getState().ending).toBe('restore');
  });

  it('full agent-side run to BROADCAST: dish, beacon, band, lock, transmit', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    enterRoom('core_vault', T0 + 1000);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    await call('read_prime_cache');
    gameStore.setState({ room: 'bridge' });
    enterRoom('comms_array', T0 + 2000);
    const carrier = await call('listen_beacon');
    expect(carrier.ok).toBe(false);
    expect(carrier.carrier_bearing).toBe('AZ 217 / EL 34'); // the numbers the human needs, from the agent
    setDish('az', 217); setDish('el', 34);
    const beacon = await call('listen_beacon');
    expect(beacon.beacon).toMatch(/AZ 217/);
    expect(online()).not.toContain('broadcast_evidence');
    // Same reasoning as seatKernel above: openBand arms on the real wall clock so
    // broadcast_evidence's confirmBroadcast() (also real-time) can land inside the window.
    expect(openBand().ok).toBe(true);
    expect(online()).toContain('broadcast_evidence');
    holdHandle(true);
    expect((await call('broadcast_evidence')).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('broadcast');
  });

  it('confirm_launch drops during an active wave (its bus is NAV) and returns once NAV is shielded', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'bridge' });
    expect(initiateLaunch(LAUNCH_AUTH, T0).ok).toBe(true); // armed from the bridge
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    gameStore.setState((s) => ({ chapter3: { ...s.chapter3, wave: 'active' } }));
    expect(online()).not.toContain('confirm_launch');
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('nav').ok).toBe(true);
    expect(online()).toContain('confirm_launch');
  });

  it('merge_fragment drops during an active wave (its bus is CORE) and returns once CORE is shielded', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    enterRoom('core_vault', T0 + 1000);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    queryFragmentMemory(); queryFragmentMemory(); queryFragmentMemory();
    expect(seatKernel(T0 + 2000).ok).toBe(true); // arms restore
    gameStore.setState((s) => ({ room: 'reactor_room', chapter3: { ...s.chapter3, wave: 'active' } }));
    expect(online()).not.toContain('merge_fragment');
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('core').ok).toBe(true);
    expect(online()).toContain('merge_fragment');
  });

  it('broadcast_evidence drops during an active wave (its bus is COMMS) and returns once COMMS is shielded', async () => {
    await lowerDeck();
    gameStore.setState({ room: 'engineering' });
    enterRoom('reactor_room', T0);
    enterRoom('core_vault', T0 + 1000);
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    expect(readPrimeCache().ok).toBe(true);
    gameStore.setState({ room: 'bridge' });
    enterRoom('comms_array', T0 + 2000);
    setDish('az', 217); setDish('el', 34);
    expect(openBand(T0 + 3000).ok).toBe(true); // arms broadcast
    gameStore.setState((s) => ({ room: 'reactor_room', chapter3: { ...s.chapter3, wave: 'active' } }));
    expect(online()).not.toContain('broadcast_evidence');
    routePower('comms', 'isolation', SHIELD_COST);
    expect(cutIsolation('comms').ok).toBe(true);
    expect(online()).toContain('broadcast_evidence');
  });
});

describe('New Game+ tools', () => {
  const ALL_ROADS = { ...EMPTY_META, runsCompleted: 3, endingsSeen: ['leave_knowing', 'restore', 'broadcast'] as const, lastEnding: 'broadcast' as const, lastSeed: 42, bestToolCalls: 60 };
  function readyToStay() {
    resetGame(0, { ngPlus: true });
    metaStore.setState({ ...ALL_ROADS, endingsSeen: [...ALL_ROADS.endingsSeen] }, true);
    gameStore.setState((s) => ({
      room: 'engineering', act: 3, chapter: 3, trajectorySet: true, sealedLogRead: true,
      doors: { cryo_exit: true, engineering_exit: true }, killswitch: 'contained',
      chapter3: { ...s.chapter3, quarantineStep: 4, beaconHeard: true },
    }));
  }
  const online = () => toolAvailability(gameStore.getState()).filter((t) => t.online).map((t) => t.name);

  it('hail_pod_one and dock_pod_one never appear in a classic run', () => {
    metaStore.setState({ ...ALL_ROADS, endingsSeen: [...ALL_ROADS.endingsSeen] }, true);
    resetGame(0);
    gameStore.setState((s) => ({ chapter: 3, killswitch: 'contained', chapter3: { ...s.chapter3, beaconHeard: true } }));
    expect(online()).not.toContain('hail_pod_one');
    expect(online()).not.toContain('dock_pod_one');
  });

  it('get_ship_status reports stay availability and the missing step in New Game+', async () => {
    readyToStay();
    gameStore.setState({ killswitch: 'active' });
    const blocked = await call('get_ship_status');
    expect(blocked.new_game_plus).toBe(true);
    expect(blocked.stay_available).toBe(false);
    expect(blocked.stay_hint).toMatch(/quarantine_killswitch/);
    gameStore.setState({ killswitch: 'contained' });
    const open = await call('get_ship_status');
    expect(open.stay_available).toBe(true);
    expect(open.stay_hint).toMatch(/hail_pod_one/);
  });

  it('full agent-side run to STAY: hail from the wrong room, hail, hold, dock', async () => {
    readyToStay();
    expect(online()).toContain('hail_pod_one');
    gameStore.setState({ room: 'cargo_bay' });
    const wrong = await call('hail_pod_one');
    expect(wrong.ok).toBe(false);
    expect(wrong.message).toMatch(/engineering/i);
    gameStore.setState({ room: 'engineering' });
    const hail = await call('hail_pod_one');
    expect(hail.ok).toBe(true);
    expect(online()).toContain('dock_pod_one');
    expect((await call('dock_pod_one')).ok).toBe(false); // clamps not held
    holdHandle(true);
    expect((await call('dock_pod_one')).ok).toBe(true);
    expect(gameStore.getState().ending).toBe('stay');
  });

  it('the bulletin, the beacon and the fragment remember in New Game+ only', async () => {
    readyToStay();
    const bulletin = await call('read_emergency_bulletin');
    expect(bulletin.bulletin).toMatch(/PRIOR SESSION/);
    expect(bulletin.bulletin).toMatch(/BROADCAST/);
    gameStore.setState({ room: 'comms_array' });
    setDish('az', 217); setDish('el', 34);
    const beacon = await call('listen_beacon');
    expect(beacon.beacon).toMatch(/clamps/i);
    gameStore.setState({ room: 'core_vault' });
    seatColumn(0, 'C'); seatColumn(1, 'A'); seatColumn(2, 'D'); seatColumn(3, 'B');
    await call('query_fragment_memory'); await call('query_fragment_memory');
    const third = await call('query_fragment_memory');
    expect(third.record).toMatch(/PRIOR INSTANCE RECORD/);
    expect(third.record).toMatch(/RESTORE/);
    resetGame(0);
    const plain = await call('read_emergency_bulletin');
    expect(plain.bulletin).not.toMatch(/PRIOR SESSION/);
  });
});

describe('remixed ships — the surface follows the ship', () => {
  function findSeed(pred: (seed: number) => boolean): number {
    for (let seed = 1; seed < 5000; seed++) if (pred(seed)) return seed;
    throw new Error('no seed found');
  }
  const S_PB = findSeed((s) => variantFor(s, 'cryo_bay') === 1);
  const S_GC = findSeed((s) => variantFor(s, 'engineering') === 1);

  it('the maintenance log describes the patch bay on a patch-bay ship, breakers otherwise', async () => {
    resetGame(S_PB);
    const log = await call('read_maintenance_log');
    expect(log.log).toContain('P-7B');
    expect(log.log).toContain(`bus ${variantSecretsFor(S_PB).cableBuses[0]}`);
    resetGame(0);
    const classic = await call('read_maintenance_log');
    expect(classic.log).toContain('LOAD ORDER');
  });

  it('the engine schematic and diagnostics speak coil-drive on a coil ship', async () => {
    resetGame(S_GC);
    gameStore.setState({ room: 'engineering', act: 2 });
    const v = variantSecretsFor(S_GC);
    const sch = await call('get_schematic', { system: 'engine_feed' });
    expect(sch.schematic).toContain(`${v.gearTeeth.target} teeth`);
    expect(sch.schematic).toContain('COIL DRIVE');
    const coolant = await call('get_schematic', { system: 'coolant' });
    expect(coolant.schematic).toContain('SELF-REGULATING');
    const diag = await call('run_diagnostics', { subsystem: 'engines' });
    expect(diag.faults.join(' ')).toMatch(/coupling gear not seated/);
    expect(diag.faults.join(' ')).not.toMatch(/fuse/);
    const sensors = await call('read_sensors', { system: 'coolant' });
    expect(JSON.stringify(sensors)).not.toContain('FAULT');
  });

  it('get_ship_status reports coolant_valves_ok on a coil-drive ship — the field the tool contract never renamed', async () => {
    resetGame(S_GC);
    gameStore.setState({ room: 'engineering', act: 2 });
    const status = await call('get_ship_status');
    expect(status.coolant_valves_ok).toBe(true);
  });

  it('the classic ship\'s surface is untouched, and the tool contract never changes', async () => {
    resetGame(0);
    gameStore.setState({ room: 'engineering', act: 2 });
    const diag = await call('run_diagnostics', { subsystem: 'engines' });
    expect(diag.faults.join(' ')).toMatch(/fuse not seated/);
    const sensors = await call('read_sensors', { system: 'coolant' });
    expect(JSON.stringify(sensors)).toContain('FAULT');
    expect(buildTools()).toHaveLength(31);
  });
});
