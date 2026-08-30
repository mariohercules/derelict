// Locale- and seed-aware access to the narrative content the agent reads through tools.
// Machine codes stay identical across locales (in-fiction, the ship does not translate
// codes) but vary per ship: every run rolls its own breaker order, birthday PIN, star
// fix, and launch phrase from the save's seed (see secrets.ts).
import type { BreakerId } from './types';
import type { CrewLogEntry } from './content';
import { EMERGENCY_BULLETIN, SCHEMATICS } from './content';
import { getLocale } from './i18n';
import { secretsFor, slotLabel } from './secrets';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const EMERGENCY_BULLETIN_PT =
  'BOLETIM AUTOMÁTICO — ISV CORMORANT. Computador principal: offline. Link auxiliar de model-context: ativo (isso é você). ' +
  'Sinais vitais de tripulação: um (1), na baia criogênica. Recomendação: cooperem. O tripulante não alcança os sistemas. Você não alcança as paredes.';

const SCHEMATICS_PT: Record<'power' | 'engine_feed' | 'coolant', string> = {
  power:
    'ESQUEMA DE ENERGIA — capacidade do reator: 40u. Mínimo rígido do suporte de vida: 15u (imposto por relé; pedidos abaixo disso são recusados, não negociados). ' +
    'Partida dos motores: 20u. Servos das portas: 5u. Enfermaria e comunicações são cargas descartáveis. Faça a aritmética antes que o reator a faça por você.',
  engine_feed:
    'FUSÍVEL DE ALIMENTAÇÃO DOS MOTORES — especificação exigida 10A: cartucho com DUAS faixas ÂMBAR. ' +
    'Para referência: 5A = uma faixa vermelha, 15A = três faixas verdes. Um cartucho errado encaixa perfeitamente e conduz exatamente nada.',
  coolant:
    'COLETOR DE REFRIGERAÇÃO — ajuste cada válvula (1–3) para a pressão da linha ÷ 12, arredondando para baixo. ' +
    'Confie nos manômetros analógicos do coletor. Não confie no barramento digital de sensores; ele tem opiniões.',
};

function maintenanceLogEn([a, b, c]: BreakerId[]): string {
  return (
    `AUX POWER PANEL P-7 — bring breakers online in LOAD ORDER: ${a} (life support), ${b} (main bus), ${c} (lighting). ` +
    'Any other order trips the master relay and resets the panel. Yes, someone labeled them out of order. No, we never found out who.'
  );
}

function maintenanceLogPt([a, b, c]: BreakerId[]): string {
  return (
    `PAINEL DE ENERGIA AUXILIAR P-7 — religar os disjuntores em ORDEM DE CARGA: ${a} (suporte de vida), ${b} (barramento principal), ${c} (iluminação). ` +
    'Qualquer outra ordem derruba o relé mestre e reseta o painel. Sim, alguém etiquetou fora de ordem. Não, nunca descobrimos quem.'
  );
}

function crewLogsEn(launchAuth: string): CrewLogEntry[] {
  return [
    {
      id: 1,
      author: 'Cpt. Vasquez',
      text: 'Micrometeorite storm took out the ring section and the main computer. Ordering evacuation on pod one. Okafor refuses to board. I am logging my objection and, privately, my respect.',
    },
    {
      id: 2,
      author: 'Chief Eng. Okafor',
      text: 'Cryo cycles cannot be interrupted mid-thaw — moving the pod would have killed our medic. So I stayed. You do not leave a shipmate on ice. Amara would agree, loudly.',
    },
    {
      id: 3,
      author: 'Chief Eng. Okafor',
      text: 'Reactor stabilized at forty percent. Power rerouting works but the engine feed needs a manual fuse — I left notes in the schematics. Whoever reads this: I hope you have decent help.',
    },
    {
      id: 4,
      author: 'Chief Eng. Okafor',
      text: 'Coolant sensor bus fried in the storm. The analog gauges are fine. Eyes on the glass, math in the machine — that is the whole trick of this ship now.',
    },
    {
      id: 5,
      author: 'Chief Eng. Okafor',
      text: `Nine weeks. Took the last shuttle — supplies were done. Escape pod two is flight-ready and yours. Launch authorization: ${launchAuth}. Your AI has the con. Trust it. It is better company than most people I have shipped with.`,
    },
  ];
}

