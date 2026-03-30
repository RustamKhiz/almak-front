import { DoorLeafType } from '../../types/order.types';

export const DOOR_LEAF_TYPE_OPTIONS: readonly DoorLeafType[] = ['Single', 'Double'];

export const DOOR_LEAF_TYPE_LABELS: Readonly<Record<DoorLeafType, string>> = {
  Single: 'Одна створка',
  Double: 'Две створки',
};
