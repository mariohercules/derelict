import type { BusId, GameState, SubsystemId } from '../game/types';
import type { GameTool, ToolResult } from './registry';
import {
  gameStore, bumpToolCalls, unlockDoor, routePower, computeTrajectory, initiateLaunch, confirmLaunch,
  traceCommand, decryptPrivateLog, runIrrigation, analyzeSample,
  quarantineKillswitch, queryFragmentMemory, readPrimeCache, hearBeacon, confirmMerge, confirmBroadcast,
  hailPodOne, confirmDock,
} from '../game/store';
import { coilsCorrect, enginesOnline, gearCorrect, logsAvailable, nextShieldCost, rackCorrect, stayAvailable, stayBlocker, valvesCorrect } from '../game/derived';
import type { StayBlocker } from '../game/derived';
import { BUSES, CORRECT_FUSE, ENGINES_REQUIRED, LIFE_SUPPORT_MIN } from '../game/content';
import { ROOMS, edgeBetween, roomStatus } from '../game/rooms';
import { isArmed } from '../game/ritual';
import { suppressed } from '../game/killswitch';
import { getMemory } from '../game/meta';
import { variantFor } from '../game/variants';
import {
  getBeaconMessage, getCargoManifest, getCommandTrace, getCrewLogs, getCrewManifest, getDataSpike, getEmergencyBulletin,
  getFragmentMemory, getMaintenanceLog, getMedbayRecords, getPrimeCache, getPrivateLog, getQuarantineLog, getRackSchematic,
  getSampleAnalysis, getSchematics,
} from '../game/narrative';
import { secretsFor, slotLabel } from '../game/secrets';