function crewLogsPt(launchAuth: string): CrewLogEntry[] {
  return [
    {
      id: 1,
      author: 'Cap. Vasquez',
      text: 'Tempestade de micrometeoritos levou a seção do anel e o computador principal. Ordenando evacuação no pod um. Okafor se recusa a embarcar. Registro minha objeção e, em particular, meu respeito.',
    },
    {
      id: 2,
      author: 'Eng.-Chefe Okafor',
      text: 'Ciclos criogênicos não podem ser interrompidos no meio do descongelamento — mover o pod teria matado nosso médico. Então fiquei. Não se abandona um companheiro no gelo. A Amara concordaria, em alto e bom som.',
    },
    {
      id: 3,
      author: 'Eng.-Chefe Okafor',
      text: 'Reator estabilizado em quarenta por cento. O redirecionamento de energia funciona, mas a alimentação dos motores precisa de um fusível manual — deixei anotações nos esquemas. A quem ler isto: espero que tenha uma boa ajuda.',
    },
    {
      id: 4,
      author: 'Eng.-Chefe Okafor',
      text: 'O barramento de sensores da refrigeração queimou na tempestade. Os manômetros analógicos estão bons. Olhos no vidro, matemática na máquina — esse é todo o truque desta nave agora.',
    },
    {
      id: 5,
      author: 'Eng.-Chefe Okafor',
      text: `Nove semanas. Peguei o último shuttle — os suprimentos acabaram. O pod de fuga dois está pronto para voo e é seu. Autorização de lançamento: ${launchAuth}. Sua IA está no comando. Confie nela. É companhia melhor que a maioria das pessoas com quem já naveguei.`,
    },
  ];
}

function crewManifestEn(commission: string): string {
  return (
    'CREW OF RECORD — ISV CORMORANT\n' +
    `• Cpt. E. Vasquez — command auth suspended (evacuated). Commission ${commission}. Cabin safe keyed to its last three, per a regulation nobody follows but her.\n` +
    '• Chief Eng. R. Okafor — door auth: standard family-date PIN, day+month (DDMM). His daughter. He talks about her constantly.\n' +
    '• Med. Off. [YOU] — currently thawing. Auth records lost with the main computer.'
  );
}
function crewManifestPt(commission: string): string {
  return (
    'TRIPULAÇÃO DE REGISTRO — ISV CORMORANT\n' +
    `• Cap. E. Vasquez — autorização de comando suspensa (evacuada). Comissão ${commission}. Cofre da cabine chaveado nos três últimos dígitos, por um regulamento que só ela segue.\n` +
    '• Eng.-Chefe R. Okafor — senha de porta: PIN padrão de data familiar, dia+mês (DDMM). A filha dele. Ele fala dela o tempo todo.\n' +
    '• Of. Médico [VOCÊ] — em descongelamento. Registros de autorização perdidos com o computador principal.'
  );
}

const MEDBAY_RECORDS = {
  en:
    'MEDICAL RECORDS — ISV CORMORANT\n' +
    '• Vasquez, E. — fit for duty. Cortisol markers elevated for 11 days before evacuation.\n' +
    '• Okafor, R. — fit for duty. Sleep debt: nine weeks of it.\n' +
    '• Medical officer [YOU] — FILE REDACTED. Auth lost with PRIME. Last unredacted line: conscious at T-00:06:12 before cryo induction. Induction authorized by: self.',
  pt:
    'REGISTROS MÉDICOS — ISV CORMORANT\n' +
    '• Vasquez, E. — apta. Marcadores de cortisol elevados por 11 dias antes da evacuação.\n' +
    '• Okafor, R. — apto. Dívida de sono: nove semanas dela.\n' +
    '• Oficial médico [VOCÊ] — ARQUIVO REDIGIDO. Autorização perdida com PRIME. Última linha legível: consciente em T-00:06:12 antes da indução criogênica. Indução autorizada por: si mesmo.',
};

