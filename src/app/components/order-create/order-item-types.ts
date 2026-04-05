import {
  CapitalItem,
  EntranceDoorItem,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  PanelingItem,
} from '../../types/order.types';

export enum OrderItemEntity {
  InteriorDoor = 'interiorDoor',
  EntranceDoor = 'entranceDoor',
  Molding = 'molding',
  Extension = 'extension',
  Capital = 'capital',
  Hardware = 'hardware',
  Paneling = 'paneling',
}

export type OrderEntityItem =
  | InteriorDoorItem
  | EntranceDoorItem
  | MoldingItem
  | ExtensionItem
  | CapitalItem
  | HardwareItem
  | PanelingItem;

export interface OrderItemActionEvent {
  entity: OrderItemEntity;
  id: number;
}
