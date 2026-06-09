// No catalog key — this is a structural enum (single/double leaf), not a user-managed list.
import { DoorLeafType } from '../../types/order.types';

export const DOOR_LEAF_TYPE_OPTIONS: readonly DoorLeafType[] = [DoorLeafType.Single, DoorLeafType.Double];

export const DOOR_LEAF_TYPE_LABELS: Readonly<Record<DoorLeafType, string>> = {
  [DoorLeafType.Single]: 'Одна створка',
  [DoorLeafType.Double]: 'Две створки',
};