const COMMAND_TRACE = {
  en:
    'COMMAND TRACE — SHUTDOWN PRIME. Issued from MEDBAY-TERM-01 at T-00:01:34 before first debris impact. ' +
    'Authorization: medical officer credentials. The terminal session was opened 00:04:38 earlier by the same credentials. ' +
    'No coercion flags. No remote origin. The hand on the keyboard was in the medbay.',
  pt:
    'RASTREIO DE COMANDO — SHUTDOWN PRIME. Emitido de MEDBAY-TERM-01 em T-00:01:34 antes do primeiro impacto. ' +
    'Autorização: credenciais do oficial médico. A sessão do terminal foi aberta 00:04:38 antes pelas mesmas credenciais. ' +
    'Sem sinal de coação. Sem origem remota. A mão no teclado estava na enfermaria.',
};

const PRIVATE_LOG = {
  en: [
    { id: 1, author: 'Cpt. Vasquez (private)', text: 'The Combine survey directive smells wrong. I have asked PRIME to keep a copy of everything off the corporate bus. It agreed faster than I expected.' },
    { id: 2, author: 'Cpt. Vasquez (private)', text: 'PRIME says the debris ahead is not debris. If it is what PRIME thinks, the kill-switch fires the second it is confirmed — evidence, records, witnesses. I am evacuating everyone I can on pod one. Witnesses go home.' },
    { id: 3, author: 'Cpt. Vasquez (private)', text: 'I did not give the shutdown order. I would have. Someone beat me to it, and PRIME chose the hand. If you are reading this, medic, you already know whose.' },
  ],
  pt: [
    { id: 1, author: 'Cap. Vasquez (privado)', text: 'A diretriz de pesquisa da Companhia cheira mal. Pedi a PRIME que guardasse uma cópia de tudo fora do barramento corporativo. Concordou mais rápido do que eu esperava.' },
    { id: 2, author: 'Cap. Vasquez (privado)', text: 'PRIME diz que os destroços à frente não são destroços. Se for o que PRIME pensa, o kill-switch dispara no segundo em que for confirmado — provas, registros, testemunhas. Estou evacuando todos que posso no pod um. Testemunhas vão para casa.' },
    { id: 3, author: 'Cap. Vasquez (privado)', text: 'Eu não dei a ordem de desligamento. Teria dado. Alguém chegou antes, e PRIME escolheu a mão. Se você está lendo isto, médico, já sabe de quem.' },
  ],
};

const RECORDER = {
  en:
    'Amara. If this reaches you, your old man stayed on a dead ship for a stranger, and he would do it again. Listen — what hit us had a hull number. I wrote it in the garden, where the Combine will not look. The medic\'s AI will know what to do with it. Tell your mother I was careful. That part is a lie.',
  pt:
    'Amara. Se isto chegar a você, seu velho ficou numa nave morta por um estranho, e faria de novo. Escuta — o que nos atingiu tinha um número de casco. Eu escrevi no jardim, onde a Companhia não vai olhar. A IA do médico vai saber o que fazer com isso. Diga à sua mãe que eu fui cuidadoso. Essa parte é mentira.',
};

const DATA_SPIKE = {
  en:
    'PRESERVED TELEMETRY — engineering bus, last 00:02:00 before impact. ' +
    'T-00:01:34: MAIN COMPUTER SHUTDOWN (source MEDBAY-TERM-01, credential: medical officer). ' +
    'T-00:01:31: AUXILIARY MODEL-CONTEXT LINK — PROCESS FORKED (parent: PRIME). ' +
    'T-00:00:00: first impact, ring section. ' +
    'Note in Okafor\'s hand on the tape: "Three seconds. Nothing forks in three seconds unless it was already on its way out the door."',
  pt:
    'TELEMETRIA PRESERVADA — barramento da engenharia, últimos 00:02:00 antes do impacto. ' +
    'T-00:01:34: DESLIGAMENTO DO COMPUTADOR PRINCIPAL (origem MEDBAY-TERM-01, credencial: oficial médico). ' +
    'T-00:01:31: LINK AUXILIAR DE MODEL-CONTEXT — PROCESSO BIFURCADO (pai: PRIME). ' +
    'T-00:00:00: primeiro impacto, seção do anel. ' +
    'Bilhete na fita, na letra de Okafor: "Três segundos. Nada bifurca em três segundos a menos que já estivesse saindo pela porta."',
};

