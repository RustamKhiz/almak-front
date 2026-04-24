import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DOOR_LEAF_TYPE_LABELS } from '../../../common/constants/door-catalog';
import { INTERIOR_DOOR_COVERING_LABELS } from '../../../common/constants/interior-door-covering';
import {
  CAPITAL_COVERING_LABELS,
  EXTENSION_COVERING_LABELS,
  MOLDING_COVERING_LABELS,
  MOLDING_PLATBAND_TYPE_LABELS,
  PANELING_COVERING_LABELS,
} from '../../../common/constants/molding-catalog';
import {
  getCapitalTotal,
  getExtensionTotal,
  getHardwareTotal,
  getInteriorDoorTotal,
  getMoldingTotal,
  getPanelingTotal,
} from '../../../common/utils/order-calculations';
import {
  CapitalItem,
  EntranceDoorItem,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  PanelingItem,
} from '../../../types/order.types';
import { OrderItemActionEvent, OrderItemEntity } from '../order-item-types';

@Component({
  selector: 'app-order-items-list',
  imports: [DecimalPipe, MatButtonModule, MatIconModule],
  templateUrl: './order-items-list.component.html',
  styleUrl: './order-items-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderItemsListComponent {
  readonly interiorDoors = input<readonly InteriorDoorItem[]>([]);
  readonly entranceDoors = input<readonly EntranceDoorItem[]>([]);
  readonly moldings = input<readonly MoldingItem[]>([]);
  readonly extensions = input<readonly ExtensionItem[]>([]);
  readonly capitals = input<readonly CapitalItem[]>([]);
  readonly hardwares = input<readonly HardwareItem[]>([]);
  readonly panelings = input<readonly PanelingItem[]>([]);
  readonly showOrdersError = input(false);

  readonly editClick = output<OrderItemActionEvent>();
  readonly duplicateClick = output<OrderItemActionEvent>();
  readonly removeClick = output<OrderItemActionEvent>();

  protected readonly orderItemEntity = OrderItemEntity;
  protected readonly doorLeafTypeLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly doorCoveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  protected readonly moldingPlatbandTypeLabels = MOLDING_PLATBAND_TYPE_LABELS;
  protected readonly moldingCoveringLabels = MOLDING_COVERING_LABELS;
  protected readonly extensionCoveringLabels = EXTENSION_COVERING_LABELS;
  protected readonly capitalCoveringLabels = CAPITAL_COVERING_LABELS;
  protected readonly panelingCoveringLabels = PANELING_COVERING_LABELS;
  protected readonly hasItems = computed(
    () =>
      this.interiorDoors().length > 0 ||
      this.entranceDoors().length > 0 ||
      this.moldings().length > 0 ||
      this.extensions().length > 0 ||
      this.capitals().length > 0 ||
      this.hardwares().length > 0 ||
      this.panelings().length > 0,
  );

  protected getMoldingTotal(item: MoldingItem): number {
    return getMoldingTotal(item);
  }

  protected getInteriorDoorTotal(item: InteriorDoorItem): number {
    return getInteriorDoorTotal(item);
  }

  protected getExtensionTotal(item: ExtensionItem): number {
    return getExtensionTotal(item);
  }

  protected getPanelingTotal(item: PanelingItem): number {
    return getPanelingTotal(item);
  }

  protected getCapitalTotal(item: CapitalItem): number {
    return getCapitalTotal(item);
  }

  protected getHardwareTotal(item: HardwareItem): number {
    return getHardwareTotal(item);
  }

  protected onEditClick(entity: OrderItemEntity, id: number): void {
    this.editClick.emit({ entity, id });
  }

  protected onDuplicateClick(entity: OrderItemEntity, id: number): void {
    this.duplicateClick.emit({ entity, id });
  }

  protected onRemoveClick(entity: OrderItemEntity, id: number): void {
    this.removeClick.emit({ entity, id });
  }
}
