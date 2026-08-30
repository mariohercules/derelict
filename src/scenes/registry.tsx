import type { JSX } from 'react';
import type { RoomId } from '../game/types';
import { CryoBay } from './CryoBay';
import { Engineering } from './Engineering';
import { Bridge } from './Bridge';
import { Medbay } from './Medbay';
import { CrewQuarters } from './CrewQuarters';
import { Hydroponics } from './Hydroponics';
import { CargoBay } from './CargoBay';
import { SealedCompartment } from './SealedCompartment';

export const SCENES: Record<RoomId, () => JSX.Element> = {
  cryo_bay: CryoBay,
  engineering: Engineering,
  bridge: Bridge,
  medbay: Medbay,
  crew_quarters: CrewQuarters,
  hydroponics: Hydroponics,
  cargo_bay: CargoBay,
  reactor_room: SealedCompartment,
  core_vault: SealedCompartment,
  comms_array: SealedCompartment,
};