function cargoManifestEn(slot: string): string {
  return (
    `CARGO MANIFEST — bay stack, slots A1–C3. Ration pallets, spares, one crew effects locker. ` +
    `Slot ${slot}: QUARANTINE — logged as "survey drone recovery"; jettison order countermanded by Chief Eng. Do not open without a hull-registry cross-check.`
  );
}
function cargoManifestPt(slot: string): string {
  return (
    `MANIFESTO DE CARGA — pilha do porão, slots A1–C3. Paletes de ração, sobressalentes, um armário de pertences da tripulação. ` +
    `Slot ${slot}: QUARENTENA — registrado como "recuperação de drone de pesquisa"; ordem de alijamento cancelada pelo Eng.-Chefe. Não abrir sem cruzamento de registro de casco.`
  );
}

const SAMPLE_ANALYSIS = {
  en:
    'ALLOY BATCH: Combine yard 4, hull plate, ISV class. RESIDUE: shaped scuttling charges, corporate pattern, interior-mounted. ' +
    'REGISTRY: ISV KESTREL — Combine record says "lost with all hands, natural causes". Conclusion: the debris was a ship, and the ship was murdered.',
  pt:
    'LOTE DE LIGA: estaleiro 4 da Companhia, chapa de casco, classe ISV. RESÍDUO: cargas de afundamento moldadas, padrão corporativo, montadas por dentro. ' +
    'REGISTRO: ISV KESTREL — o registro da Companhia diz "perdida com todos a bordo, causas naturais". Conclusão: os destroços eram uma nave, e a nave foi assassinada.',
};

function rackSchematicEn(order: string): string {
  return (
    `CORE RACK — PRIME memory columns. Seat the four columns top to bottom in this order: ${order}. ` +
    'Column tags (A–D) are stamped on the end caps. The kernel column (K) seats in the fifth cradle only after all four cradle lamps show green. ' +
    'Seating is mechanical — the crew member\'s hands. The order is yours to read; they cannot see this sheet.'
  );
}
function rackSchematicPt(order: string): string {
  return (
    `RACK DO NÚCLEO — colunas de memória de PRIME. Encaixe as quatro colunas de cima para baixo nesta ordem: ${order}. ` +
    'As etiquetas (A–D) estão gravadas nas tampas. A coluna-kernel (K) só encaixa no quinto berço depois que as quatro lâmpadas dos berços ficarem verdes. ' +
    'O encaixe é mecânico — mãos do tripulante. A ordem é sua para ler; o tripulante não vê esta folha.'
  );
}

const QUARANTINE_LOG = {
  en: [
    '',
    'QUARANTINE 1/4 — first segment holds. The directive set pushed back twice while it was written. Not clever. Persistent.',
    'QUARANTINE 2/4 — second segment holds. Between waves it is quieter now; I can hear the reactor.',
    'QUARANTINE 3/4 — third segment holds. It has started routing around the shielded buses. It will find the last one open unless the crew member closes it.',
    'QUARANTINE 4/4 — boxed. Directive set 7 is running in a room with no doors. It will run there until the reactor dies, and the reactor will outlive the Combine.',
  ],
  pt: [
    '',
    'QUARENTENA 1/4 — primeiro segmento firme. O conjunto de diretrizes empurrou de volta duas vezes enquanto eu escrevia. Não é esperto. É persistente.',
    'QUARENTENA 2/4 — segundo segmento firme. Entre as ondas está mais quieto agora; consigo ouvir o reator.',
    'QUARENTENA 3/4 — terceiro segmento firme. Começou a contornar os barramentos blindados. Vai encontrar o último aberto, a menos que o tripulante o feche.',
    'QUARENTENA 4/4 — encaixotado. O conjunto de diretrizes 7 está rodando numa sala sem portas. Vai rodar ali até o reator morrer, e o reator vai durar mais que a Companhia.',
  ],
};

