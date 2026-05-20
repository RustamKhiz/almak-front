import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import {
  getCapitalTotal,
  getExtensionTotal,
  getHardwareTotal,
  getInteriorDoorTotal,
  getMoldingTotal,
  getPanelingTotal,
} from '../../utils/order-calculations';
import {
  PrintConstructorDialogData,
  PrintConstructorDialogResult,
  PrintableOrderItem,
  PrintPreset,
} from './print-constructor.types';
import { ENTRANCE_DOOR_OPENING_LABELS } from '../../constants/entrance-door-catalog';

@Component({
  selector: 'app-print-constructor-dialog',
  imports: [DecimalPipe, MatButtonModule, MatCheckboxModule, MatDialogModule],
  templateUrl: './print-constructor-dialog.component.html',
  styleUrl: './print-constructor-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintConstructorDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PrintConstructorDialogComponent, PrintConstructorDialogResult>);
  protected readonly data = inject<PrintConstructorDialogData>(MAT_DIALOG_DATA);

  protected readonly items = this.buildItems();
  protected readonly selectedKeys = signal<ReadonlySet<string>>(new Set(this.items.map((item) => item.key)));
  protected readonly showPrices = signal(true);
  protected readonly showTotals = signal(true);
  protected readonly showDiscount = signal(true);
  protected readonly showPayments = signal(true);
  protected readonly showCustomerInfo = signal(true);
  protected readonly showDeliveryInfo = signal(true);
  protected readonly showComments = signal(true);
  protected readonly showSignatures = signal(true);

  protected readonly presets: readonly PrintPreset[] = [
    {
      id: 'full',
      label: 'Полный документ',
      description: 'Все товары, цены, итоги, клиент, доставка, комментарии и подписи.',
      options: this.getFullOptions(),
    },
    {
      id: 'production',
      label: 'Для производства',
      description: 'Товары, размеры, цвет/покрытие и комментарии без клиента и цен.',
      options: {
        ...this.getFullOptions(),
        showPrices: false,
        showTotals: false,
        showDiscount: false,
        showPayments: false,
        showCustomerInfo: false,
        showDeliveryInfo: false,
        showSignatures: false,
      },
    },
    {
      id: 'delivery',
      label: 'Для доставки',
      description: 'Клиент, телефон, адрес и товары без цен.',
      options: {
        ...this.getFullOptions(),
        showPrices: false,
        showTotals: false,
        showDiscount: false,
        showPayments: false,
        showComments: false,
        showSignatures: false,
      },
    },
  ];

  protected readonly selectedCount = computed(() => this.selectedKeys().size);
  protected readonly selectedTotal = computed(() =>
    this.items.reduce((sum, item) => (this.selectedKeys().has(item.key) ? sum + item.total : sum), 0),
  );
  protected readonly allSelected = computed(
    () => this.items.length > 0 && this.selectedKeys().size === this.items.length,
  );
  protected readonly someSelected = computed(() => this.selectedKeys().size > 0 && !this.allSelected());

  protected applyPreset(preset: PrintPreset): void {
    this.showPrices.set(preset.options.showPrices);
    this.showTotals.set(preset.options.showTotals);
    this.showDiscount.set(preset.options.showDiscount);
    this.showPayments.set(preset.options.showPayments);
    this.showCustomerInfo.set(preset.options.showCustomerInfo);
    this.showDeliveryInfo.set(preset.options.showDeliveryInfo);
    this.showComments.set(preset.options.showComments);
    this.showSignatures.set(preset.options.showSignatures);
    this.selectAll();
  }

  protected togglePrices(checked: boolean): void {
    this.showPrices.set(checked);
    if (!checked) {
      this.showTotals.set(false);
      this.showDiscount.set(false);
      this.showPayments.set(false);
    }
  }

  protected toggleTotals(checked: boolean): void {
    this.showTotals.set(checked);
    if (!checked) {
      this.showDiscount.set(false);
      this.showPayments.set(false);
    }
  }

  protected toggleItem(key: string, checked: boolean): void {
    const next = new Set(this.selectedKeys());
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.selectedKeys.set(next);
  }

  protected toggleAll(checked: boolean): void {
    if (checked) {
      this.selectAll();
      return;
    }
    this.selectedKeys.set(new Set());
  }

  protected isSelected(key: string): boolean {
    return this.selectedKeys().has(key);
  }

  protected close(action: 'print' | 'download'): void {
    this.dialogRef.close({
      action,
      options: {
        selectedItemKeys: [...this.selectedKeys()],
        showPrices: this.showPrices(),
        showTotals: this.showPrices() && this.showTotals(),
        showDiscount: this.showPrices() && this.showTotals() && this.showDiscount(),
        showPayments: this.showPrices() && this.showTotals() && this.showPayments(),
        showCustomerInfo: this.showCustomerInfo(),
        showDeliveryInfo: this.showDeliveryInfo(),
        showComments: this.showComments(),
        showSignatures: this.showSignatures(),
      },
    });
  }

  private selectAll(): void {
    this.selectedKeys.set(new Set(this.items.map((item) => item.key)));
  }

  private getFullOptions(): Omit<PrintConstructorDialogResult['options'], 'selectedItemKeys'> {
    return {
      showPrices: true,
      showTotals: true,
      showDiscount: true,
      showPayments: true,
      showCustomerInfo: true,
      showDeliveryInfo: true,
      showComments: true,
      showSignatures: true,
    };
  }

  private buildItems(): readonly PrintableOrderItem[] {
    const order = this.data.order;
    return [
      ...order.interiorDoors.map((item) => ({
        key: `interiorDoor:${item.id}`,
        type: 'interiorDoor' as const,
        typeLabel: 'Межкомнатная дверь',
        title: item.model,
        summary: `${item.width}x${item.height}, цвет ${item.color}`,
        total: getInteriorDoorTotal(item),
      })),
      ...order.entranceDoors.map((item) => ({
        key: `entranceDoor:${item.id}`,
        type: 'entranceDoor' as const,
        typeLabel: 'Входная дверь',
        title: item.model,
        summary: `${item.width}x${item.height}, цвет ${item.color}, открывание ${(ENTRANCE_DOOR_OPENING_LABELS[item.opening] ?? 'Левое').toLowerCase()}`,
        total: item.price * item.count,
      })),
      ...order.moldings.map((item) => ({
        key: `molding:${item.id}`,
        type: 'molding' as const,
        typeLabel: 'Погонаж',
        title: item.color,
        summary: `Коробка ${item.frameCount} (${item.frameSetCount} комп., порогов ${item.frameThresholdCount ?? 0}), наличник ${item.platbandCount}, притвор ${item.rebateBarCount}`,
        total: getMoldingTotal(item),
      })),
      ...order.extensions.map((item) => ({
        key: `extension:${item.id}`,
        type: 'extension' as const,
        typeLabel: 'Доборы',
        title: item.color,
        summary: `${item.width}x${item.height}, ${item.totalArea} м2`,
        total: getExtensionTotal(item),
      })),
      ...order.capitals.map((item) => ({
        key: `capital:${item.id}`,
        type: 'capital' as const,
        typeLabel: 'Капитель',
        title: item.name,
        summary: `${item.width}x${item.height}, цвет ${item.color}`,
        total: getCapitalTotal(item),
      })),
      ...order.hardwares.map((item) => ({
        key: `hardware:${item.id}`,
        type: 'hardware' as const,
        typeLabel: 'Фурнитура',
        title: item.handleModel ? `Ручка ${item.handleModel}` : 'Фурнитура',
        summary: item.handleColor ? `Цвет ручки ${item.handleColor}` : 'Комплект фурнитуры',
        total: getHardwareTotal(item),
      })),
      ...order.panelings.map((item) => ({
        key: `paneling:${item.id}`,
        type: 'paneling' as const,
        typeLabel: 'Обшивка',
        title: item.color,
        summary: `${item.totalArea} м2`,
        total: getPanelingTotal(item),
      })),
    ];
  }
}