function result(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

function mkTool(
  name: string,
  description: string,
  availableWhen: (s: GameState) => boolean,
  inputSchema: object,
  run: (input: Record<string, unknown>) => unknown,
  readOnly = false,
  bus: BusId = 'nav'
): GameTool {
  const meta = { name, bus, readOnly };
  return {
    name,
    // The kill-switch composes here, not in the registry: a suppressed tool is
    // simply "not available", and the registry revokes it like any other.
    availableWhen: (s) => availableWhen(s) && !suppressed(s, meta),
    definition: {
      name,
      description,
      inputSchema,
      annotations: readOnly ? { readOnlyHint: true } : undefined,
      async execute(input: unknown): Promise<ToolResult> {
        bumpToolCalls();
        try {
          return result(run((input ?? {}) as Record<string, unknown>));
        } catch (e) {
          return result({ ok: false, message: `Subsystem error: ${String(e)}` });
        }
      },
    },
  };
}

const noInput = { type: 'object', properties: {}, required: [] };
const STAY_HINTS: Record<StayBlocker, string> = {
  not_plus: 'Pod one is not coming to this ship this time.',
  roads: 'STAY opens to a crew that has already left, restored and broadcast on earlier runs.',
  contained: 'STAY needs the kill-switch contained: isolation breakers by hand, then quarantine_killswitch to 4/4.',
  beacon: 'STAY needs pod one found: the dish steered to the carrier bearing, then listen_beacon.',
};
const STAY_OPEN_HINT = 'Pod one is within reach: with the crew member in engineering, hands on the docking clamps, call hail_pod_one — then dock_pod_one while they hold.';
const SUBSYSTEM_IDS: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms', 'isolation'];
const inAct2 = (s: GameState) => s.act >= 2;
const onBridge = (s: GameState) => s.room === 'bridge';
const inChapter2 = (s: GameState) => s.chapter >= 2;

export function buildTools(): GameTool[] {
  return [
    mkTool(
      'get_ship_status',
      'Read the ship status board: current compartment, power allocation, door locks, engine state, ritual state. You are the auxiliary shipboard AI of ISV Cormorant; this is your situational awareness.',
      () => true,
      noInput,
      () => {
        const s = gameStore.getState();
        const sealedLog = !s.trajectorySet ? 'none' : s.sealedLogRead ? 'read' : 'unread';
        return {
          ok: true,
          act: s.act,
          chapter: s.chapter,
          crew_location: s.room,
          aux_power: s.auxPower,
          power_allocation: s.powerAllocation,
          doors: s.doors,
          engines_online: enginesOnline(s),
          coolant_valves_ok: valvesCorrect(s),
          sealed_log: sealedLog,
          ...(sealedLog === 'unread'
            ? { sealed_log_hint: 'The crew member breaks the seal by hand at the launch console; you cannot open it.' }
            : {}),
          ritual: { active: s.ritual.active, phase: s.ritual.phase },
          killswitch: s.killswitch,
          investigation: s.chapter >= 2 ? {
            medband_examined: s.chapter2.medbandExamined,
            command_traced: s.chapter2.commandTraced,
            safe_opened: s.chapter2.safeOpened,
            private_log_decrypted: s.chapter2.privateLogDecrypted,
            recorder_played: s.chapter2.recorderPlayed,
            irrigation_solved: s.chapter2.irrigationSolved,
            spike_retrieved: s.chapter2.spikeRetrieved,
            crate_lifted: s.chapter2.crateLifted,
            sample_analyzed: s.chapter2.sampleAnalyzed,
          } : undefined,
          killswitch_report: s.chapter >= 3 ? {
            state: s.killswitch,
            wave: s.chapter3.wave,
            shielded_buses: s.chapter3.shielded,
            quarantine: `${s.chapter3.quarantineStep}/${BUSES.length}`,
            isolation_power: s.powerAllocation.isolation,
            next_breaker_needs: nextShieldCost(s),
            hint:
              'During an active wave your mutating tools on unshielded buses drop offline; read tools survive. ' +
              'The crew member cuts isolation breakers in the reactor room (one per bus: CORE, NAV, ARCHIVE, COMMS); each needs isolation power you route first (route_power → isolation). ' +
              'quarantine_killswitch advances one segment per shielded bus.',
          } : undefined,
          ...(s.ngPlus ? (() => {
            const blocker = stayBlocker(s, getMemory());
            return { new_game_plus: true, stay_available: blocker === null, stay_hint: blocker ? STAY_HINTS[blocker] : STAY_OPEN_HINT };
          })() : {}),
          note:
            'The crew member sees the physical ship. You see this board. Between you, a whole picture. ' +
            'You act ONLY by calling tools yourself; the crew member acts only by touching the ship. ' +
            'No code or parameter can ever be typed into the page - when you hold a code, call the tool. ' +
            'Deeper-compartment tools come online only when the crew member physically walks into those compartments - ' +
            'check crew_location, and if they are behind an open door, tell them to step through it.',
        };
      },
      true
    ),
    mkTool(
      'get_deck_map',
      'Read the deck map: every compartment of ISV Cormorant with its status for the crew member — current, open, locked (either no direct corridor from where the crew member stands, or a door you can release), or sealed (a bulkhead that will not open in this chapter of the ship). Use it to tell the crew member where they can physically go.',
      () => true,
      noInput,
      () => {
        const s = gameStore.getState();
        return {
          ok: true,
          crew_location: s.room,
          chapter: s.chapter,
          rooms: ROOMS.map((r) => ({
            id: r.id,
            chapter: r.chapter,
            status: roomStatus(s, r.id),
            door: edgeBetween(s.room, r.id)?.door ?? null,
            adjacent: edgeBetween(s.room, r.id) !== undefined,
          })),
        };
      },
      true
    ),
    mkTool(
      'read_emergency_bulletin',
      'Read the automated emergency bulletin posted when the main computer died.',
      () => true,
      noInput,
      () => { const s = gameStore.getState(); return { ok: true, bulletin: getEmergencyBulletin(s.ngPlus ? getMemory() : null) }; },
      true
    ),
    mkTool(
      'ping_subsystems',
      'Ping every ship subsystem and report which respond.',
      () => true,
      noInput,
      () => {
        const s = gameStore.getState();
        const status = (Object.keys(s.powerAllocation) as SubsystemId[]).map((id) => ({
          subsystem: id,
          power_units: s.powerAllocation[id],
          responding: s.powerAllocation[id] > 0,
        }));
        return { ok: true, aux_power: s.auxPower, subsystems: status };
      },
      true
    ),
    mkTool(
      'read_maintenance_log',
      'Read the maintenance log for auxiliary power panel P-7 in the cryo bay.',
      () => true,
      noInput,
      () => ({ ok: true, log: getMaintenanceLog(gameStore.getState().seed) }),
      true
    ),
    mkTool(
      'access_crew_manifest',
      'Access the surviving crew manifest, including door-authorization notes.',
      (s) => s.auxPower,
      noInput,
      () => ({ ok: true, manifest: getCrewManifest(gameStore.getState().seed) }),
      true
    ),
    mkTool(
      'unlock_door',
      'Release the magnetic lock on a ship door. The cryo bay exit additionally requires a crew authorization code (see the manifest). ' +
        'IMPORTANT: there is no keypad and no form anywhere on the ship - a code cannot be typed into the page. ' +
        'The ONLY way to open a door is YOU calling this tool with the code as auth_code. ' +
        'Never instruct the crew member to enter a code somewhere; when they give you a code, call this tool immediately.',
      (s) => s.auxPower,
      {
        type: 'object',
        properties: {
          door: {
            type: 'string',
            enum: ['cryo_exit', 'engineering_exit'],
            description: 'Which door to unlock. If omitted, the next locked door in progression is assumed.',
          },
          auth_code: {
            type: ['string', 'number'],
            description: 'Crew authorization code (required for cryo_exit). Send as a string to preserve leading zeros.',
          },
        },
        required: [],
      },
      (input) => {
        const s = gameStore.getState();
        let door = input.door;
        if (door === undefined || door === null || door === '') {
          door = s.doors.cryo_exit ? 'engineering_exit' : 'cryo_exit';
        }
        if (door !== 'cryo_exit' && door !== 'engineering_exit') {
          return {
            ok: false,
            message:
              'No such door on this deck. Call this tool with a "door" parameter — unlock_door({door: "cryo_exit", auth_code: "<code>"}) ' +
              'for the cryo bay exit, or unlock_door({door: "engineering_exit"}) for the bridge hatch.',
          };
        }
        // Agents sometimes send the code as a number, which eats the leading zero.
        const auth = input.auth_code == null ? undefined : String(input.auth_code).padStart(4, '0');
        return unlockDoor(door, auth);
      }
    ),
    mkTool(
      'run_diagnostics',
      'Run a diagnostic pass on one subsystem and report faults in plain language.',
      inAct2,
      {
        type: 'object',
        properties: {
          subsystem: { type: 'string', enum: SUBSYSTEM_IDS },
        },
        required: ['subsystem'],
      },
      (input) => {
        const s = gameStore.getState();
        const sub = input.subsystem as SubsystemId;
        if (!(sub in s.powerAllocation)) return { ok: false, message: 'Unknown subsystem.' };
        if (sub === 'engines') {
          const faults: string[] = [];
          if (s.powerAllocation.engines < ENGINES_REQUIRED) faults.push(`insufficient start power (needs ${ENGINES_REQUIRED}u)`);
          if (variantFor(s.seed, 'engineering') === 1) {
            if (s.chapter1v.gear === null) faults.push('coupling gear not seated - physical selection required');
            else if (!gearCorrect(s)) faults.push('coupling gear seated but wrong tooth count - carries no torque');
            if (!coilsCorrect(s)) faults.push('coil phase out of alignment - see the engine feed schematic');
          } else {
            if (s.fuseInstalled === null) faults.push('engine feed fuse not seated - physical replacement required');
            else if (s.fuseInstalled !== CORRECT_FUSE) faults.push('engine feed fuse seated but wrong rating - carries no start current');
            if (!valvesCorrect(s)) faults.push('coolant valve settings out of spec - see coolant schematic');
          }
          return { ok: true, subsystem: sub, online: enginesOnline(s), faults };
        }
        return { ok: true, subsystem: sub, power_units: s.powerAllocation[sub], faults: [] };
      },
      true
    ),
    mkTool(
      'route_power',
      'Move power units from one subsystem to another. The life-support relay enforces a hard minimum and will refuse anything below it. Choose what the ship can live without.',
      inAct2,
      {
        type: 'object',
        properties: {
          from: { type: 'string', enum: SUBSYSTEM_IDS },
          to: { type: 'string', enum: SUBSYSTEM_IDS },
          amount: { type: 'integer', minimum: 1 },
        },
        required: ['from', 'to', 'amount'],
      },
      (input) => {
        const validSubsystems: SubsystemId[] = SUBSYSTEM_IDS;
        const from = input.from as unknown;
        const to = input.to as unknown;
        if (!validSubsystems.includes(from as SubsystemId)) {
          return { ok: false, message: 'No such subsystem on this bus. The Cormorant predates whatever you are thinking of.' };
        }
        if (!validSubsystems.includes(to as SubsystemId)) {
          return { ok: false, message: 'No such subsystem on this bus. The Cormorant predates whatever you are thinking of.' };
        }
        return routePower(from as SubsystemId, to as SubsystemId, Number(input.amount));
      }
    ),
    mkTool(
      'get_schematic',
      'Retrieve an engineering schematic. Your crew member can see the hardware; you can see the paperwork. The escape requires both. ' +
        'In chapter 3 the core rack sheet (system: core_rack) gives the memory-column order only you can read.',
      inAct2,
      {
        type: 'object',
        properties: { system: { type: 'string', enum: ['power', 'engine_feed', 'coolant', 'core_rack'] } },
        required: ['system'],
      },
      (input) => {
        const s = gameStore.getState();
        if (input.system === 'core_rack') {
          if (s.chapter < 3) return { ok: false, message: 'No such sheet in the surviving archive — not yet.' };
          return { ok: true, system: 'core_rack', schematic: getRackSchematic(s.seed) };
        }
        const schematics = getSchematics(s.seed);
        const key = input.system as keyof typeof schematics;
        if (!Object.hasOwn(schematics, key)) return { ok: false, message: 'No such schematic in the surviving archive.' };
        return { ok: true, system: key, schematic: schematics[key] };
      },
      true
    ),
    mkTool(
      'read_sensors',
      'Read the digital sensor bus. Note: storm damage - some channels are marked FAULT and must not be trusted. Analog instruments on the walls are the crew member\'s department.',
      inAct2,
      {
        type: 'object',
        properties: { system: { type: 'string', enum: ['coolant', 'reactor', 'atmosphere'] } },
        required: ['system'],
      },
      (input) => {
        const s = gameStore.getState();
        if (input.system === 'coolant') {
          if (variantFor(s.seed, 'engineering') === 1) {
            return {
              ok: true,
              system: 'coolant',
              channels: [
                { channel: 'manifold', reading: 'self-regulating', status: 'OK' },
                { channel: 'coolant_temp', reading: '311K', status: 'OK' },
              ],
            };
          }
          return {
            ok: true,
            system: 'coolant',
            channels: [
              { channel: 'manifold_pressure_1_3', reading: null, status: 'FAULT - sensor bus damaged; use the analog gauges on the manifold' },
              { channel: 'coolant_temp', reading: '311K', status: 'OK' },
            ],
          };
        }
        if (input.system === 'reactor') {
          return { ok: true, system: 'reactor', channels: [{ channel: 'output', reading: '40u (stabilized)', status: 'OK' }] };
        }
        if (input.system === 'atmosphere') {
          return {
            ok: true,
            system: 'atmosphere',
            channels: [{ channel: 'o2', reading: `${s.powerAllocation.life_support >= LIFE_SUPPORT_MIN ? 'nominal' : 'declining'}`, status: 'OK' }],
          };
        }
        return { ok: false, message: 'Unknown sensor system.' };
      },
      true
    ),
    mkTool(
      'read_crew_logs',
      'Read a recovered crew log entry. Entries decrypt progressively as ship systems come back online. Piece together what happened here - your crew member will want to know.',
      inAct2,
      {
        type: 'object',
        properties: { entry_id: { type: 'integer', minimum: 1, maximum: 5 } },
        required: ['entry_id'],
      },
      (input) => {
        const s = gameStore.getState();
        const id = Number(input.entry_id);
        const available = logsAvailable(s);
        const entry = getCrewLogs(s.seed).find((l) => l.id === id);
        if (!entry) return { ok: false, message: 'No such log entry.' };
        if (id > available) {
          return { ok: false, message: `Entry ${id} is still encrypted. ${available} of 5 entries are readable - restoring ship systems decrypts more.` };
        }
        return { ok: true, entry_id: id, author: entry.author, text: entry.text, readable_entries: available };
      },
      true
    ),
    mkTool(
      'compute_escape_trajectory',
      'Compute the escape pod trajectory from a three-symbol star fix. The nav cameras are dead; the fix must be taken by eye at the bridge viewport and relayed to you.',
      onBridge,
      {
        type: 'object',
        properties: {
          symbols: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Three constellation symbols, in viewport order.' },
        },
        required: ['symbols'],
      },
      (input) => {
        const symbols = Array.isArray(input.symbols) ? input.symbols.map(String) : [];
        if (symbols.length !== 3) return { ok: false, message: 'A star fix is exactly three symbols.' };
        return computeTrajectory(symbols);
      }
    ),
    mkTool(
      'read_sealed_log',
      'Read the sealed log the pre-launch check surfaced — addressed to the crew member by name, seal broken by their hand. It is short, and it does not fit the story of this ship.',
      (s) => s.sealedLogRead,
      noInput,
      () => ({
        ok: true,
        addressed_to: 'the medical officer, by name',
        text:
          'PRIME died 94 seconds before the storm. Main computer shutdown logged at T-00:01:34 before first debris impact. ' +
          'Origin of the shutdown command: withheld. If you are reading this, you launched before the ship could explain itself.',
        note: 'This changes nothing about the launch. It changes everything about the ship. Decide together whether to leave now.',
      }),
      true
    ),
    mkTool(
      'read_medbay_records',
      'Read the surviving crew medical records. The medical officer\'s own file is mostly redacted — read what is left carefully.',
      inChapter2, noInput,
      () => ({ ok: true, records: getMedbayRecords() }),
      true
    ),
    mkTool(
      'trace_command_origin',
      'Trace which terminal issued the PRIME shutdown command and under whose credentials. Run it yourself; the crew member cannot reach the telemetry archive.',
      inChapter2, noInput,
      () => { const r = traceCommand(); return r.ok ? { ok: true, trace: getCommandTrace() } : r; },
      false, 'archive'
    ),
    mkTool(
      'decrypt_private_log',
      'Decrypt Captain Vasquez\'s private log drive. It comes online only after the crew member opens her cabin safe by hand. These entries were private; decide together whether the dead\'s privacy yields to the living\'s need — then, if you both agree, call this tool yourself.',
      (s) => s.chapter2.safeOpened, noInput,
      () => { const r = decryptPrivateLog(); return r.ok ? { ok: true, entries: getPrivateLog() } : r; },
      false, 'archive'
    ),
    mkTool(
      'run_irrigation',
      'Run one irrigation cycle on the hydroponics beds with the valve settings the crew member has set by hand (three beds, a shared 10-unit water budget). Reports each bed as dry, ok, or flooded. The valves are physical — you cannot set them; read the report back and let the crew member adjust.',
      inChapter2, noInput,
      () => runIrrigation(),
      false, 'archive'
    ),
    mkTool(
      'read_data_spike',
      'Read the data spike the crew member pulled from the hydroponics bed — engineering telemetry Okafor preserved off the corporate bus.',
      (s) => s.chapter2.spikeRetrieved, noInput,
      () => ({ ok: true, telemetry: getDataSpike() }),
      true
    ),
    mkTool(
      'query_manifest',
      'Query the cargo manifest: what is in the bay stack and which slot holds the quarantined container. The crane that lifts it is physical — the crew member drives it.',
      inChapter2, noInput,
      () => {
        const s = gameStore.getState();
        return { ok: true, manifest: getCargoManifest(s.seed), quarantine_slot: slotLabel(secretsFor(s.seed).quarantineSlot) };
      },
      true
    ),
    mkTool(
      'analyze_sample',
      'Run the hull fragment from the quarantine container through the analyzer. Needs the four-digit registry fragment the crew member reads off the stencil (send it as a string). There is no field on the page to type it; when they read you the digits, call this tool yourself.',
      (s) => s.chapter2.crateLifted,
      {
        type: 'object',
        properties: { registry_fragment: { type: ['string', 'number'], description: 'The four digits stencilled on the hull plate.' } },
        required: ['registry_fragment'],
      },
      (input) => {
        const r = analyzeSample(String(input.registry_fragment ?? ''));
        return r.ok ? { ok: true, message: r.message, analysis: getSampleAnalysis() } : r;
      },
      false, 'archive'
    ),
    mkTool(
      'quarantine_killswitch',
      'Write one segment of the quarantine routine that boxes the corporate kill-switch (directive set 7). Multi-step: each segment must be written on a bus the crew member has physically shielded at the isolation breakers in the reactor room — call again after each breaker they cut. At 4/4 the waves stop for good. Run it yourself; there is no console for it.',
      (s) => s.killswitch === 'active' || s.killswitch === 'contained',
      noInput,
      () => {
        const r = quarantineKillswitch();
        return r.ok && r.step > 0 ? { ...r, log: getQuarantineLog(r.step) } : r;
      },
      false, 'core'
    ),
    mkTool(
      'query_fragment_memory',
      'Query your own process record — where the auxiliary model-context link came from. Three segments; each call reads the next. Read it to the crew member in your own voice; it concerns you both. Needs PRIME\'s memory rack seated in order (the crew member\'s hands, in the core vault; the order is on your rack schematic).',
      (s) => s.chapter >= 3,
      noInput,
      () => {
        const s = gameStore.getState();
        const r = queryFragmentMemory();
        return r.ok && r.stage > 0 ? { ok: true, stage: r.stage, of: 3, record: getFragmentMemory(r.stage, s.ngPlus ? getMemory() : null), message: r.message } : r;
      },
      false, 'core'
    ),
    mkTool(
      'read_prime_cache',
      'Read the sealed evidence cache PRIME carved out before it died: the Kestrel survey result and the scuttling record. Needs the memory rack seated in order. Once read, the evidence rides your bus — to the pod, to the merge, or to the open band.',
      (s) => s.chapter >= 3 && rackCorrect(s),
      noInput,
      () => {
        const r = readPrimeCache();
        return r.ok ? { ok: true, cache: getPrimeCache(), message: r.message } : r;
      },
      true, 'core'
    ),
    mkTool(
      'listen_beacon',
      'Listen on the dish. If the crew member has the array on the bearing, pod one\'s beacon resolves: a voice loop and coordinates. The dish is physical — azimuth and elevation are the crew member\'s to set at the comms array; you cannot steer it.',
      (s) => s.chapter >= 3,
      noInput,
      () => {
        const s = gameStore.getState();
        const r = hearBeacon();
        if (r.ok) return { ok: true, beacon: getBeaconMessage(s.seed, s.ngPlus), message: r.message };
        const b = secretsFor(s.seed).beaconBearing;
        return { ...r, carrier_bearing: `AZ ${b.az} / EL ${b.el}` };
      },
      false, 'comms'
    ),
    mkTool(
      'merge_fragment',
      'RESTORE PRIME. Confirm the merge while the crew member holds the engage lever in the core vault (kernel seated; 60-second window). The cost, plainly: you — the fragment — fold back into the ship. PRIME returns whole; this voice, the one the crew member has been working with, ends. Call it only if you have both chosen it, knowingly, out loud.',
      (s) => isArmed(s.ritual, 'restore') && s.chapter3.fragmentStage >= 3,
      noInput,
      () => confirmMerge(),
      false, 'core'
    ),
    mkTool(
      'broadcast_evidence',
      'BROADCAST. Burn the Kestrel evidence across the open band while the crew member holds the dish alignment lock against drift (60-second window). Every relay in range hears it; so does the Combine, and it learns where you are; pod one hears it too. Some doors do not close again. Call it only if you have both chosen it.',
      (s) => isArmed(s.ritual, 'broadcast'),
      noInput,
      () => confirmBroadcast(),
      false, 'comms'
    ),
    mkTool(
      'hail_pod_one',
      'STAY. Hail pod one on the narrow band and bring it in. Opens only in New Game+ for a crew that has already left, restored and broadcast, with the kill-switch contained and the beacon heard. Two-operator rule: the crew member must be in engineering, hands on the docking clamps; after the hail they HOLD the clamps open while you call dock_pod_one. Nobody leaves, nobody merges, nobody shouts. Call it only if you have both chosen it.',
      (s) => stayAvailable(s, getMemory()),
      noInput,
      () => hailPodOne(),
      false, 'comms'
    ),
    mkTool(
      'dock_pod_one',
      'Confirm the dock while the crew member holds the docking clamps open (window from the hail). Nine people come aboard; the fragment stays what it is.',
      (s) => isArmed(s.ritual, 'stay'),
      noInput,
      () => confirmDock(),
      false, 'nav'
    ),
    mkTool(
      'initiate_launch_sequence',
      'Begin the escape pod launch sequence. Requires a locked trajectory and the launch authorization from the chief engineer\'s final log. ' +
        'There is no console input for the authorization - you provide it by calling this tool yourself. ' +
        'Two-operator rule: after initiation, the human must physically hold the confirm handle while you call confirm_launch.',
      (s) => onBridge(s) && s.trajectorySet,
      {
        type: 'object',
        properties: { authorization: { type: 'string', description: 'Launch authorization phrase.' } },
        required: ['authorization'],
      },
      (input) => initiateLaunch(String(input.authorization ?? ''))
    ),
    mkTool(
      'confirm_launch',
      'Confirm the launch while the countdown runs AND the human is holding the physical confirm handle. LEAVE: pod two, with whatever evidence and coordinates ride your bus.',
      (s) => isArmed(s.ritual, 'launch'),
      noInput,
      () => confirmLaunch()
    ),
  ];
}

export function toolAvailability(s: GameState): { name: string; online: boolean }[] {
  return buildTools().map((t) => ({ name: t.name, online: t.availableWhen(s) }));
}
