// Locale- and seed-aware access to the narrative content the agent reads through tools.
// Machine codes stay identical across locales (in-fiction, the ship does not translate
// codes) but vary per ship: every run rolls its own breaker order, birthday PIN, star
// fix, and launch phrase from the save's seed (see secrets.ts).
import type { BreakerId } from './types';
import type { CrewLogEntry } from './content';
import { CREW_MANIFEST, EMERGENCY_BULLETIN, SCHEMATICS } from './content';
import { getLocale } from './i18n';
import { secretsFor } from './secrets';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const EMERGENCY_BULLETIN_PT =
  'BOLETIM AUTOMÁTICO — ISV CORMORANT. Computador principal: offline. Link auxiliar de model-context: ativo (isso é você). ' +
  'Sinais vitais de tripulação: um (1), na baia criogênica. Recomendação: cooperem. O tripulante não alcança os sistemas. Você não alcança as paredes.';

const CREW_MANIFEST_PT =
  'TRIPULAÇÃO DE REGISTRO — ISV CORMORANT\n' +
  '• Cap. E. Vasquez — autorização de comando suspensa (evacuada)\n' +
  '• Eng.-Chefe R. Okafor — senha de porta: PIN padrão de data familiar, dia+mês (DDMM). A filha dele. Ele fala dela o tempo todo.\n' +
  '• Of. Médico [VOCÊ] — em descongelamento. Registros de autorização perdidos com o computador principal.';

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

export function getEmergencyBulletin(): string {
  return getLocale() === 'pt-BR' ? EMERGENCY_BULLETIN_PT : EMERGENCY_BULLETIN;
}

export function getCrewManifest(): string {
  return getLocale() === 'pt-BR' ? CREW_MANIFEST_PT : CREW_MANIFEST;
}

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
