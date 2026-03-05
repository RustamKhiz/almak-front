import { DoorLeafType, DoorType } from '../../types/order.types';

export const DOOR_TYPE_OPTIONS: readonly DoorType[] = ['Entrance', 'Interior'];

export const DOOR_TYPE_LABELS: Readonly<Record<DoorType, string>> = {
  Entrance: 'Входная дверь',
  Interior: 'Межкомнатная дверь',
};

export const DOOR_LEAF_TYPE_OPTIONS: readonly DoorLeafType[] = ['Single', 'Double'];

export const DOOR_LEAF_TYPE_LABELS: Readonly<Record<DoorLeafType, string>> = {
  Single: 'Одна створка',
  Double: 'Две створки',
};
