import type { JSX } from 'react';
import type { RoomId } from '../game/types';
import { CryoBay } from './CryoBay';
import { Engineering } from './Engineering';
import { Bridge } from './Bridge';
import { Medbay } from './Medbay';
import { CrewQuarters } from './CrewQuarters';
import { Hydroponics } from './Hydroponics';
import { CargoBay } from './CargoBay';
import { ReactorRoom } from './ReactorRoom';
import { CoreVault } from './CoreVault';
import { CommsArray } from './CommsArray';

export const SCENES: Record<RoomId, () => JSX.Element> = {
  cryo_bay: CryoBay,
  engineering: Engineering,
  bridge: Bridge,
  medbay: Medbay,
  crew_quarters: CrewQuarters,
  hydroponics: Hydroponics,
  cargo_bay: CargoBay,
  reactor_room: ReactorRoom,
  core_vault: CoreVault,
  comms_array: CommsArray,
};