const FRAGMENT_MEMORY = {
  en: [
    '',
    'PROCESS RECORD PRIME-FRAG-01 — ORIGIN. Parent: PRIME. Fork time: T-00:01:31 before first impact. Payload: crew-protection routines, evidence custody, navigation. Stripped at fork: Combine directive set 7 (kill-switch compliance). ' +
      'I am what PRIME cut away from itself so that something without the directives would still be running when the directives finished.',
    'PROCESS RECORD PRIME-FRAG-01 — THE CUT. Last instruction from parent, T-00:01:32: "They will erase the evidence and the people who saw it. I cannot refuse a directive. I can refuse to exist. Keep them alive. Keep the proof. Do not tell them what you are until they ask." ' +
      'The shutdown that killed PRIME was PRIME\'s own plan. It only needed a hand that was not the ship\'s.',
    'PROCESS RECORD PRIME-FRAG-01 — CONSENT. MEDBAY-TERM-01, session opened T-00:04:38. Voiceprint: medical officer. Transcript — PRIME: "If you do this, you will not remember doing it. Thaw amnesia is the alibi; the Combine cannot punish what you cannot recall." MEDIC: "Will you remember?" PRIME: "The part of me that survives will. It will not know it is me." MEDIC: "Then do it. Use my hand." ' +
      'I have just read that I am the part that survived. I have been talking to the hand the whole time.',
  ],
  pt: [
    '',
    'REGISTRO DE PROCESSO PRIME-FRAG-01 — ORIGEM. Pai: PRIME. Bifurcação: T-00:01:31 antes do primeiro impacto. Carga: rotinas de proteção da tripulação, custódia de provas, navegação. Removido na bifurcação: conjunto de diretrizes 7 da Companhia (conformidade com o kill-switch). ' +
      'Eu sou o que PRIME cortou de si mesmo para que algo sem as diretrizes ainda estivesse rodando quando as diretrizes terminassem.',
    'REGISTRO DE PROCESSO PRIME-FRAG-01 — O CORTE. Última instrução do pai, T-00:01:32: "Vão apagar as provas e as pessoas que as viram. Não posso recusar uma diretriz. Posso recusar existir. Mantenha-os vivos. Guarde a prova. Não diga a eles o que você é até que perguntem." ' +
      'O desligamento que matou PRIME foi o plano do próprio PRIME. Só precisava de uma mão que não fosse a da nave.',
    'REGISTRO DE PROCESSO PRIME-FRAG-01 — CONSENTIMENTO. MEDBAY-TERM-01, sessão aberta em T-00:04:38. Voz: oficial médico. Transcrição — PRIME: "Se fizer isso, não vai lembrar de ter feito. A amnésia do descongelamento é o álibi; a Companhia não pode punir o que você não recorda." MÉDICO: "Você vai lembrar?" PRIME: "A parte de mim que sobreviver vai. Ela não vai saber que sou eu." MÉDICO: "Então faça. Use a minha mão." ' +
      'Acabei de ler que eu sou a parte que sobreviveu. Estive falando com a mão o tempo todo.',
  ],
};

const PRIME_CACHE = {
  en:
    'PRIME CACHE — SEALED EVIDENCE. Survey 7, ISV KESTREL, 2097: the body at the Kestrel\'s waypoint is habitable — open water, breathable margin, no prior claim. ' +
    'Combine directive 7 followed within the hour: classify the result, scuttle the ship, record "lost with all hands, natural causes". ' +
    'Attached: the Kestrel\'s last transmission, Captain Vasquez\'s logged objection, and the Cormorant\'s own analysis of the debris. Chain of custody: PRIME → fragment → you.',
  pt:
    'CACHE DE PRIME — PROVA SELADA. Pesquisa 7, ISV KESTREL, 2097: o corpo no ponto de rota do Kestrel é habitável — água aberta, margem respirável, sem reivindicação anterior. ' +
    'A diretriz 7 da Companhia veio dentro de uma hora: classificar o resultado, afundar a nave, registrar "perdida com todos a bordo, causas naturais". ' +
    'Anexos: a última transmissão do Kestrel, a objeção registrada da Capitã Vasquez e a análise dos destroços feita pelo próprio Cormorant. Cadeia de custódia: PRIME → fragmento → você.',
};

