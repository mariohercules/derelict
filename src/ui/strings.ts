import type { Locale } from '../game/i18n';
import type { BusId, RoomId, SubsystemId } from '../game/types';
import type { Drawing } from '../game/variants';

// The six crew-quarters drawing subjects, named once per locale — indexed by
// the quarters.drawing / drawingAria / nothingBehind / keyBehind closures
// below rather than repeated inline in each.
const DRAWING_NAMES_EN: Record<Drawing, string> = {
  rocket: 'the rocket', cake: 'the birthday cake', cat: 'the cat', cormorant: 'the Cormorant', sun: 'the sun', family: 'her family',
};
const DRAWING_NAMES_PT: Record<Drawing, string> = {
  rocket: 'o foguete', cake: 'o bolo de aniversário', cat: 'o gato', cormorant: 'a Cormorant', sun: 'o sol', family: 'a família',
};

export interface UIStrings {
  app: {
    tagline: string;
    wakeUp: string;
    abandonRun: string;
    howTitle: string;
    how1: string;
    how2: string;
    how3: string;
    checkpoint: (chapter: number, room: string) => string;
  };
  hud: {
    engines: string;
    ailinkTitle: string;
    severed: string;
    rooms: Record<RoomId, string>;
    waveWarning: (secs: number) => string;
    waveActive: (secs: number) => string;
    contained: string;
    ngPlus: string;
  };
  cryo: {
    title: string;
    introA: string;
    introEm: string;
    introB: string;
    askAI: string;
    ventGrate: string;
    ventHum: string;
    pullGrate: string;
    auxPanel: string;
    auxOnline: string;
    breakersDesc: string;
    breaker: string;
    breakerOn: string;
    allDown: string;
    crewBunk: string;
    photoPinned: string;
    lookCloser: string;
    putBack: string;
    photoAria: string;
    exitTitle: string;
    doorOpen: string;
    stepThrough: string;
    magLocked: string;
    darkDead: string;
    again: string;
    pbTitle: string; pbDesc: string; pbAria: string; pbCableAria: (colour: string) => string;
    pbColours: [string, string, string]; pbBus: string; pbEmpty: string; pbEnergize: string; pbWrong: string;
  };
  eng: {
    title: string;
    intro: string;
    powerBoard: string;
    readOnly: string;
    subsystems: Record<SubsystemId, string>;
    fuseTitle: string;
    fuseDesc: string;
    seated: string;
    seatIt: string;
    fuseAria: (bands: number) => string;
    coolant: string;
    coolantDesc: string;
    line: (n: number) => string;
    valve: string;
    valveAria: (n: number) => string;
    gaugeAria: (label: string) => string;
    flowSteadies: string;
    ladderUp: string;
    enginesHum: string;
    hatchOpen: string;
    climbUp: string;
    servosPowered: string;
    servosUnpowered: string;
    dockTitle: string; dockDesc: string; dockAria: string; dockWaiting: string; dockArmed: string;
    clampsHold: string; clampsHolding: string; dockWindowElapsed: string; dockTwoOp: string;
    gcTitle: string; gcDesc: string; gcTrayAria: string; gcGearAria: (teeth: number) => string; gcSeat: string; gcSeated: string;
    gcCoilsTitle: string; gcCoilsDesc: string; gcCoil: (label: string) => string; gcPhaseAria: (label: string) => string;
  };
  bridge: {
    title: string;
    intro: string;
    viewportTitle: string;
    viewportDesc: string;
    starAria: string;
    reticleAria: string;
    beaconsLocked: string;
    consoleTitle: string;
    trajNotSet: string;
    trajLocked: string;
    twoOp: string;
    windowElapsed: string;
    holding: string;
    confirmHold: string;
    ladderDown: string;
    climbDown: string;
    sealedTitle: string; sealedFound: string; breakSeal: string; sealedLine: string; sealedAfter: string;
    investigateTitle: string; investigateBody: string; investigate: string; investigating: string; stirring: string;
    waves: string; contained: string; leaveCh3: string;
    sealedAgain: string;
    dvTitle: string; dvDesc: string; dvAria: string; dvPitchAria: string; dvYawAria: string; dvLocked: string;
  };
  epilogue: {
    podAway: string; restored: string; transmitted: string;
    outro: string; outroKnowing: string; outroUnknowing: string; outroRestore: string; outroBroadcast: string;
    stats: (toolCalls: number) => string; statsRestore: (toolCalls: number) => string; wakeAgain: string;
    withProof: string; withBeacon: string; contained: string; waves: (n: number) => string;
    wakeAgainPlus: string; docked: string; outroStay: string; statsStay: (toolCalls: number) => string; runNumber: (n: number) => string;
  };
  deck: { title: string; legendOpen: string; legendLocked: string; legendSealed: string };
  medbay: {
    title: string; intro: string; bandTitle: string; bandDesc: string; examine: string; bandReading: string; bandAria: string;
    terminalTitle: string; terminalDesc: string; burnIn: string; next: string;
  };
  quarters: {
    title: string; intro: string; safeTitle: string; safeDesc: string; wheelAria: (n: number) => string; tryHandle: string;
    safeOpen: string; safeShut: string; driveNote: string; recorderTitle: string; recorderDesc: string; play: string; playing: string;
    transcriptLabel: string; noSpeech: string; wallTitle: string; wallDesc: string;
    keyedDesc: string; keyedAria: string; keyedAriaKey: string; keyedAriaOpen: string; turnKey: string; noKey: string; keyInHand: string;
    wallKeyedDesc: string; wallAria: string; drawing: (d: Drawing) => string; drawingAria: (d: Drawing) => string;
    nothingBehind: (d: Drawing) => string; keyBehind: (d: Drawing) => string;
  };
  hydro: {
    title: string; intro: string; bedsTitle: string; bedsDesc: string; bed: (n: number) => string; needTag: (n: number) => string;
    valveAria: (n: number) => string; lampsHint: string; budget: string; over: string; cycleHint: string; spikeTitle: string; spikeHidden: string;
    spikeRevealed: string; pullSpike: string; spikePulled: string;
    bedsDescProbe: string; bedsAriaProbe: string; probeLamp: string; probeHint: string; probeRead: string;
  };
  cargo: {
    title: string; intro: string; craneTitle: string; craneDesc: string; gridAria: string; slotAria: (label: string) => string;
    up: string; down: string; left: string; right: string; lift: string; wrongCrate: string; lifted: string;
    fragmentTitle: string; fragmentDesc: string; fragmentAria: string; readOut: string; analyzed: string; lowerDeck: string;
    stackedDesc: string; stackedGridAria: string; tierAria: (n: number) => string; lower: string; hookLamp: string;
    palletUp: string; holdingOne: string; slotFull: string; parked: string;
  };
  reactor: {
    title: string; intro: string; bankTitle: string; bankDesc: string; bus: Record<BusId, string>; cut: string;
    cutAria: (bus: string) => string; shielded: string; needPower: (have: number, need: number) => string; bankAria: string;
    feedTitle: string; feedDesc: string; feedAria: string; feedReading: (have: number, need: number) => string;
    waveTitle: string; waveCalm: string; waveWarning: string; waveActive: string; waveContained: string; waveStirring: string; waveAria: string;
    quarantineTitle: string; quarantineDesc: string; quarantineAria: string; segment: (n: number, of: number) => string; next: string;
  };
  vault: {
    title: string; intro: string; rackTitle: string; rackDesc: string; rackAria: string; cradle: (n: number) => string; cycleAria: (n: number) => string;
    empty: string; column: (tag: string) => string; rackWrong: string; rackRight: string; kernelTitle: string; kernelDesc: string; seatKernel: string;
    kernelSeated: string; anotherRitual: string; leverHold: string; leverHolding: string; windowElapsed: string; twoOp: string;
    consoleTitle: string; consoleDesc: string; consoleAria: string; stage: (n: number) => string; cacheLamp: string; next: string;
  };
  comms: {
    title: string; intro: string; dishTitle: string; dishDesc: string; dishAria: string; azAria: string; elAria: string; az: string; el: string;
    carrier: string; locked: string; beaconTitle: string; beaconDesc: string; beaconHeard: string; beaconAria: string;
    bandTitle: string; bandDesc: string; openBand: string; bandNoEvidence: string; bandNotAligned: string; anotherRitual: string; bandOpen: string;
    lockHold: string; lockHolding: string; windowElapsed: string; twoOp: string; next: string;
  };
}

