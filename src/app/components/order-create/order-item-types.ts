import {
  CapitalItem,
  EntranceDoorItem,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  PanelingItem,
  SkirtingItem,
} from '../../types/order.types';

export enum OrderItemEntity {
  InteriorDoor = 'interiorDoor',
  EntranceDoor = 'entranceDoor',
  Molding = 'molding',
  Frame = 'frame',
  Platband = 'platband',
  Extension = 'extension',
  Capital = 'capital',
  Hardware = 'hardware',
  Paneling = 'paneling',
  Skirting = 'skirting',
}

export type OrderEntityItem =
  | InteriorDoorItem
  | EntranceDoorItem
  | MoldingItem
  | ExtensionItem
  | CapitalItem
  | HardwareItem
  | PanelingItem
  | SkirtingItem;

export interface OrderItemActionEvent {
  entity: OrderItemEntity;
  id: number;
}
