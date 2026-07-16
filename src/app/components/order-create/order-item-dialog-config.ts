import {
  CAPITAL_COVERING_OPTIONS,
  EXTENSION_COVERING_OPTIONS,
  MOLDING_COVERING_OPTIONS,
  PANELING_COVERING_OPTIONS,
} from '../../common/constants/molding-catalog';
import { INTERIOR_DOOR_COVERING_OPTIONS } from '../../common/constants/interior-door-covering';
import {
  CapitalDialogComponent,
  CapitalDialogData,
} from '../../common/dialogs/capital-dialog/capital-dialog.component';
import {
  EntranceDoorDialogComponent,
  EntranceDoorDialogData,
} from '../../common/dialogs/entrance-door-dialog/entrance-door-dialog.component';
import {
  ExtensionDialogComponent,
  ExtensionDialogData,
} from '../../common/dialogs/extension-dialog/extension-dialog.component';
import {
  HardwareDialogComponent,
  HardwareDialogData,
} from '../../common/dialogs/hardware-dialog/hardware-dialog.component';
import {
  InteriorDoorDialogComponent,
  InteriorDoorDialogData,
} from '../../common/dialogs/interior-door-dialog/interior-door-dialog.component';
import {
  MoldingDialogComponent,
  MoldingDialogData,
} from '../../common/dialogs/molding-dialog/molding-dialog.component';
import {
  PanelingDialogComponent,
  PanelingDialogData,
} from '../../common/dialogs/paneling-dialog/paneling-dialog.component';
import { PlatbandDialogComponent } from '../../common/dialogs/platband-dialog/platband-dialog.component';
import {
  SkirtingDialogComponent,
  SkirtingDialogData,
} from '../../common/dialogs/skirting-dialog/skirting-dialog.component';
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
import { OrderEntityItem, OrderItemEntity } from './order-item-types';

export interface ItemCollection<T> {
  (): readonly T[];
  set(value: readonly T[]): void;
}

export interface OrderItemCollections {
  interiorDoors: ItemCollection<OrderEntityItem>;
  entranceDoors: ItemCollection<OrderEntityItem>;
  moldings: ItemCollection<OrderEntityItem>;
  extensions: ItemCollection<OrderEntityItem>;
  capitals: ItemCollection<OrderEntityItem>;
  hardwares: ItemCollection<OrderEntityItem>;
  panelings: ItemCollection<OrderEntityItem>;
  skirtings: ItemCollection<OrderEntityItem>;
}

export interface OrderItemDialogDefaults {
  color: string;
  covering: string | null;
  frameSetCount: number;
}

export interface OrderItemEntityConfig {
  collection: ItemCollection<OrderEntityItem>;
  dialogComponent: object;
  createData: object;
  getEditData: (item: OrderEntityItem) => object;
}

export function createOrderItemEntityConfig(
  entity: OrderItemEntity,
  collections: OrderItemCollections,
  defaults: OrderItemDialogDefaults,
): OrderItemEntityConfig {
  switch (entity) {
    case OrderItemEntity.InteriorDoor:
      return {
        collection: collections.interiorDoors,
        dialogComponent: InteriorDoorDialogComponent,
        createData: {
          mode: 'create',
          ...getDefaultDialogData(defaults, INTERIOR_DOOR_COVERING_OPTIONS),
        } as InteriorDoorDialogData,
        getEditData: (item) => ({ mode: 'edit', door: item as InteriorDoorItem }) as InteriorDoorDialogData,
      };
    case OrderItemEntity.EntranceDoor:
      return {
        collection: collections.entranceDoors,
        dialogComponent: EntranceDoorDialogComponent,
        createData: { mode: 'create' } as EntranceDoorDialogData,
        getEditData: (item) => ({ mode: 'edit', door: item as EntranceDoorItem }) as EntranceDoorDialogData,
      };
    case OrderItemEntity.Molding:
    case OrderItemEntity.Frame:
      return {
        collection: collections.moldings,
        dialogComponent: MoldingDialogComponent,
        createData: {
          mode: 'create',
          ...getDefaultDialogData(defaults, MOLDING_COVERING_OPTIONS),
          defaultFrameSetCount: defaults.frameSetCount,
        } as MoldingDialogData,
        getEditData: (item) => ({ mode: 'edit', molding: item as MoldingItem }) as MoldingDialogData,
      };
    case OrderItemEntity.Platband:
      return {
        collection: collections.moldings,
        dialogComponent: PlatbandDialogComponent,
        createData: {},
        getEditData: () => ({}),
      };
    case OrderItemEntity.Extension:
      return {
        collection: collections.extensions,
        dialogComponent: ExtensionDialogComponent,
        createData: {
          mode: 'create',
          ...getDefaultDialogData(defaults, EXTENSION_COVERING_OPTIONS),
        } as ExtensionDialogData,
        getEditData: (item) => ({ mode: 'edit', extension: item as ExtensionItem }) as ExtensionDialogData,
      };
    case OrderItemEntity.Capital:
      return {
        collection: collections.capitals,
        dialogComponent: CapitalDialogComponent,
        createData: {
          mode: 'create',
          ...getDefaultDialogData(defaults, CAPITAL_COVERING_OPTIONS),
        } as CapitalDialogData,
        getEditData: (item) => ({ mode: 'edit', capital: item as CapitalItem }) as CapitalDialogData,
      };
    case OrderItemEntity.Hardware:
      return {
        collection: collections.hardwares,
        dialogComponent: HardwareDialogComponent,
        createData: { mode: 'create' } as HardwareDialogData,
        getEditData: (item) => ({ mode: 'edit', hardware: item as HardwareItem }) as HardwareDialogData,
      };
    case OrderItemEntity.Paneling:
      return {
        collection: collections.panelings,
        dialogComponent: PanelingDialogComponent,
        createData: {
          mode: 'create',
          ...getDefaultDialogData(defaults, PANELING_COVERING_OPTIONS),
        } as PanelingDialogData,
        getEditData: (item) => ({ mode: 'edit', paneling: item as PanelingItem }) as PanelingDialogData,
      };
    case OrderItemEntity.Skirting:
      return {
        collection: collections.skirtings,
        dialogComponent: SkirtingDialogComponent,
        createData: { mode: 'create', ...getDefaultDialogData(defaults) } as SkirtingDialogData,
        getEditData: (item) => ({ mode: 'edit', skirting: item as SkirtingItem }) as SkirtingDialogData,
      };
  }
}

function getDefaultDialogData<TCovering extends string>(
  defaults: OrderItemDialogDefaults,
  coveringOptions?: readonly TCovering[],
): { defaultColor?: string; defaultCovering?: TCovering } {
  return {
    ...(defaults.color ? { defaultColor: defaults.color } : {}),
    ...(defaults.covering && coveringOptions?.includes(defaults.covering as TCovering)
      ? { defaultCovering: defaults.covering as TCovering }
      : {}),
  };
}
