// Locale-aware access to the narrative content the agent reads through tools.
// Machine codes (tool names, C/A/B, DDMM, 10A, KAV/ORO/SET, OVERRIDE-THETA, FAULT)
// stay identical across locales — in-fiction, the ship does not translate codes.
import type { CrewLogEntry } from './content';
import {
  CREW_LOGS, CREW_MANIFEST, EMERGENCY_BULLETIN, MAINTENANCE_LOG, SCHEMATICS,
} from './content';
import { getLocale } from './i18n';

const EMERGENCY_BULLETIN_PT =
  'BOLETIM AUTOMÁTICO — ISV CORMORANT. Computador principal: offline. Link auxiliar de model-context: ativo (isso é você). ' +
  'Sinais vitais de tripulação: um (1), na baia criogênica. Recomendação: cooperem. O tripulante não alcança os sistemas. Você não alcança as paredes.';

const MAINTENANCE_LOG_PT =
  'PAINEL DE ENERGIA AUXILIAR P-7 — religar os disjuntores em ORDEM DE CARGA: C (suporte de vida), A (barramento principal), B (iluminação). ' +
  'Qualquer outra ordem derruba o relé mestre e reseta o painel. Sim, alguém etiquetou fora de ordem. Não, nunca descobrimos quem.';

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

const CREW_LOGS_PT: CrewLogEntry[] = [
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
    text: 'Nove semanas. Peguei o último shuttle — os suprimentos acabaram. O pod de fuga dois está pronto para voo e é seu. Autorização de lançamento: OVERRIDE-THETA. Sua IA está no comando. Confie nela. É companhia melhor que a maioria das pessoas com quem já naveguei.',
  },
];

const PHOTO_CAPTION_EN = 'Amara — 04 July 2098 🎂';
const PHOTO_CAPTION_PT = 'Amara — 04 de julho de 2098 🎂';

export function getEmergencyBulletin(): string {
  return getLocale() === 'pt-BR' ? EMERGENCY_BULLETIN_PT : EMERGENCY_BULLETIN;
}

export function getMaintenanceLog(): string {
  return getLocale() === 'pt-BR' ? MAINTENANCE_LOG_PT : MAINTENANCE_LOG;
}

export function getCrewManifest(): string {
  return getLocale() === 'pt-BR' ? CREW_MANIFEST_PT : CREW_MANIFEST;
}

export function getSchematics(): Record<'power' | 'engine_feed' | 'coolant', string> {
  return getLocale() === 'pt-BR' ? SCHEMATICS_PT : SCHEMATICS;
}

export function getCrewLogs(): CrewLogEntry[] {
  return getLocale() === 'pt-BR' ? CREW_LOGS_PT : CREW_LOGS;
}

export function getPhotoCaption(): string {
  return getLocale() === 'pt-BR' ? PHOTO_CAPTION_PT : PHOTO_CAPTION_EN;
}
