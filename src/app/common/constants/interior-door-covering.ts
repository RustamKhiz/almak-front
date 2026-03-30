import { InteriorDoorCovering } from '../../types/order.types';

export const INTERIOR_DOOR_COVERING_OPTIONS: readonly InteriorDoorCovering[] = [
  InteriorDoorCovering.Enamel,
  InteriorDoorCovering.Veneer,
  InteriorDoorCovering.Embossing,
  InteriorDoorCovering.PVC,
];

export const DEFAULT_INTERIOR_DOOR_COVERING = InteriorDoorCovering.Enamel;

export const INTERIOR_DOOR_COVERING_LABELS: Readonly<Record<InteriorDoorCovering, string>> = {
  [InteriorDoorCovering.Enamel]: 'Эмаль',
  [InteriorDoorCovering.Veneer]: 'Шпон',
  [InteriorDoorCovering.Embossing]: 'Тиснение',
  [InteriorDoorCovering.PVC]: 'ПВХ',
};