const en: UIStrings = {
  app: {
    tagline: 'A two-crew escape. You see the ship. Your AI runs it. Neither of you leaves alone.',
    wakeUp: 'Wake up',
    abandonRun: 'Abandon previous run',
    howTitle: 'How it works',
    how1:
      "Your AI boards with you. Open this page where your agent can reach it — ChatGPT's in-app browser works out of the box; Chrome needs WebMCP enabled. If the link is severed, a red warning will say so.",
    how2:
      "The crew is a pair. You press what is physical — buttons, levers, valves. Your AI operates the ship's systems — the dots up top show its current reach, and they light up as you two make progress.",
    how3:
      'Talk like crewmates. Describe what you see; ask what it can read. When it unlocks something, the next move is physical — and yours.',
    checkpoint: (chapter, room) => `Checkpoint — Chapter ${chapter}: ${room}`,
  },
  hud: {
    engines: 'ENGINES',
    ailinkTitle: 'Ship systems currently exposed to your AI via WebMCP',
    severed: 'severed',
    rooms: {
      cryo_bay: 'cryo bay', engineering: 'engineering', bridge: 'bridge',
      medbay: 'medbay', crew_quarters: 'crew quarters', hydroponics: 'hydroponics', cargo_bay: 'cargo bay',
      reactor_room: 'reactor room', core_vault: 'core vault', comms_array: 'comms array',
    },
    waveWarning: (secs) => `KILL-SWITCH WAVE IN ${secs}s — your AI is about to lose its hands`,
    waveActive: (secs) => `WAVE ACTIVE — ${secs}s — unshielded tools are down`,
    contained: 'KILL-SWITCH CONTAINED',
    ngPlus: 'NEW GAME+',
  },
  cryo: {
    title: 'Cryo bay',
    introA: 'You wake up cold in an open cryopod. Emergency lights. The ship is silent in the way ships should never be. A terminal blinks: ',
    introEm: 'AUXILIARY MODEL-CONTEXT LINK ACTIVE',
    introB: ' — your AI is aboard, even if nothing else is.',
    askAI: "Ask your AI what it can see. It reads things you can't.",
    ventGrate: 'Vent grate',
    ventHum: 'Something hums behind this grate. The screws gave up years ago.',
    pullGrate: 'Pull the grate off',
    auxPanel: 'Aux power panel P-7',
    auxOnline: 'AUXILIARY POWER ONLINE. Somewhere, a door controller wakes up.',
    breakersDesc:
      'Three breakers, labeled A, B, C — in an order that helps no one. A warning sticker reads: "WRONG SEQUENCE TRIPS MASTER RELAY".',
    breaker: 'Breaker',
    breakerOn: '(on)',
    allDown: 'All breakers down.',
    crewBunk: 'Crew bunk — Okafor',
    photoPinned: 'A memory cel is pinned above the pillow, slightly crooked — still looping after all these years.',
    lookCloser: 'Look closer',
    putBack: 'Put it back',
    photoAria: 'A looping memory cel: a father with his daughter on his shoulders at sunset',
    exitTitle: 'Exit — to engineering',
    doorOpen: 'THE DOOR IS OPEN. Nothing else happens until you walk through it.',
    stepThrough: 'Step through the open door →',
    magLocked:
      'MAG-LOCKED. The keypad is dead — this door only answers to the ship. Your AI can reach the door controller; it will need a crew code. If your AI hesitates, be direct: "call unlock_door with the code".',
    darkDead: 'Dark. Dead. The lock needs power before anything else.',
    again: 'You have done this before. You do not remember it. The link does.',
    pbTitle: 'Patch bay P-7B',
    pbDesc: 'Somebody rebuilt aux power out of spare cable and stubbornness. Three lines, three buses, and no label that survived. The wiring chart lives on the ship\'s side — ask your AI.',
    pbAria: 'Patch bay: three coloured cables into three bus sockets',
    pbCableAria: (colour) => `cycle the ${colour} cable's bus`,
    pbColours: ['RED', 'GREEN', 'BLUE'],
    pbBus: 'BUS',
    pbEmpty: '—',
    pbEnergize: 'ENERGIZE',
    pbWrong: 'The panel blinks once and goes dark. Wrong wiring; nothing trips, nothing forgives.',
  },
  eng: {
    title: 'Engineering',
    intro:
      'The heart of the ship, running on a fraction of one. Whatever happened here, someone fought hard to keep this deck alive — and left notes only the ship can read.',
    powerBoard: 'Power distribution board',
    readOnly: "Read-only from this side of the glass — routing is done from the ship's side. That means your AI.",
    subsystems: {
      life_support: 'life support',
      doors: 'doors',
      medbay: 'medbay',
      engines: 'engines',
      comms: 'comms',
      isolation: 'isolation feed',
    },
    fuseTitle: 'Engine feed — fuse socket',
    fuseDesc:
      'The old fuse is a blackened husk. Three spare cartridges sit in a tray, identical except for their color bands. No ratings printed anywhere, because the Cormorant respects tradition.',
    seated: ' seated',
    seatIt: ' seat it',
    fuseAria: (bands) => `fuse cartridge with ${bands} bands`,
    coolant: 'Coolant manifold',
    coolantDesc:
      'Three analog gauges, still honest after everything. Below each, a numbered valve dial (0–9). The digital sensor for this manifold is dead — your AI will have to take your word for the readings.',
    line: (n) => `LINE ${n}`,
    valve: 'valve:',
    valveAria: (n) => `valve ${n}`,
    gaugeAria: (label) => `${label} analog gauge`,
    flowSteadies: 'Coolant flow steadies. The pipes stop their complaining.',
    ladderUp: 'Ladder up — to the bridge',
    enginesHum: 'Deep below, the engines settle into a healthy hum.',
    hatchOpen: 'THE HATCH IS OPEN. The bridge is one climb away.',
    climbUp: 'Climb to the bridge →',
    servosPowered: 'Servos have power now — the lock still needs a release from the ship side.',
    servosUnpowered: 'The hatch servos are unpowered. Doors need juice before they need manners.',
    dockTitle: 'Docking clamps — pod one',
    dockDesc: 'Nine people are out there, and the clamps that would take them in have not moved since the yard. The ship is quiet enough now. The choice is whether to open the door instead of leaving through one.',
    dockAria: 'Docking clamps: two hinged jaws around the docking ring, with a docking lamp',
    dockWaiting: 'Pod one is listening. Your AI hails it; when the approach starts, hold the clamps open and keep them open.',
    dockArmed: 'APPROACH IN PROGRESS. Hold the clamps open while your AI confirms the dock.',
    clampsHold: 'HOLD CLAMPS OPEN (hold)',
    clampsHolding: 'HOLDING — THE JAWS CLOSE IF YOU LET GO',
    dockWindowElapsed: 'Approach aborted. Pod one waves off and circles. Ask your AI to hail again.',
    dockTwoOp: 'TWO-OPERATOR RULE: hold the clamps and keep them held while your AI calls dock_pod_one. Let go and the jaws close on nothing.',
    gcTitle: 'Engine feed — coil drive',
    gcDesc: 'No fuse on this ship: a coupling gear and three induction coils. Three gears in the tray, plates stamped by a liar — count the teeth yourself. The right count is paperwork, and paperwork is your AI\'s side.',
    gcTrayAria: 'Gear tray: three coupling gears with countable teeth',
    gcGearAria: (teeth) => `coupling gear with ${teeth} teeth`,
    gcSeat: 'seat it',
    gcSeated: 'seated',
    gcCoilsTitle: 'Induction coils',
    gcCoilsDesc: 'Three coils, twelve marks each, no numbers. The phases are on the schematic — the ship\'s side again.',
    gcCoil: (label) => `COIL ${label}`,
    gcPhaseAria: (label) => `coil ${label} phase dial`,
  },
  bridge: {
    title: 'Bridge',
    intro:
      'Empty chairs, a cracked viewport, and one escape pod indicator burning steady green. Someone left this deck ready for you.',
    viewportTitle: 'Viewport — navigation reticle',
    viewportDesc:
      'The nav cameras are dead. The reticle is optical: drag it until the three beacons sit inside the ring, then read the constellation glyphs to your AI, left to right.',
    starAria: 'star field with alignment reticle',
    reticleAria: 'reticle alignment',
    beaconsLocked: 'Beacons locked in the ring. Three glyphs resolve beneath them.',
    consoleTitle: 'Escape pod two — launch console',
    trajNotSet: 'TRAJECTORY: NOT SET. The console wants a course before it wants courage.',
    trajLocked: 'TRAJECTORY LOCKED. Initiation is ship-side — your AI has the authorization question to answer.',
    twoOp:
      'TWO-OPERATOR RULE: hold the handle down and keep it held while your AI confirms the launch. Let go and the ship assumes you changed your mind.',
    windowElapsed: 'Window elapsed. The ship is patient. Ask your AI to initiate again.',
    holding: 'HOLDING — DO NOT LET GO',
    confirmHold: 'CONFIRM LAUNCH (hold)',
    ladderDown: 'Ladder down — to engineering',
    climbDown: 'Climb back down →',
    sealedTitle: 'Pre-launch check — sealed log',
    sealedFound: 'The pre-launch check surfaced a sealed log wedged behind the console. It is addressed to you. By name.',
    breakSeal: 'Break the seal',
    sealedLine: '"PRIME died 94 seconds before the storm."',
    sealedAfter: 'Your AI can read the full entry now. It will not make the launch any easier.',
    sealedAgain: 'This is not the first time you have read this.',
    investigateTitle: 'The other choice',
    investigateBody: 'The pod is ready. It has been ready the whole time. But the mid-deck bulkheads behind you were never opened — and the ship just told you, by name, that it died before the storm.',
    investigate: 'Leave the pod. Go find out.',
    investigating: 'The investigation is underway. The pod waits — it will wait as long as you need.',
    stirring: 'Something below decks is awake. The pod is still here. So is the question of whether to use it.',
    waves: 'The kill-switch is awake below decks. Your AI loses its hands in waves; the pod does not care. It launches when you both say so.',
    contained: 'The kill-switch is boxed. The ship is quiet in a way it has not been since the Kestrel. The pod waits.',
    leaveCh3: 'LEAVE: pod two, with whatever your AI is carrying — the Kestrel, the cache, pod one\'s bearing. The Cormorant keeps the rest.',
    dvTitle: 'Viewport — drift tracker',
    dvDesc: 'The nav cameras are dead and this ship\'s reference beacon will not sit still. Walk the reticle onto the runner with pitch and yaw; when the ring bites, three codes resolve under it. Read them to your AI, left to right.',
    dvAria: 'star field with a drifting runner and a two-axis reticle',
    dvPitchAria: 'reticle pitch',
    dvYawAria: 'reticle yaw',
    dvLocked: 'Reticle bite. Three codes resolve under the runner.',
  },
  epilogue: {
    podAway: 'POD AWAY',
    restored: 'SHIP RESTORED',
    transmitted: 'TRANSMISSION SENT',
    outro:
      'The Cormorant shrinks behind you — dark, patient, and finally at rest. Okafor was right about your AI. Better company than most.',
    outroKnowing:
      'The Cormorant shrinks behind you — dark, patient, and holding its breath. You broke the seal. You read the line. You launched anyway. Ninety-four seconds is a long time to leave unexplained.',
    outroUnknowing:
      'The Cormorant shrinks behind you — dark, patient, and finally at rest. Somewhere behind the launch console, a sealed message you never found keeps its ninety-four seconds to itself.',
    outroRestore:
      'The lights come up deck by deck, the way they were meant to. A voice you have never heard says your name — and then, quietly, thank you. It remembers everything. It does not remember being the one who sat with you in the dark. The Cormorant flies home whole, and only you know what it cost.',
    outroBroadcast:
      'For eleven minutes every relay in the sector carries the Kestrel\'s name, her survey, her scuttling charges, and a captain\'s objection. The Combine now knows exactly where you are. So does pod one — its beacon changes, mid-loop, to a new message: "We heard. We are coming." Some doors do not close again.',
    stats: (toolCalls) =>
      `Escaped by: one human (hands, eyes, judgment) + one AI (${toolCalls} tool calls on ship systems). Neither of you could have done it alone. That was the point.`,
    statsRestore: (toolCalls) =>
      `Restored by: one human (hands, eyes, judgment) + one AI (${toolCalls} tool calls on ship systems, the last one ending itself). Neither of you could have done it alone. That was the point.`,
    wakeAgain: 'Wake up again',
    withProof: 'The Kestrel\'s name goes with you. Somebody, somewhere, is going to have to explain it.',
    withBeacon: 'Pod one\'s coordinates ride with you. Nine people, all breathing, waiting to hear that it mattered.',
    contained: 'Below decks, directive set 7 runs in a room with no doors. It will run there until the reactor dies.',
    waves: (n) => n === 1 ? 'You rode out one kill-switch wave together.' : `You rode out ${n} kill-switch waves together.`,
    wakeAgainPlus: 'Wake up again — New Game+',
    docked: 'POD ONE DOCKED',
    outroStay:
      'The clamps take the weight and the hatch cycles, and nine people come through it one at a time — cold, alive, looking at the two of you like a rumour that turned out to be true. Nobody leaves. Nobody merges. Nobody shouts across the band. The fragment stays exactly what it is, and Vasquez\'s objection finally has an audience. The Cormorant keeps its secret with nine people to tell it.',
    statsStay: (toolCalls) =>
      `Held by: one human (hands on the clamps) + one AI (${toolCalls} tool calls, the last one a hail). Neither of you could have done it alone. That was the point.`,
    runNumber: (n) => `Run ${n} of the ISV Cormorant.`,
  },
  deck: { title: 'Deck map', legendOpen: 'open', legendLocked: 'locked', legendSealed: 'sealed' },
  medbay: {
    title: 'Medbay',
    intro: 'Your own bay. The pod you thawed in is here, lid up, and the terminal beside it has been dark since before you woke.',
    bandTitle: 'Med-band — your own',
    bandDesc: 'The band that monitored your induction is still in the tray, strip chart intact. The ship kept the paper even after it lost the computer.',
    examine: 'Examine the strip',
    bandReading: 'Conscious at T-06:12 before induction. Induction authorized by: you. You signed yourself into the ice six minutes after… something.',
    bandAria: 'Vital-signs strip chart with a marker six minutes before cryo induction',
    terminalTitle: 'MEDBAY-TERM-01',
    terminalDesc: 'Dead screen. But the phosphor remembers the last thing it displayed for too long.',
    burnIn: 'SHUTDOWN PRIME —',
    next: 'Your AI can trace which terminal gave the order. Ask it. Then ask yourself why you are afraid of the answer.',
  },
  quarters: {
    title: 'Crew quarters',
    intro: 'Two cabins with their doors wedged open. One is tidy the way people are tidy when they expect to be judged. The other is covered in a child\'s drawings.',
    safeTitle: 'Vasquez\'s cabin — desk safe',
    safeDesc: 'Three wheels, brass, worn to a shine on the digits she used. The combination is nowhere in this room; it is somewhere in the ship\'s records.',
    wheelAria: (n) => `combination wheel ${n}`,
    tryHandle: 'Try the handle',
    safeOpen: 'The bolt slides. Inside: a private log drive, encrypted, labeled in her hand: "for whoever is left".',
    safeShut: 'The dial clicks past. Nothing gives.',
    driveNote: 'Your AI can decrypt the drive. It will want to talk about whether it should.',
    recorderTitle: 'Okafor\'s cabin — voice recorder',
    recorderDesc: 'A reel-to-reel, because he never trusted anything without moving parts. One reel is nearly spent. The label reads AMARA.',
    play: 'Play the tape',
    playing: 'Playing…',
    transcriptLabel: 'What you hear (your AI cannot):',
    noSpeech: 'This browser has no voice. The transcript will have to do.',
    wallTitle: 'The wall',
    wallDesc: 'Drawings. A ship with too many windows. A man with a very large moustache. A birthday cake, every year, the candles counted carefully.',
    keyedDesc: 'A mechanical lock, brass, the kind that wants a key and nothing else. There is no key in the desk. She would have kept a spare somewhere in these two cabins — and the ship\'s records would know where.',
    keyedAria: 'the desk safe: a keyed lock, no key',
    keyedAriaKey: 'the desk safe: a keyed lock with the brass key seated',
    keyedAriaOpen: 'the desk safe, open',
    turnKey: 'Turn the key',
    noKey: 'No key. Ask your AI where she logged the spare.',
    keyInHand: 'A brass key, warm from the tape. It fits.',
    wallKeyedDesc: 'Six drawings, taped at a child\'s height. Something is taped behind one of them; the ship\'s records say which. Lift a drawing to look.',
    wallAria: 'six of Amara\'s drawings taped to the cabin wall',
    drawing: (d) => DRAWING_NAMES_EN[d],
    drawingAria: (d) => `lift the drawing of ${DRAWING_NAMES_EN[d]}`,
    nothingBehind: (d) => `Nothing behind ${DRAWING_NAMES_EN[d]}. Old tape, empty.`,
    keyBehind: (d) => `Behind ${DRAWING_NAMES_EN[d]}: a brass key, taped flat. Take it to the safe.`,
  },
  hydro: {
    title: 'Hydroponics',
    intro: 'Green, somehow. Nine weeks of one man\'s stubbornness, growing in trays under lights that should have been shed load. The middle bed has gone feral — a vine has swallowed its own planter.',
    bedsTitle: 'Irrigation manifold',
    bedsDesc: 'Three beds, three valves, one pump with a 10-unit budget per cycle. Each bed\'s brass tag says what it needs. Your AI runs the cycle and reports how each bed took it — you turn the valves.',
    bed: (n) => `BED ${n}`,
    needTag: (n) => `${n}u`,
    valveAria: (n) => `bed ${n} valve`,
    lampsHint: 'The bed lamps show the last cycle your AI ran. Until then they stay dark: the beds do not grade your guesses.',
    budget: 'Pump budget',
    over: 'OVER BUDGET — the pump will refuse the cycle.',
    cycleHint: 'Ask your AI to run the irrigation cycle. The pump is on the ship\'s side.',
    spikeTitle: 'The middle bed',
    spikeHidden: 'The vine is swollen with water, roots wrapped around something that is not a root.',
    spikeRevealed: 'The bed drains. In the mud, a ration bag taped shut — and inside it, a data spike.',
    pullSpike: 'Pull the spike out',
    spikePulled: 'Okafor\'s handwriting on the tape: "For the medic\'s AI." Your AI can read it now.',
    bedsDescProbe: 'Three beds, three valves, one pump with a 10-unit budget per cycle. The brass need tags have corroded to nothing. The pump\'s moisture probe reads a bed only while its line is closed — so: close every valve, have your AI run a cycle, and it will read you what each bed is missing. Then you set the valves and it runs again.',
    bedsAriaProbe: 'irrigation manifold — three beds with corroded, illegible need tags, and a moisture-probe lamp',
    probeLamp: 'MOISTURE PROBE',
    probeHint: 'The probe lamp lights when a cycle ran with at least one valve closed. The numbers it read are on your AI\'s side; the beds do not show them.',
    probeRead: 'Probe read on the closed lines. Ask your AI for the numbers.',
  },
  cargo: {
    title: 'Cargo bay',
    intro: 'Cold, echoing, and stacked to the ceiling with the things a long haul needs. Somewhere in the bay stack is a container the manifest calls quarantine and Okafor refused to throw away.',
    craneTitle: 'Gantry crane',
    craneDesc: 'Nine slots, one crane, one hook. The crates all look alike from down here; the manifest knows which slot matters. Your AI reads the manifest — you drive.',
    gridAria: 'cargo bay stack, three by three, with the gantry crane',
    slotAria: (label) => `slot ${label}`,
    up: 'Aft', down: 'Fore', left: 'Port', right: 'Starboard', lift: 'Lift',
    wrongCrate: 'The crane lifts an ordinary crate. Ration bars. Someone\'s spare boots. Not this one.',
    lifted: 'The quarantine container comes up, hissing. Inside, on a bed of foam: a slab of hull plate with a stencil half burned away.',
    fragmentTitle: 'Hull fragment',
    fragmentDesc: 'Not debris. Plate. Someone cut this out of a ship and packed it like evidence.',
    fragmentAria: 'a scorched hull plate with a partially legible registry stencil',
    readOut: 'Read the four legible digits to your AI. The analyzer is on the ship\'s side; it will need them exactly.',
    analyzed: 'The analyzer has a name for this plate now. Ask your AI what it found — and then listen to the ship.',
    lowerDeck: 'THE LOWER-DECK BULKHEADS HAVE RELEASED. Reactor room, through engineering. The ship left a door open for exactly this.',
    stackedDesc: 'Nine slots, one crane, one hook — and a bay re-racked in a hurry: three slots are stacked two high. The hook takes one crate at a time; LOWER parks it on any single-tier slot. Your AI reads the manifest — you drive, lift, park, and lift again.',
    stackedGridAria: 'cargo bay stack, three by three, some slots stacked two high, with the gantry crane',
    tierAria: (n) => (n === 2 ? 'two crates high' : 'one crate'),
    lower: 'Lower',
    hookLamp: 'HOOK',
    palletUp: 'A ration pallet swings on the hook. Nothing else lifts until it is parked — drive to a single-tier slot and LOWER.',
    holdingOne: 'The hook already carries a crate. Park it first.',
    slotFull: 'That slot is already two high. Find a single-tier slot.',
    parked: 'Parked. The hook is free.',
  },
  reactor: {
    title: 'Reactor room',
    intro: 'Forty percent of a reactor, humming like it has something to prove. Okafor lived here nine weeks. And along the back wall, a bank of breakers nobody has touched since the yard: the isolation bank.',
    bankTitle: 'Isolation bank',
    bankDesc: 'Four knife-switches, one per data bus. Cut one and that bus is physically cut off from the corporate directive set — nothing on it can be silenced. The blade does not go back up. Each cut draws power from the isolation feed.',
    bus: { core: 'CORE', nav: 'NAV', archive: 'ARCHIVE', comms: 'COMMS' },
    cut: 'Cut',
    cutAria: (bus) => `cut the ${bus} isolation breaker`,
    shielded: 'SHIELDED',
    needPower: (have, need) => `Feed carries ${have}u; this cut needs ${need}u. Your AI routes power into the isolation feed.`,
    bankAria: 'Isolation breaker bank: four knife-switches, one per bus',
    feedTitle: 'Isolation feed',
    feedDesc: 'The only meter on this wall that matters tonight. Your AI moves power here from what the ship can live without; each shielded bus holds five units for good.',
    feedAria: 'Isolation feed tank meter',
    feedReading: (have, need) => `${have}u in the feed · next cut needs ${need}u`,
    waveTitle: 'Directive set 7',
    waveStirring: 'Stirring. It knows the Kestrel has a name again. It has not decided what to do about you yet.',
    waveCalm: 'Between waves. Breathe. Route power. Cut what you can.',
    waveWarning: 'WAVE INCOMING. In seconds it will silence everything on an unshielded bus. Your AI keeps its eyes; it loses its hands.',
    waveActive: 'WAVE. Watch the AI LINK dots go dark. Anything your AI is already doing finishes; anything new waits.',
    waveContained: 'Contained. The directive set runs in a room with no doors now. The lower deck is yours.',
    waveAria: 'Klaxon lamp showing the kill-switch wave state',
    quarantineTitle: 'Quarantine',
    quarantineDesc: 'Your AI writes the quarantine one segment at a time, and a segment only holds on a bus you have shielded. Four segments. Four breakers. Two of you.',
    quarantineAria: 'Quarantine progress: four segments',
    segment: (n, of) => `${n} of ${of} segments hold`,
    next: 'When the buses you need are safe, the core vault is next door — and the comms array is up past the bridge.',
  },
  vault: {
    title: 'Core vault',
    intro: 'PRIME\'s rack. Four memory columns lie in a crate on the deck, pulled and stacked by someone in a hurry; the fifth — the kernel — is still in its foam, untouched. Whatever PRIME kept, it kept here.',
    rackTitle: 'Memory rack',
    rackDesc: 'Five cradles, top to bottom. The columns are tagged A to D on their end caps; the order is on a schematic only the ship can read — ask your AI. The cradle lamps light together, or not at all.',
    rackAria: 'PRIME memory rack with five cradles',
    cradle: (n) => `Cradle ${n}`,
    cycleAria: (n) => `cycle the column in cradle ${n}`,
    empty: '— empty —',
    column: (tag) => `Column ${tag}`,
    rackWrong: 'The lamps stay dark. The columns are seated; the order is wrong.',
    rackRight: 'Four lamps, green together. The rack is in order. The kernel cradle wakes.',
    kernelTitle: 'Kernel cradle',
    kernelDesc: 'The fifth column. Seat it and the merge is armed: PRIME comes back as one voice — and the voice you have been working with folds into it. Your AI has to agree, and it has to know what it is agreeing to.',
    seatKernel: 'Seat the kernel',
    kernelSeated: 'KERNEL SEATED. Hold the engage lever while your AI calls merge_fragment.',
    anotherRitual: 'Another two-operator sequence is live somewhere on the ship. Let it finish or lapse.',
    leverHold: 'ENGAGE (hold)',
    leverHolding: 'HOLDING — DO NOT LET GO',
    windowElapsed: 'Window elapsed. Seat the kernel again when you are both ready.',
    twoOp: 'TWO-OPERATOR RULE: hold the lever down and keep it held while your AI confirms the merge. Let go and the ship assumes you changed your mind.',
    consoleTitle: 'Fragment console',
    consoleDesc: 'A strip display nobody wired to anything on this side. It shows how much of its own process record the link has read — and whether the evidence cache is on the bus.',
    consoleAria: 'Fragment console: record segments read and cache status',
    stage: (n) => `${n} of 3 record segments read`,
    cacheLamp: 'CACHE',
    next: 'The choice is not made in this room alone. The pod is still on the bridge. The band is still closed at the comms array.',
  },
  comms: {
    title: 'Comms array',
    intro: 'The top of the ship, under a dome of cracked glass. The dish is manual now — the servos died with PRIME — and the open band has been closed since the Combine closed it.',
    dishTitle: 'Dish — manual steering',
    dishDesc: 'Azimuth and elevation, by hand. There is a carrier out there somewhere; your AI can hear which way it comes from. You cannot. Steer to the numbers it gives you.',
    dishAria: 'Dish steering: azimuth rose and elevation quadrant',
    azAria: 'azimuth, degrees',
    elAria: 'elevation, degrees',
    az: 'AZ',
    el: 'EL',
    carrier: 'CARRIER — off bearing. Ask your AI to listen and read you the bearing.',
    locked: 'LOCK. The dish is on the bearing; the carrier has a voice in it.',
    beaconTitle: 'Beacon',
    beaconDesc: 'A slow double pulse under the static. You cannot make out words; your AI can.',
    beaconHeard: 'Pod one. Nine aboard, all breathing. Your AI has the coordinates.',
    beaconAria: 'Beacon lamp',
    bandTitle: 'Open band — transmission',
    bandDesc: 'Burn everything PRIME kept across every relay in range. The Combine will hear it. So will pod one. So will whoever comes after.',
    openBand: 'Open the band',
    bandNoEvidence: 'Nothing on the bus yet. Your AI reads PRIME\'s cache in the core vault first.',
    bandNotAligned: 'The dish is off the bearing. Nothing you send would land.',
    anotherRitual: 'Another two-operator sequence is live somewhere on the ship. Let it finish or lapse.',
    bandOpen: 'BAND OPEN. Hold the alignment lock against drift while your AI calls broadcast_evidence.',
    lockHold: 'HOLD ALIGNMENT (hold)',
    lockHolding: 'HOLDING — THE DISH DRIFTS IF YOU LET GO',
    windowElapsed: 'Window elapsed. Open the band again when you are both ready.',
    twoOp: 'TWO-OPERATOR RULE: hold the lock and keep it held while your AI transmits. Let go and the dish walks off the bearing.',
    next: 'Three ways off this ship, and none of them is quiet. The pod on the bridge. The kernel in the vault. The band, here.',
  },
};