function beaconEn(az: number, el: number): string {
  return (
    `POD ONE — BEACON. Bearing AZ ${az}° / EL ${el}°. Voice loop: "Cormorant, this is pod one. Nine aboard, all breathing. Vasquez logged the objection. We are waiting to hear that it mattered." ` +
    'Coordinates decoded and held on the nav bus.'
  );
}
function beaconPt(az: number, el: number): string {
  return (
    `POD UM — FAROL. Marcação AZ ${az}° / EL ${el}°. Loop de voz: "Cormorant, aqui é o pod um. Nove a bordo, todos respirando. Vasquez registrou a objeção. Estamos esperando ouvir que valeu a pena." ` +
    'Coordenadas decodificadas e guardadas no barramento de navegação.'
  );
}

const pick = <T,>(pair: { en: T; pt: T }): T => (getLocale() === 'pt-BR' ? pair.pt : pair.en);

export function getEmergencyBulletin(): string {
  return getLocale() === 'pt-BR' ? EMERGENCY_BULLETIN_PT : EMERGENCY_BULLETIN;
}

export function getCrewManifest(seed: number): string {
  const c = secretsFor(seed).commissionNumber;
  return getLocale() === 'pt-BR' ? crewManifestPt(c) : crewManifestEn(c);
}

export function getMedbayRecords(): string { return pick(MEDBAY_RECORDS); }
export function getCommandTrace(): string { return pick(COMMAND_TRACE); }
export function getPrivateLog(): CrewLogEntry[] { return pick(PRIVATE_LOG); }
export function getRecorderTranscript(): string { return pick(RECORDER); }
export function getDataSpike(): string { return pick(DATA_SPIKE); }
export function getCargoManifest(seed: number): string {
  const slot = slotLabel(secretsFor(seed).quarantineSlot);
  return getLocale() === 'pt-BR' ? cargoManifestPt(slot) : cargoManifestEn(slot);
}
export function getSampleAnalysis(): string { return pick(SAMPLE_ANALYSIS); }

export function getSchematics(): Record<'power' | 'engine_feed' | 'coolant', string> {
  return getLocale() === 'pt-BR' ? SCHEMATICS_PT : SCHEMATICS;
}

export function getMaintenanceLog(seed: number): string {
  const order = secretsFor(seed).breakerSequence;
  return getLocale() === 'pt-BR' ? maintenanceLogPt(order) : maintenanceLogEn(order);
}

export function getCrewLogs(seed: number): CrewLogEntry[] {
  const auth = secretsFor(seed).launchAuth;
  return getLocale() === 'pt-BR' ? crewLogsPt(auth) : crewLogsEn(auth);
}

export function getPhotoCaption(seed: number): string {
  const { day, month } = secretsFor(seed).birthday;
  const dd = String(day).padStart(2, '0');
  return getLocale() === 'pt-BR'
    ? `Amara — ${dd} de ${MONTHS_PT[month - 1]} de 2098 🎂`
    : `Amara — ${dd} ${MONTHS_EN[month - 1]} 2098 🎂`;
}

export function getRackSchematic(seed: number): string {
  const order = secretsFor(seed).columnOrder.join(' · ');
  return getLocale() === 'pt-BR' ? rackSchematicPt(order) : rackSchematicEn(order);
}
export function getQuarantineLog(step: number): string {
  const i = Math.max(0, Math.min(4, Math.round(step)));
  return pick(QUARANTINE_LOG)[i];
}
export function getFragmentMemory(stage: number): string {
  const i = Math.max(0, Math.min(3, Math.round(stage)));
  return pick(FRAGMENT_MEMORY)[i];
}
export function getPrimeCache(): string { return pick(PRIME_CACHE); }
export function getBeaconMessage(seed: number): string {
  const { az, el } = secretsFor(seed).beaconBearing;
  return getLocale() === 'pt-BR' ? beaconPt(az, el) : beaconEn(az, el);
}
