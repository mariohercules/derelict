import type { GameState, SubsystemId } from '../game/types';
import type { GameTool, ToolResult } from './registry';
import {
  gameStore, bumpToolCalls, unlockDoor, routePower, computeTrajectory, initiateLaunch, confirmLaunch,
} from '../game/store';
import { enginesOnline, logsAvailable, valvesCorrect } from '../game/derived';
import { CORRECT_FUSE, ENGINES_REQUIRED, LIFE_SUPPORT_MIN } from '../game/content';
import { ROOMS, edgeBetween, roomStatus } from '../game/rooms';
import { isArmed } from '../game/ritual';
import {
  getCrewLogs, getCrewManifest, getEmergencyBulletin, getMaintenanceLog, getSchematics,
} from '../game/narrative';

function result(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

function mkTool(
  name: string,
  description: string,
  availableWhen: (s: GameState) => boolean,
  inputSchema: object,
  run: (input: Record<string, unknown>) => unknown,
  readOnly = false
): GameTool {
  return {
    name,
    availableWhen,
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
const inAct2 = (s: GameState) => s.act >= 2;
const onBridge = (s: GameState) => s.room === 'bridge';

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
      () => ({ ok: true, bulletin: getEmergencyBulletin() }),
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
      () => ({ ok: true, manifest: getCrewManifest() }),
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
          subsystem: { type: 'string', enum: ['life_support', 'doors', 'medbay', 'engines', 'comms'] },
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
          if (s.fuseInstalled === null) faults.push('engine feed fuse not seated - physical replacement required');
          else if (s.fuseInstalled !== CORRECT_FUSE) faults.push('engine feed fuse seated but wrong rating - carries no start current');
          if (!valvesCorrect(s)) faults.push('coolant valve settings out of spec - see coolant schematic');
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
          from: { type: 'string', enum: ['life_support', 'doors', 'medbay', 'engines', 'comms'] },
          to: { type: 'string', enum: ['life_support', 'doors', 'medbay', 'engines', 'comms'] },
          amount: { type: 'integer', minimum: 1 },
        },
        required: ['from', 'to', 'amount'],
      },
      (input) => {
        const validSubsystems: SubsystemId[] = ['life_support', 'doors', 'medbay', 'engines', 'comms'];
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
      'Retrieve an engineering schematic. Your crew member can see the hardware; you can see the paperwork. The escape requires both.',
      inAct2,
      {
        type: 'object',
        properties: { system: { type: 'string', enum: ['power', 'engine_feed', 'coolant'] } },
        required: ['system'],
      },
      (input) => {
        const schematics = getSchematics();
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
      'Confirm the launch while the countdown runs AND the human is holding the physical confirm handle. This is the last tool you will ever need on this ship.',
      (s) => isArmed(s.ritual, 'launch'),
      noInput,
      () => confirmLaunch()
    ),
  ];
}

export function toolAvailability(s: GameState): { name: string; online: boolean }[] {
  return buildTools().map((t) => ({ name: t.name, online: t.availableWhen(s) }));
}