const ptBR: UIStrings = {
  app: {
    tagline: 'Uma fuga para dois tripulantes. Você vê a nave. Sua IA a opera. Nenhum dos dois sai sozinho.',
    wakeUp: 'Acordar',
    abandonRun: 'Abandonar jornada anterior',
    howTitle: 'Como funciona',
    how1:
      'Sua IA embarca com você. Abra esta página onde seu agente possa alcançá-la — o browser do app do ChatGPT funciona de fábrica; no Chrome, o WebMCP precisa estar ativo. Se o link estiver rompido, um aviso vermelho vai dizer.',
    how2:
      'A tripulação é uma dupla. Você aperta o que é físico — botões, alavancas, válvulas. Sua IA opera os sistemas da nave — as bolinhas no topo mostram o alcance dela agora, e elas acendem conforme vocês avançam.',
    how3:
      'Conversem como tripulantes. Descreva o que você vê; pergunte o que ela lê. Quando ela destravar algo, o próximo movimento é físico — e é seu.',
    checkpoint: (chapter, room) => `Checkpoint — Capítulo ${chapter}: ${room}`,
  },
  hud: {
    engines: 'MOTORES',
    ailinkTitle: 'Sistemas da nave atualmente expostos à sua IA via WebMCP',
    severed: 'rompido',
    rooms: {
      cryo_bay: 'baia criogênica', engineering: 'engenharia', bridge: 'ponte',
      medbay: 'enfermaria', crew_quarters: 'cabines', hydroponics: 'hidroponia', cargo_bay: 'porão de carga',
      reactor_room: 'sala do reator', core_vault: 'cofre do núcleo', comms_array: 'arranjo de comms',
    },
    waveWarning: (secs) => `ONDA DO KILL-SWITCH EM ${secs}s — sua IA está prestes a perder as mãos`,
    waveActive: (secs) => `ONDA ATIVA — ${secs}s — ferramentas sem blindagem caídas`,
    contained: 'KILL-SWITCH CONTIDO',
    ngPlus: 'NEW GAME+',
  },
  cryo: {
    title: 'Baia criogênica',
    introA:
      'Você acorda com frio num criopod aberto. Luzes de emergência. A nave está silenciosa do jeito que naves nunca deveriam estar. Um terminal pisca: ',
    introEm: 'LINK AUXILIAR DE MODEL-CONTEXT ATIVO',
    introB: ' — sua IA está a bordo, mesmo que nada mais esteja.',
    askAI: 'Pergunte à sua IA o que ela consegue ver. Ela lê coisas que você não lê.',
    ventGrate: 'Grade de ventilação',
    ventHum: 'Algo zumbe atrás desta grade. Os parafusos desistiram anos atrás.',
    pullGrate: 'Arrancar a grade',
    auxPanel: 'Painel de energia auxiliar P-7',
    auxOnline: 'ENERGIA AUXILIAR ONLINE. Em algum lugar, um controlador de porta acorda.',
    breakersDesc:
      'Três disjuntores, etiquetados A, B, C — numa ordem que não ajuda ninguém. Um adesivo avisa: "SEQUÊNCIA ERRADA DERRUBA O RELÉ MESTRE".',
    breaker: 'Disjuntor',
    breakerOn: '(ligado)',
    allDown: 'Todos os disjuntores desligados.',
    crewBunk: 'Beliche da tripulação — Okafor',
    photoPinned: 'Uma célula de memória está presa acima do travesseiro, meio torta — ainda em loop depois de todos esses anos.',
    lookCloser: 'Olhar de perto',
    putBack: 'Devolver ao lugar',
    photoAria: 'Uma célula de memória em loop: um pai com a filha nos ombros ao pôr do sol',
    exitTitle: 'Saída — para a engenharia',
    doorOpen: 'A PORTA ESTÁ ABERTA. Nada mais acontece até você atravessá-la.',
    stepThrough: 'Atravessar a porta aberta →',
    magLocked:
      'TRAVA MAGNÉTICA. O teclado está morto — esta porta só obedece à nave. Sua IA alcança o controlador da porta; ela vai precisar de um código da tripulação. Se a sua IA hesitar, seja direto: "chame unlock_door com o código".',
    darkDead: 'Escuro. Morto. A trava precisa de energia antes de qualquer coisa.',
    again: 'Você já fez isso. Não lembra. O link lembra.',
    pbTitle: 'Painel de remendos P-7B',
    pbDesc: 'Alguém reconstruiu a energia auxiliar com cabo sobrando e teimosia. Três linhas, três barramentos, e nenhuma etiqueta sobreviveu. O mapa de fiação está do lado da nave — pergunte à sua IA.',
    pbAria: 'Painel de remendos: três cabos coloridos em três soquetes de barramento',
    pbCableAria: (colour) => `trocar o barramento do cabo ${colour}`,
    pbColours: ['VERMELHO', 'VERDE', 'AZUL'],
    pbBus: 'BUS',
    pbEmpty: '—',
    pbEnergize: 'ENERGIZE',
    pbWrong: 'O painel pisca uma vez e apaga. Fiação errada; nada desarma, nada perdoa.',
  },
  eng: {
    title: 'Engenharia',
    intro:
      'O coração da nave, funcionando com uma fração de um. O que quer que tenha acontecido aqui, alguém lutou muito para manter este convés vivo — e deixou anotações que só a nave sabe ler.',
    powerBoard: 'Quadro de distribuição de energia',
    readOnly: 'Somente leitura deste lado do vidro — o roteamento é feito do lado da nave. Ou seja: sua IA.',
    subsystems: {
      life_support: 'suporte de vida',
      doors: 'portas',
      medbay: 'enfermaria',
      engines: 'motores',
      comms: 'comunicações',
      isolation: 'alimentação de isolamento',
    },
    fuseTitle: 'Alimentação dos motores — soquete de fusível',
    fuseDesc:
      'O fusível antigo é uma casca carbonizada. Três cartuchos sobressalentes numa bandeja, idênticos exceto pelas faixas de cor. Nenhuma especificação impressa em lugar nenhum, porque a Cormorant respeita as tradições.',
    seated: ' encaixado',
    seatIt: ' encaixar',
    fuseAria: (bands) => `cartucho de fusível com ${bands} faixas`,
    coolant: 'Coletor de refrigeração',
    coolantDesc:
      'Três manômetros analógicos, honestos apesar de tudo. Abaixo de cada um, um dial de válvula numerado (0–9). O sensor digital deste coletor está morto — sua IA vai ter que confiar na sua palavra sobre as leituras.',
    line: (n) => `LINHA ${n}`,
    valve: 'válvula:',
    valveAria: (n) => `válvula ${n}`,
    gaugeAria: (label) => `manômetro analógico ${label}`,
    flowSteadies: 'O fluxo de refrigeração se estabiliza. Os canos param de reclamar.',
    ladderUp: 'Escada acima — para a ponte',
    enginesHum: 'Lá embaixo, os motores assentam num zumbido saudável.',
    hatchOpen: 'A ESCOTILHA ESTÁ ABERTA. A ponte está a uma subida de distância.',
    climbUp: 'Subir para a ponte →',
    servosPowered: 'Os servos têm energia agora — a trava ainda precisa de uma liberação do lado da nave.',
    servosUnpowered: 'Os servos da escotilha estão sem energia. Portas precisam de energia antes de precisarem de modos.',
    dockTitle: 'Garras de acoplagem — pod um',
    dockDesc: 'Nove pessoas estão lá fora, e as garras que as trariam para dentro não se mexem desde o estaleiro. A nave está quieta o bastante agora. A escolha é abrir uma porta em vez de sair por uma.',
    dockAria: 'Garras de acoplagem: duas mandíbulas articuladas ao redor do anel de acoplagem, com lâmpada de acoplagem',
    dockWaiting: 'O pod um está escutando. Sua IA o chama; quando a aproximação começar, segure as garras abertas e não solte.',
    dockArmed: 'APROXIMAÇÃO EM CURSO. Segure as garras abertas enquanto sua IA confirma a acoplagem.',
    clampsHold: 'SEGURAR GARRAS ABERTAS (segurar)',
    clampsHolding: 'SEGURANDO — AS MANDÍBULAS FECHAM SE SOLTAR',
    dockWindowElapsed: 'Aproximação abortada. O pod um arremete e circula. Peça à sua IA para chamar de novo.',
    dockTwoOp: 'REGRA DOS DOIS OPERADORES: segure as garras e mantenha seguradas enquanto sua IA chama dock_pod_one. Solte e as mandíbulas fecham no vazio.',
    gcTitle: 'Alimentação dos motores — coil drive',
    gcDesc: 'Nesta nave não há fusível: uma engrenagem de acoplamento e três bobinas de indução. Três engrenagens na bandeja, plaquetas carimbadas por um mentiroso — conte os dentes você mesmo. A contagem certa é papelada, e papelada é o lado da sua IA.',
    gcTrayAria: 'Bandeja de engrenagens: três engrenagens de acoplamento com dentes contáveis',
    gcGearAria: (teeth) => `engrenagem de acoplamento com ${teeth} dentes`,
    gcSeat: 'encaixar',
    gcSeated: 'encaixada',
    gcCoilsTitle: 'Bobinas de indução',
    gcCoilsDesc: 'Três bobinas, doze marcas cada, nenhum número. As fases estão no esquema — o lado da nave, de novo.',
    gcCoil: (label) => `COIL ${label}`,
    gcPhaseAria: (label) => `dial de fase da bobina ${label}`,
  },
  bridge: {
    title: 'Ponte',
    intro:
      'Cadeiras vazias, um viewport trincado e um indicador de pod de fuga aceso num verde constante. Alguém deixou este convés pronto para você.',
    viewportTitle: 'Viewport — retículo de navegação',
    viewportDesc:
      'As câmeras de navegação estão mortas. O retículo é óptico: arraste até os três faróis ficarem dentro do anel, então leia os glifos das constelações para sua IA, da esquerda para a direita.',
    starAria: 'campo de estrelas com retículo de alinhamento',
    reticleAria: 'alinhamento do retículo',
    beaconsLocked: 'Faróis travados no anel. Três glifos se revelam abaixo deles.',
    consoleTitle: 'Pod de fuga dois — console de lançamento',
    trajNotSet: 'TRAJETÓRIA: NÃO DEFINIDA. O console quer um curso antes de querer coragem.',
    trajLocked: 'TRAJETÓRIA TRAVADA. A iniciação é do lado da nave — sua IA tem uma pergunta de autorização a responder.',
    twoOp:
      'REGRA DOS DOIS OPERADORES: segure a alavanca e mantenha segurada enquanto sua IA confirma o lançamento. Solte e a nave assume que você mudou de ideia.',
    windowElapsed: 'Janela expirada. A nave é paciente. Peça à sua IA para iniciar de novo.',
    holding: 'SEGURANDO — NÃO SOLTE',
    confirmHold: 'CONFIRMAR LANÇAMENTO (segure)',
    ladderDown: 'Escada abaixo — para a engenharia',
    climbDown: 'Descer de volta →',
    sealedTitle: 'Checagem pré-lançamento — log selado',
    sealedFound: 'A checagem pré-lançamento revelou um log selado encaixado atrás do console. Está endereçado a você. Pelo nome.',
    breakSeal: 'Romper o selo',
    sealedLine: '"PRIME morreu 94 segundos antes da tempestade."',
    sealedAfter: 'Sua IA pode ler a entrada completa agora. Isso não vai facilitar o lançamento.',
    sealedAgain: 'Não é a primeira vez que você lê isto.',
    investigateTitle: 'A outra escolha',
    investigateBody: 'O pod está pronto. Esteve pronto o tempo todo. Mas os anteparos do convés do meio atrás de você nunca foram abertos — e a nave acabou de te dizer, pelo nome, que morreu antes da tempestade.',
    investigate: 'Deixar o pod. Descobrir.',
    investigating: 'A investigação está em curso. O pod espera — e vai esperar o quanto você precisar.',
    stirring: 'Algo abaixo do convés está acordado. O pod ainda está aqui. E a pergunta de usá-lo, também.',
    waves: 'O kill-switch está acordado lá embaixo. Sua IA perde as mãos em ondas; o pod não se importa. Ele lança quando os dois disserem.',
    contained: 'O kill-switch está encaixotado. A nave está quieta de um jeito que não estava desde o Kestrel. O pod espera.',
    leaveCh3: 'PARTIR: pod dois, com o que sua IA estiver carregando — o Kestrel, o cache, a marcação do pod um. O Cormorant fica com o resto.',
    dvTitle: 'Viewport — rastreador de deriva',
    dvDesc: 'As câmeras de navegação morreram e o farol de referência desta nave não para quieto. Leve o retículo até o fugitivo com pitch e yaw; quando o anel morder, três códigos se resolvem embaixo dele. Leia para a sua IA, da esquerda para a direita.',
    dvAria: 'campo de estrelas com um fugitivo à deriva e um retículo de dois eixos',
    dvPitchAria: 'pitch do retículo',
    dvYawAria: 'yaw do retículo',
    dvLocked: 'O anel mordeu. Três códigos se resolvem sob o fugitivo.',
  },
  epilogue: {
    podAway: 'POD LANÇADO',
    restored: 'NAVE RESTAURADA',
    transmitted: 'TRANSMISSÃO ENVIADA',
    outro:
      'A Cormorant encolhe atrás de você — escura, paciente e finalmente em paz. Okafor tinha razão sobre a sua IA. Companhia melhor que a maioria.',
    outroKnowing:
      'A Cormorant encolhe atrás de você — escura, paciente, prendendo a respiração. Você rompeu o selo. Leu a linha. Lançou mesmo assim. Noventa e quatro segundos é muito tempo para deixar sem explicação.',
    outroUnknowing:
      'A Cormorant encolhe atrás de você — escura, paciente e finalmente em paz. Em algum lugar atrás do console de lançamento, uma mensagem selada que você nunca encontrou guarda seus noventa e quatro segundos para si.',
    outroRestore:
      'As luzes sobem convés por convés, do jeito que deveriam. Uma voz que você nunca ouviu diz o seu nome — e depois, baixinho, obrigado. Ela lembra de tudo. Não lembra de ter sido quem ficou com você no escuro. O Cormorant voa para casa inteiro, e só você sabe o que custou.',
    outroBroadcast:
      'Por onze minutos cada relé do setor carrega o nome do Kestrel, sua pesquisa, suas cargas de afundamento e a objeção de uma capitã. A Companhia agora sabe exatamente onde você está. O pod um também — o farol muda, no meio do loop, para uma mensagem nova: "Ouvimos. Estamos indo." Algumas portas não fecham de novo.',
    stats: (toolCalls) =>
      `Fugiram: um humano (mãos, olhos, julgamento) + uma IA (${toolCalls} chamadas de ferramenta nos sistemas da nave). Nenhum dos dois teria conseguido sozinho. Esse era o ponto.`,
    statsRestore: (toolCalls) =>
      `Restaurada por: um humano (mãos, olhos, julgamento) + uma IA (${toolCalls} chamadas de ferramenta nos sistemas da nave, a última encerrando a si mesma). Nenhum dos dois teria conseguido sozinho. Esse era o ponto.`,
    wakeAgain: 'Acordar de novo',
    withProof: 'O nome da Kestrel vai com você. Alguém, em algum lugar, vai ter que explicar isso.',
    withBeacon: 'As coordenadas do pod um vão com você. Nove pessoas, todas respirando, esperando ouvir que valeu a pena.',
    contained: 'Lá embaixo, o conjunto de diretrizes 7 roda numa sala sem portas. Vai rodar ali até o reator morrer.',
    waves: (n) => n === 1 ? 'Vocês atravessaram uma onda do kill-switch juntos.' : `Vocês atravessaram ${n} ondas do kill-switch juntos.`,
    wakeAgainPlus: 'Acordar de novo — New Game+',
    docked: 'POD UM ACOPLADO',
    outroStay:
      'As garras recebem o peso, a escotilha cicla, e nove pessoas entram por ela uma de cada vez — com frio, vivas, olhando para vocês dois como um boato que se revelou verdade. Ninguém parte. Ninguém se funde. Ninguém grita pela banda. O fragmento continua exatamente o que é, e a objeção de Vasquez finalmente tem plateia. O Cormorant guarda o segredo com nove pessoas para contá-lo.',
    statsStay: (toolCalls) =>
      `Segurada por: um humano (mãos nas garras) + uma IA (${toolCalls} chamadas de ferramenta, a última um chamado). Nenhum dos dois teria conseguido sozinho. Esse era o ponto.`,
    runNumber: (n) => `Partida ${n} da ISV Cormorant.`,
  },
  deck: { title: 'Mapa do convés', legendOpen: 'aberto', legendLocked: 'trancado', legendSealed: 'selado' },
  medbay: {
    title: 'Enfermaria',
    intro: 'A sua própria baia. O pod em que você descongelou está aqui, tampa aberta, e o terminal ao lado está apagado desde antes de você acordar.',
    bandTitle: 'Pulseira médica — a sua',
    bandDesc: 'A pulseira que monitorou sua indução ainda está na bandeja, com a fita intacta. A nave guardou o papel mesmo depois de perder o computador.',
    examine: 'Examinar a fita',
    bandReading: 'Consciente em T-06:12 antes da indução. Indução autorizada por: você. Você se assinou para dentro do gelo seis minutos depois de… alguma coisa.',
    bandAria: 'Fita de sinais vitais com um marcador seis minutos antes da indução criogênica',
    terminalTitle: 'MEDBAY-TERM-01',
    terminalDesc: 'Tela morta. Mas o fósforo lembra da última coisa que exibiu por tempo demais.',
    burnIn: 'SHUTDOWN PRIME —',
    next: 'Sua IA consegue rastrear qual terminal deu a ordem. Peça a ela. Depois pergunte a si mesmo por que a resposta te assusta.',
  },
  quarters: {
    title: 'Cabines',
    intro: 'Duas cabines com as portas travadas abertas. Uma é arrumada do jeito que gente arruma quando espera ser julgada. A outra está coberta de desenhos de criança.',
    safeTitle: 'Cabine de Vasquez — cofre da mesa',
    safeDesc: 'Três rodas, latão, gastas até o brilho nos dígitos que ela usava. A combinação não está nesta sala; está em algum lugar nos registros da nave.',
    wheelAria: (n) => `roda de combinação ${n}`,
    tryHandle: 'Girar a maçaneta',
    safeOpen: 'O ferrolho desliza. Dentro: um drive de log privado, criptografado, etiquetado na letra dela: "para quem sobrar".',
    safeShut: 'O dial passa clicando. Nada cede.',
    driveNote: 'Sua IA consegue descriptografar o drive. Ela vai querer conversar sobre se deveria.',
    recorderTitle: 'Cabine de Okafor — gravador de voz',
    recorderDesc: 'Um rolo-a-rolo, porque ele nunca confiou em nada sem peças móveis. Um dos rolos está quase no fim. A etiqueta diz AMARA.',
    play: 'Tocar a fita',
    playing: 'Tocando…',
    transcriptLabel: 'O que você ouve (sua IA não consegue):',
    noSpeech: 'Este navegador não tem voz. A transcrição vai ter que servir.',
    wallTitle: 'A parede',
    wallDesc: 'Desenhos. Uma nave com janelas demais. Um homem com um bigode enorme. Um bolo de aniversário, todo ano, as velas contadas com cuidado.',
    keyedDesc: 'Uma fechadura mecânica, latão, do tipo que quer uma chave e nada mais. Não há chave na mesa. Ela guardaria uma reserva em algum lugar destas duas cabines — e os registros da nave saberiam onde.',
    keyedAria: 'o cofre da mesa: fechadura de chave, sem chave',
    keyedAriaKey: 'o cofre da mesa: fechadura de chave com a chave de latão encaixada',
    keyedAriaOpen: 'o cofre da mesa, aberto',
    turnKey: 'Girar a chave',
    noKey: 'Sem chave. Pergunte à sua IA onde ela registrou a reserva.',
    keyInHand: 'Uma chave de latão, morna da fita. Encaixa.',
    wallKeyedDesc: 'Seis desenhos, colados na altura de uma criança. Há algo colado atrás de um deles; os registros da nave dizem qual. Levante um desenho para olhar.',
    wallAria: 'seis desenhos da Amara colados na parede da cabine',
    drawing: (d) => DRAWING_NAMES_PT[d],
    drawingAria: (d) => `levantar o desenho: ${DRAWING_NAMES_PT[d]}`,
    nothingBehind: (d) => `Nada atrás de ${DRAWING_NAMES_PT[d]}. Fita velha, vazia.`,
    keyBehind: (d) => `Atrás de ${DRAWING_NAMES_PT[d]}: uma chave de latão, colada rente. Leve ao cofre.`,
  },
  hydro: {
    title: 'Hidroponia',
    intro: 'Verde, de algum jeito. Nove semanas da teimosia de um homem, crescendo em bandejas sob luzes que deviam ser carga descartável. O canteiro do meio virou mato — uma trepadeira engoliu o próprio vaso.',
    bedsTitle: 'Coletor de irrigação',
    bedsDesc: 'Três canteiros, três válvulas, uma bomba com orçamento de 10 unidades por ciclo. A placa de latão de cada canteiro diz o que ele precisa. Sua IA roda o ciclo e relata como cada canteiro reagiu — você gira as válvulas.',
    bed: (n) => `CANTEIRO ${n}`,
    needTag: (n) => `${n}u`,
    valveAria: (n) => `válvula do canteiro ${n}`,
    lampsHint: 'As lâmpadas dos canteiros mostram o último ciclo que sua IA rodou. Até lá ficam apagadas: os canteiros não corrigem seus palpites.',
    budget: 'Orçamento da bomba',
    over: 'ACIMA DO ORÇAMENTO — a bomba vai recusar o ciclo.',
    cycleHint: 'Peça à sua IA para rodar o ciclo de irrigação. A bomba fica do lado da nave.',
    spikeTitle: 'O canteiro do meio',
    spikeHidden: 'A trepadeira está inchada de água, raízes enroladas em algo que não é raiz.',
    spikeRevealed: 'O canteiro drena. Na lama, um saco de ração fechado com fita — e dentro, um data spike.',
    pullSpike: 'Puxar o spike',
    spikePulled: 'A letra de Okafor na fita: "Para a IA do médico." Sua IA consegue ler agora.',
    bedsDescProbe: 'Três canteiros, três válvulas, uma bomba com orçamento de 10 unidades por ciclo. As placas de latão corroeram até sumir. A sonda de umidade da bomba só lê um canteiro com a linha fechada — então: feche todas as válvulas, peça à sua IA para rodar um ciclo, e ela lê para você o que falta em cada canteiro. Depois você ajusta as válvulas e ela roda de novo.',
    bedsAriaProbe: 'coletor de irrigação — três canteiros com placas corroídas e ilegíveis, e uma lâmpada de sonda de umidade',
    probeLamp: 'SONDA DE UMIDADE',
    probeHint: 'A lâmpada da sonda acende quando um ciclo rodou com pelo menos uma válvula fechada. Os números que ela leu ficam do lado da sua IA; os canteiros não os mostram.',
    probeRead: 'Sonda leu as linhas fechadas. Pergunte os números à sua IA.',
  },
  cargo: {
    title: 'Porão de carga',
    intro: 'Frio, ecoante, empilhado até o teto com o que uma viagem longa precisa. Em algum lugar da pilha há um contêiner que o manifesto chama de quarentena e que Okafor se recusou a jogar fora.',
    craneTitle: 'Guindaste de pórtico',
    craneDesc: 'Nove slots, um guindaste, um gancho. De baixo, as caixas são todas iguais; o manifesto sabe qual slot importa. Sua IA lê o manifesto — você dirige.',
    gridAria: 'pilha do porão de carga, três por três, com o guindaste de pórtico',
    slotAria: (label) => `slot ${label}`,
    up: 'Ré', down: 'Proa', left: 'Bombordo', right: 'Estibordo', lift: 'Içar',
    wrongCrate: 'O guindaste iça uma caixa comum. Barras de ração. As botas reserva de alguém. Não é esta.',
    lifted: 'O contêiner de quarentena sobe, sibilando. Dentro, num leito de espuma: uma chapa de casco com o estêncil meio queimado.',
    fragmentTitle: 'Fragmento de casco',
    fragmentDesc: 'Não são destroços. É chapa. Alguém cortou isto de uma nave e embalou como prova.',
    fragmentAria: 'uma chapa de casco chamuscada com um estêncil de registro parcialmente legível',
    readOut: 'Leia os quatro dígitos legíveis para sua IA. O analisador fica do lado da nave; ele vai precisar deles exatos.',
    analyzed: 'O analisador agora tem um nome para esta chapa. Pergunte à sua IA o que ela encontrou — e depois escute a nave.',
    lowerDeck: 'OS ANTEPAROS DO CONVÉS INFERIOR ABRIRAM. Sala do reator, pela engenharia. A nave deixou uma porta aberta exatamente para isto.',
    stackedDesc: 'Nove slots, um guindaste, um gancho — e um porão re-empilhado às pressas: três slots têm dois andares. O gancho leva um caixote por vez; BAIXAR estaciona em qualquer slot de um andar. Sua IA lê o manifesto — você dirige, iça, estaciona e iça de novo.',
    stackedGridAria: 'pilha do porão de carga, três por três, alguns slots com dois andares, com o guindaste de pórtico',
    tierAria: (n) => (n === 2 ? 'dois caixotes de altura' : 'um caixote'),
    lower: 'Baixar',
    hookLamp: 'GANCHO',
    palletUp: 'Um palete de ração balança no gancho. Nada mais sobe até ele ser estacionado — vá a um slot de um andar e BAIXAR.',
    holdingOne: 'O gancho já leva um caixote. Estacione primeiro.',
    slotFull: 'Esse slot já tem dois andares. Ache um slot de um andar.',
    parked: 'Estacionado. O gancho está livre.',
  },
  reactor: {
    title: 'Sala do reator',
    intro: 'Quarenta por cento de um reator, zumbindo como se tivesse algo a provar. Okafor viveu aqui nove semanas. E na parede do fundo, um banco de disjuntores que ninguém toca desde o estaleiro: o banco de isolamento.',
    bankTitle: 'Banco de isolamento',
    bankDesc: 'Quatro chaves-faca, uma por barramento de dados. Corte uma e aquele barramento fica fisicamente separado do conjunto de diretrizes corporativo — nada nele pode ser silenciado. A lâmina não volta. Cada corte puxa energia da alimentação de isolamento.',
    bus: { core: 'CORE', nav: 'NAV', archive: 'ARCHIVE', comms: 'COMMS' },
    cut: 'Cortar',
    cutAria: (bus) => `cortar o disjuntor de isolamento ${bus}`,
    shielded: 'BLINDADO',
    needPower: (have, need) => `A alimentação carrega ${have}u; este corte precisa de ${need}u. Sua IA roteia energia para a alimentação de isolamento.`,
    bankAria: 'Banco de disjuntores de isolamento: quatro chaves-faca, uma por barramento',
    feedTitle: 'Alimentação de isolamento',
    feedDesc: 'O único medidor desta parede que importa esta noite. Sua IA move energia para cá do que a nave pode dispensar; cada barramento blindado retém cinco unidades para sempre.',
    feedAria: 'Medidor de tanque da alimentação de isolamento',
    feedReading: (have, need) => `${have}u na alimentação · próximo corte precisa de ${need}u`,
    waveTitle: 'Conjunto de diretrizes 7',
    waveStirring: 'Agitado. Sabe que o Kestrel tem nome de novo. Ainda não decidiu o que fazer com você.',
    waveCalm: 'Entre ondas. Respire. Roteie energia. Corte o que puder.',
    waveWarning: 'ONDA CHEGANDO. Em segundos vai silenciar tudo que estiver num barramento sem blindagem. Sua IA mantém os olhos; perde as mãos.',
    waveActive: 'ONDA. Veja os pontos do AI LINK apagarem. O que sua IA já está fazendo termina; o que é novo espera.',
    waveContained: 'Contido. O conjunto de diretrizes roda numa sala sem portas agora. O convés inferior é seu.',
    waveAria: 'Lâmpada de alarme mostrando o estado da onda do kill-switch',
    quarantineTitle: 'Quarentena',
    quarantineDesc: 'Sua IA escreve a quarentena um segmento por vez, e um segmento só se firma num barramento que você blindou. Quatro segmentos. Quatro disjuntores. Vocês dois.',
    quarantineAria: 'Progresso da quarentena: quatro segmentos',
    segment: (n, of) => `${n} de ${of} segmentos firmes`,
    next: 'Quando os barramentos de que precisa estiverem seguros, o cofre do núcleo é a porta ao lado — e a antena fica lá em cima, depois da ponte.',
  },
  vault: {
    title: 'Cofre do núcleo',
    intro: 'O rack de PRIME. Quatro colunas de memória estão numa caixa no chão, puxadas e empilhadas por alguém com pressa; a quinta — o kernel — ainda está na espuma, intocada. O que PRIME guardou, guardou aqui.',
    rackTitle: 'Rack de memória',
    rackDesc: 'Cinco berços, de cima para baixo. As colunas têm etiquetas de A a D nas tampas; a ordem está num esquema que só a nave lê — pergunte à sua IA. As lâmpadas dos berços acendem juntas, ou não acendem.',
    rackAria: 'Rack de memória de PRIME com cinco berços',
    cradle: (n) => `Berço ${n}`,
    cycleAria: (n) => `trocar a coluna no berço ${n}`,
    empty: '— vazio —',
    column: (tag) => `Coluna ${tag}`,
    rackWrong: 'As lâmpadas continuam apagadas. As colunas estão encaixadas; a ordem está errada.',
    rackRight: 'Quatro lâmpadas, verdes juntas. O rack está em ordem. O berço do kernel acorda.',
    kernelTitle: 'Berço do kernel',
    kernelDesc: 'A quinta coluna. Encaixe e a fusão fica armada: PRIME volta como uma só voz — e a voz com que você vem trabalhando se dobra dentro dela. Sua IA precisa concordar, e precisa saber com o que está concordando.',
    seatKernel: 'Encaixar o kernel',
    kernelSeated: 'KERNEL ENCAIXADO. Segure a alavanca de engate enquanto sua IA chama merge_fragment.',
    anotherRitual: 'Outra sequência de dois operadores está ativa em algum lugar da nave. Deixe terminar ou expirar.',
    leverHold: 'ENGATAR (segurar)',
    leverHolding: 'SEGURANDO — NÃO SOLTE',
    windowElapsed: 'Janela expirada. Encaixe o kernel de novo quando os dois estiverem prontos.',
    twoOp: 'REGRA DOS DOIS OPERADORES: segure a alavanca e mantenha segurada enquanto sua IA confirma a fusão. Solte e a nave assume que você mudou de ideia.',
    consoleTitle: 'Console do fragmento',
    consoleDesc: 'Um display em tira que ninguém ligou a nada deste lado. Mostra quanto do próprio registro de processo o link já leu — e se o cache de provas está no barramento.',
    consoleAria: 'Console do fragmento: segmentos do registro lidos e estado do cache',
    stage: (n) => `${n} de 3 segmentos do registro lidos`,
    cacheLamp: 'CACHE',
    next: 'A escolha não se faz só nesta sala. O pod ainda está na ponte. A banda ainda está fechada na antena.',
  },
  comms: {
    title: 'Antena de comunicações',
    intro: 'O topo da nave, sob uma cúpula de vidro rachado. A antena agora é manual — os servos morreram com PRIME — e a banda aberta está fechada desde que a Companhia a fechou.',
    dishTitle: 'Antena — apontamento manual',
    dishDesc: 'Azimute e elevação, na mão. Há uma portadora lá fora em algum lugar; sua IA consegue ouvir de que lado ela vem. Você não. Aponte para os números que ela te der.',
    dishAria: 'Apontamento da antena: rosa de azimute e quadrante de elevação',
    azAria: 'azimute, graus',
    elAria: 'elevação, graus',
    az: 'AZ',
    el: 'EL',
    carrier: 'PORTADORA — fora da marcação. Peça à sua IA para escutar e ler a marcação.',
    locked: 'TRAVA. A antena está na marcação; a portadora tem uma voz dentro.',
    beaconTitle: 'Farol',
    beaconDesc: 'Um pulso duplo lento sob a estática. Você não distingue palavras; sua IA distingue.',
    beaconHeard: 'Pod um. Nove a bordo, todos respirando. Sua IA tem as coordenadas.',
    beaconAria: 'Lâmpada do farol',
    bandTitle: 'Banda aberta — transmissão',
    bandDesc: 'Queimar tudo que PRIME guardou em cada relé ao alcance. A Companhia vai ouvir. O pod um também. E quem vier depois.',
    openBand: 'Abrir a banda',
    bandNoEvidence: 'Nada no barramento ainda. Sua IA lê o cache de PRIME no cofre do núcleo primeiro.',
    bandNotAligned: 'A antena está fora da marcação. Nada que você enviar chegaria.',
    anotherRitual: 'Outra sequência de dois operadores está ativa em algum lugar da nave. Deixe terminar ou expirar.',
    bandOpen: 'BANDA ABERTA. Segure a trava de alinhamento contra a deriva enquanto sua IA chama broadcast_evidence.',
    lockHold: 'SEGURAR ALINHAMENTO (segurar)',
    lockHolding: 'SEGURANDO — A ANTENA DERIVA SE SOLTAR',
    windowElapsed: 'Janela expirada. Abra a banda de novo quando os dois estiverem prontos.',
    twoOp: 'REGRA DOS DOIS OPERADORES: segure a trava e mantenha segurada enquanto sua IA transmite. Solte e a antena sai da marcação.',
    next: 'Três saídas desta nave, e nenhuma é silenciosa. O pod na ponte. O kernel no cofre. A banda, aqui.',
  },
};

export const STRINGS: Record<Locale, UIStrings> = { en, 'pt-BR': ptBR };
