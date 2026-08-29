import type { Locale } from '../game/i18n';
import type { RoomId, SubsystemId } from '../game/types';

export interface UIStrings {
  app: {
    tagline: string;
    wakeUp: string;
    abandonRun: string;
    howTitle: string;
    how1: string;
    how2: string;
    how3: string;
  };
  hud: {
    engines: string;
    ailinkTitle: string;
    severed: string;
    rooms: Record<RoomId, string>;
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
  };
  epilogue: {
    podAway: string;
    outro: string;
    stats: (toolCalls: number) => string;
    wakeAgain: string;
  };
  deck: { title: string; legendOpen: string; legendLocked: string; legendSealed: string };
  sealed: { title: string; body: string };
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
  },
  epilogue: {
    podAway: 'POD AWAY',
    outro:
      'The Cormorant shrinks behind you — dark, patient, and finally at rest. Okafor was right about your AI. Better company than most.',
    stats: (toolCalls) =>
      `Escaped by: one human (hands, eyes, judgment) + one AI (${toolCalls} tool calls on ship systems). Neither of you could have done it alone. That was the point.`,
    wakeAgain: 'Wake up again',
  },
  deck: { title: 'Deck map', legendOpen: 'open', legendLocked: 'locked', legendSealed: 'sealed' },
  sealed: {
    title: 'Sealed bulkhead',
    body: 'The door here is welded from the other side, and the ship has no opinion about it yet. Whatever this compartment holds belongs to a later chapter.',
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
  },
  epilogue: {
    podAway: 'POD LANÇADO',
    outro:
      'A Cormorant encolhe atrás de você — escura, paciente e finalmente em paz. Okafor tinha razão sobre a sua IA. Companhia melhor que a maioria.',
    stats: (toolCalls) =>
      `Fugiram: um humano (mãos, olhos, julgamento) + uma IA (${toolCalls} chamadas de ferramenta nos sistemas da nave). Nenhum dos dois teria conseguido sozinho. Esse era o ponto.`,
    wakeAgain: 'Acordar de novo',
  },
  deck: { title: 'Mapa do convés', legendOpen: 'aberto', legendLocked: 'trancado', legendSealed: 'selado' },
  sealed: {
    title: 'Anteparo selado',
    body: 'A porta aqui foi soldada do outro lado, e a nave ainda não tem opinião sobre isso. O que este compartimento guarda pertence a um capítulo posterior.',
  },
};

export const STRINGS: Record<Locale, UIStrings> = { en, 'pt-BR': ptBR };
