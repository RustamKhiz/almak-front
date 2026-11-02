import { Injectable } from '@angular/core';
import { DOOR_LEAF_TYPE_LABELS } from '../../common/constants/door-catalog';
import { ENTRANCE_DOOR_OPENING_LABELS } from '../../common/constants/entrance-door-catalog';
import { INTERIOR_DOOR_COVERING_LABELS } from '../../common/constants/interior-door-covering';
import {
  CAPITAL_COVERING_LABELS,
  EXTENSION_COVERING_LABELS,
  MOLDING_COVERING_LABELS,
  MOLDING_PLATBAND_TYPE_LABELS,
  PANELING_COVERING_LABELS,
  PANELING_KIND_LABELS,
} from '../../common/constants/molding-catalog';
import {
  OrderItemDetailsDialogData,
  OrderItemDetailsSection,
} from '../../common/dialogs/order-item-details-dialog/order-item-details-dialog.component';
import {
  getCapitalTotal,
  getExtensionTotal,
  getFrameTotal,
  getHardwareTotal,
  getInteriorDoorTotal,
  getPanelingTotal,
  getPlatbandTotal,
  getSkirtingTotal,
} from '../../common/utils/order-calculations';
import {
  CapitalItem,
  EntranceDoorItem,
  EntranceDoorKind,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  OrderCreatePayload,
  PanelingItem,
  SkirtingItem,
} from '../../types/order.types';

export type SupplierItemEntity =
  | 'interiorDoors'
  | 'entranceDoors'
  | 'moldings'
  | 'extensions'
  | 'capitals'
  | 'hardwares'
  | 'panelings'
  | 'skirtings';

export interface OrderViewProductCard {
  key: string;
  typeLabel: string;
  title: string;
  summary: string;
  supplier: string;
  costPrice: number;
  entity: SupplierItemEntity;
  itemId: number;
  countLabel: string;
  total: number;
  details: OrderItemDetailsDialogData;
}

@Injectable({ providedIn: 'root' })
export class OrderViewProductCardsService {
  private readonly leafTypesLabels = DOOR_LEAF_TYPE_LABELS;
  private readonly entranceDoorOpeningLabels = ENTRANCE_DOOR_OPENING_LABELS;
  private readonly doorCoveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  private readonly moldingPlatbandTypeLabels = MOLDING_PLATBAND_TYPE_LABELS;
  private readonly moldingCoveringLabels = MOLDING_COVERING_LABELS;
  private readonly extensionCoveringLabels = EXTENSION_COVERING_LABELS;
  private readonly capitalCoveringLabels = CAPITAL_COVERING_LABELS;
  private readonly panelingCoveringLabels = PANELING_COVERING_LABELS;
  private readonly panelingKindLabels = PANELING_KIND_LABELS;

  build(order: OrderCreatePayload): OrderViewProductCard[] {
    return [
      ...order.entranceDoors.map((item) => this.buildEntranceDoorCard(item)),
      ...order.interiorDoors.map((item) => this.buildInteriorDoorCard(item)),
      ...order.moldings.map((item) =>
        item.platbandCount > 0 && item.frameCount === 0 && item.frameBoxCount === 0 && item.frameSetCount === 0
          ? this.buildPlatbandCard(item)
          : this.buildFrameCard(item),
      ),
      ...order.extensions.map((item) => this.buildExtensionCard(item)),
      ...order.capitals.map((item) => this.buildCapitalCard(item)),
      ...order.hardwares.map((item) => this.buildHardwareCard(item)),
      ...order.panelings.map((item) => this.buildPanelingCard(item)),
      ...order.skirtings.map((item) => this.buildSkirtingCard(item)),
    ];
  }

  private buildInteriorDoorCard(item: InteriorDoorItem): OrderViewProductCard {
    return {
      key: `interior-${item.id}`,
      entity: 'interiorDoors',
      itemId: item.id,
      typeLabel: 'Межкомнатная дверь',
      title: item.model,
      summary: `${this.formatInteriorDoorSize(item)} · ${this.leafTypesLabels[item.leafType]} · цвет ${item.color} · ${this.getInteriorDoorGlassLabel(item)}`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.count + (item.leafType === 'Double' ? Number(item.count2 ?? 0) : 0)} шт.`,
      total: getInteriorDoorTotal(item),
      details: {
        title: `Межкомнатная дверь · ${item.model}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [this.leafTypesLabels[item.leafType], this.doorCoveringLabels[item.covering] ?? item.covering],
        total: getInteriorDoorTotal(item),
        sections: [
          this.section('Основное', [
            ['Модель', item.model],
            ['Цвет', item.color],
            ['Тип створки', this.leafTypesLabels[item.leafType]],
          ]),
          this.section('Створка 1', [
            ['Ширина', `${item.width} см`],
            ['Высота', `${item.height} см`],
            ['Цена', this.formatMoney(item.price)],
            ['Количество', `${item.count} шт.`],
          ]),
          ...(item.leafType === 'Double'
            ? [
                this.section('Створка 2', [
                  ['Ширина', `${item.width2 ?? 0} см`],
                  ['Высота', `${item.height2 ?? item.height} см`],
                  ['Цена', this.formatMoney(item.price2 ?? 0)],
                  ['Количество', `${item.count2 ?? 0} шт.`],
                ]),
              ]
            : []),
          ...(item.leafType === 'Double' && item.rebateBarCount > 0
            ? [
                this.section('Притворная планка', [
                  ['Количество', `${item.rebateBarCount} шт.`],
                  ['Цена', item.rebateBarPrice != null ? this.formatMoney(item.rebateBarPrice) : 'Не указана'],
                ]),
              ]
            : []),
          this.section('Дополнительно', [
            ['Покрытие', this.doorCoveringLabels[item.covering] ?? item.covering],
            ['Тип полотна', this.getInteriorDoorGlassLabel(item)],
            ['Стекло', item.hasGlass ? item.glassComment || 'Без уточнения' : 'Не используется'],
            ['Стоимость', this.formatMoney(getInteriorDoorTotal(item))],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildEntranceDoorCard(item: EntranceDoorItem): OrderViewProductCard {
    const kindLabel = item.kind === EntranceDoorKind.Welded ? 'Сварочная' : 'Фабричная';
    return {
      key: `entrance-${item.id}`,
      entity: 'entranceDoors',
      itemId: item.id,
      typeLabel: 'Входная дверь',
      title: item.model,
      summary: `${kindLabel} · ${this.leafTypesLabels[item.leafType]} · открывание ${this.getEntranceDoorOpeningLabel(item).toLowerCase()} · ${item.width} × ${item.height} см`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.count} шт.`,
      total: item.price * item.count,
      details: {
        title: `Входная дверь · ${item.model}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [kindLabel, this.leafTypesLabels[item.leafType]],
        total: item.price * item.count,
        sections: [
          this.section('Основное', [
            ['Исполнение', kindLabel],
            ['Тип створки', this.leafTypesLabels[item.leafType]],
            ['Открывание', this.getEntranceDoorOpeningLabel(item)],
            ['Модель', item.model],
            ['Размер', `${item.width} × ${item.height} см`],
            ['Цвет двери', item.color],
            ['Цвет обшивки', item.panelColor || 'Не указан'],
            ['Покрытие', item.painting || 'Не указано'],
            ['Глазок', item.hasPeephole === null ? 'Не указан' : item.hasPeephole ? 'Есть' : 'Нет'],
            ['Количество', `${item.count} шт.`],
            ['Цена за штуку', this.formatMoney(item.price)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildFrameCard(item: MoldingItem): OrderViewProductCard {
    const total = getFrameTotal(item);
    return {
      key: `molding-${item.id}`,
      entity: 'moldings',
      itemId: item.id,
      typeLabel: 'Коробки',
      title: `${item.color} · ${this.moldingCoveringLabels[item.covering] ?? item.covering}`,
      summary: `Коробок в комплекте ${item.frameSetCount} · Доп. коробок ${item.frameBoxCount} шт.`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.frameCount} шт.`,
      total,
      details: {
        title: 'Коробки',
        subtitle: 'Полная информация по позиции заказа.',
        badges: [item.color, this.moldingCoveringLabels[item.covering] ?? item.covering],
        total,
        sections: [
          this.section('Коробка', [
            ['Длина', item.frameLength !== null ? `${item.frameLength} см` : 'Не указана'],
            ['В комплекте', `${item.frameSetCount} шт.`],
            ['Дополнительные', `${item.frameBoxCount} шт.`],
            ['Всего', `${item.frameCount} шт.`],
            ['Цена дополнительной коробки', this.formatMoney(item.framePrice)],
            ['Общая стоимость', this.formatMoney(total)],
          ]),
          this.section('Дополнительно', [
            ['Цвет', item.color],
            ['Покрытие', this.moldingCoveringLabels[item.covering] ?? item.covering],
            ['Поставщик', item.supplier || 'Не указан'],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildPlatbandCard(item: MoldingItem): OrderViewProductCard {
    const extraCount = Math.max(0, item.platbandCount - item.platbandSetCount);
    const total = getPlatbandTotal(item);
    return {
      key: `molding-${item.id}`,
      entity: 'moldings',
      itemId: item.id,
      typeLabel: 'Наличники',
      title: `${this.moldingPlatbandTypeLabels[item.platbandType]} · ${item.color} · ${this.moldingCoveringLabels[item.covering] ?? item.covering}`,
      summary: `В комплекте ${item.platbandSetCount} · Доп. ${extraCount} шт. · Всего ${item.platbandCount} шт.`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.platbandCount} шт.`,
      total,
      details: {
        title: 'Наличники',
        subtitle: 'Цена умножается только на дополнительные наличники.',
        badges: [
          this.moldingPlatbandTypeLabels[item.platbandType],
          item.color,
          this.moldingCoveringLabels[item.covering] ?? item.covering,
        ],
        total,
        sections: [
          this.section('Наличник', [
            ['Тип', this.moldingPlatbandTypeLabels[item.platbandType]],
            ...(item.platbandFigure ? [['Модель', item.platbandFigure] as [string, string]] : []),
            ['Длина', item.platbandLength !== null ? `${item.platbandLength} см` : 'Не указана'],
            ['В комплекте', `${item.platbandSetCount} шт.`],
            ['Дополнительные', `${extraCount} шт.`],
            ['Всего', `${item.platbandCount} шт.`],
            ['Цена за штуку', this.formatMoney(item.platbandPrice)],
            ['Стоимость (доп.)', this.formatMoney(total)],
          ]),
          this.section('Дополнительно', [
            ['Цвет', item.color],
            ['Покрытие', this.moldingCoveringLabels[item.covering] ?? item.covering],
            ['Поставщик', item.supplier || 'Не указан'],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildExtensionCard(item: ExtensionItem): OrderViewProductCard {
    return {
      key: `extension-${item.id}`,
      entity: 'extensions',
      itemId: item.id,
      typeLabel: 'Доборы',
      title: `${item.color} · ${this.extensionCoveringLabels[item.covering] ?? item.covering}`,
      summary: `${this.formatExtensionSizes(item)} · всего ${item.quantityPerSet} шт. · ${item.totalArea} м²`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.quantityPerSet} шт.`,
      total: getExtensionTotal(item),
      details: {
        title: 'Доборы',
        subtitle: 'Расчет общей стоимости учитывает общую квадратуру и цену за м².',
        badges: [item.color, this.extensionCoveringLabels[item.covering] ?? item.covering],
        total: getExtensionTotal(item),
        sections: [
          this.section('Размеры и комплектация', [
            ...item.sizes.map((size, index): [string, string] => [
              `Размер ${index + 1}`,
              `${size.width} × ${size.height} см · ${size.quantity} шт. · ${this.formatArea(this.getExtensionSizeArea(size.width, size.height, size.quantity))}`,
            ]),
            ['Общее количество', `${item.quantityPerSet} шт.`],
            ['Общая квадратура', `${item.totalArea} м²`],
          ]),
          this.section('Стоимость', [
            ['Цена за квадратный метр', this.formatMoney(item.price)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildCapitalCard(item: CapitalItem): OrderViewProductCard {
    return {
      key: `capital-${item.id}`,
      entity: 'capitals',
      itemId: item.id,
      typeLabel: 'Капитель',
      title: item.name,
      summary: `${item.width} × ${item.height} см · цвет ${item.color} · ${this.capitalCoveringLabels[item.covering] ?? item.covering}`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.count} шт.`,
      total: getCapitalTotal(item),
      details: {
        title: `Капитель · ${item.name}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [item.color, this.capitalCoveringLabels[item.covering] ?? item.covering],
        total: getCapitalTotal(item),
        sections: [
          this.section('Основное', [
            ['Название', item.name],
            ['Цвет', item.color],
            ['Покрытие', this.capitalCoveringLabels[item.covering] ?? item.covering],
            ['Ширина', `${item.width} см`],
            ['Высота', `${item.height} см`],
            ['Количество', `${item.count} шт.`],
            ['Цена за штуку', this.formatMoney(item.price)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildHardwareCard(item: HardwareItem): OrderViewProductCard {
    return {
      key: `hardware-${item.id}`,
      entity: 'hardwares',
      itemId: item.id,
      typeLabel: 'Фурнитура',
      title: item.handleModel ? `Ручка ${item.handleModel}` : 'Комплект фурнитуры',
      summary: this.getHardwareSummary(item),
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${this.getHardwarePositionsCount(item)} поз.`,
      total: getHardwareTotal(item),
      details: {
        title: 'Фурнитура',
        subtitle: 'Полная раскладка по механизмам и комплектующим.',
        badges: item.handleColor ? [item.handleColor] : [],
        total: getHardwareTotal(item),
        sections: [
          this.section('Ручка', [
            ['Модель', item.handleModel || 'Не указана'],
            ['Цвет', item.handleColor || 'Не указан'],
            ['Количество', item.handleCount !== null ? `${item.handleCount}` : 'Не указано'],
            ['Цена', item.handlePrice !== null ? this.formatMoney(item.handlePrice) : 'Не указана'],
          ]),
          this.section('Механизмы', [
            ['Фиксатор', this.formatCountPrice(item.fixatorCount, item.fixatorPrice)],
            ['Крутилка', this.formatCountPrice(item.thumbturnCount, item.thumbturnPrice)],
            ['Замок', this.formatCountPrice(item.lockCount, item.lockPrice)],
            ['Барабан', this.formatCountPrice(item.cylinderCount, item.cylinderPrice)],
            ['Накладка', this.formatCountPrice(item.escutcheonCount, item.escutcheonPrice)],
            ['Щелчок', this.formatCountPrice(item.clickCount, item.clickPrice)],
            ['Шпингалет', this.formatCountPrice(item.boltCount, item.boltPrice)],
            ['Петли правые', this.formatCountPrice(item.hingeRightCount, item.hingePrice)],
            ['Петли левые', this.formatCountPrice(item.hingeLeftCount, item.hingePrice)],
            ['Ограничитель', this.formatCountPrice(item.doorStopCount, item.doorStopPrice)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildSkirtingCard(item: SkirtingItem): OrderViewProductCard {
    const totalLength = Number((item.length * item.count).toFixed(2));
    const total = getSkirtingTotal(item);
    return {
      key: `skirting-${item.id}`,
      entity: 'skirtings',
      itemId: item.id,
      typeLabel: 'Плинтус',
      title: `${item.model} · ${item.color}`,
      summary: `${item.height} мм · ${item.length} м × ${item.count} шт. = ${totalLength} м`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${totalLength} м`,
      total,
      details: {
        title: 'Плинтус',
        subtitle: 'Стоимость = цена за метр × всего метров.',
        badges: [item.model, item.color],
        total,
        sections: [
          this.section('Параметры', [
            ['Модель', item.model],
            ['Цвет', item.color],
            ['Высота', `${item.height} мм`],
            ['Длина', `${item.length} м`],
            ['Количество', `${item.count} шт.`],
            ['Всего метров', `${totalLength} м`],
          ]),
          this.section('Стоимость', [
            ['Цена за метр', this.formatMoney(item.price)],
            ['Итого', this.formatMoney(total)],
            ['Поставщик', item.supplier || 'Не указан'],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildPanelingCard(item: PanelingItem): OrderViewProductCard {
    return {
      key: `paneling-${item.id}`,
      entity: 'panelings',
      itemId: item.id,
      typeLabel: 'Обшивка',
      title: `${item.color} · ${this.panelingKindLabels[item.kind]}`,
      summary: `${this.formatPanelingSizes(item)} · ${this.panelingCoveringLabels[item.covering] ?? item.covering} · ${item.totalArea} м²`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.count} шт.`,
      total: getPanelingTotal(item),
      details: {
        title: 'Обшивка',
        subtitle: 'Расчет общей стоимости учитывает общую квадратуру и цену за м².',
        badges: [
          item.color,
          this.panelingKindLabels[item.kind],
          this.panelingCoveringLabels[item.covering] ?? item.covering,
        ],
        total: getPanelingTotal(item),
        sections: [
          this.section('Размеры и квадратура', [
            ...item.sizes.map((size, index): [string, string] => [
              `Размер ${index + 1}`,
              `${size.width} × ${size.height} см · ${this.formatArea(this.getPanelingSizeArea(size.width, size.height))}`,
            ]),
            ['Общая квадратура', this.formatArea(item.totalArea)],
          ]),
          this.section('Стоимость', [
            ['Цена за квадратный метр', this.formatMoney(item.price)],
            ['Тип обшивки', this.panelingKindLabels[item.kind]],
            ['Покрытие', this.panelingCoveringLabels[item.covering] ?? item.covering],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private section(title: string, rows: [string, string][]): OrderItemDetailsSection {
    return {
      title,
      rows: rows.map(([label, value]) => ({ label, value })),
    };
  }

  private formatDoorSize(width: number, height: number, width2: number | null): string {
    return `${width2 === null ? `${width}` : `${width} + ${width2}`} × ${height} см`;
  }

  private formatInteriorDoorSize(item: InteriorDoorItem): string {
    if (item.leafType !== 'Double') {
      return `${item.width} × ${item.height} см`;
    }

    return `${item.width} × ${item.height} см + ${item.width2 ?? 0} × ${item.height2 ?? item.height} см`;
  }

  private formatPanelingSizes(item: PanelingItem): string {
    return item.sizes.map((size) => `${size.width} × ${size.height} см`).join(' · ');
  }

  private formatExtensionSizes(item: ExtensionItem): string {
    return item.sizes.map((size) => `${size.width} × ${size.height} см × ${size.quantity} шт.`).join(' · ');
  }

  private getExtensionSizeArea(width: number, height: number, quantity: number): number {
    return Number(((width * height * quantity) / 10000).toFixed(2));
  }

  private getPanelingSizeArea(width: number, height: number): number {
    return Number(((width * height) / 10000).toFixed(2));
  }

  private formatArea(value: number): string {
    return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²`;
  }

  private getInteriorDoorGlassLabel(item: InteriorDoorItem): string {
    return item.hasGlass ? 'со стеклом' : 'глухая';
  }

  private getEntranceDoorOpeningLabel(item: EntranceDoorItem): string {
    return this.entranceDoorOpeningLabels[item.opening] ?? 'Левое';
  }

  private formatMoney(value: number): string {
    return `${value.toLocaleString('ru-RU')} ₽`;
  }

  private formatCountPrice(count: number | null, price: number | null): string {
    if (count === null && price === null) {
      return 'Не указано';
    }

    const countLabel = count !== null ? `${count} шт.` : 'кол-во не указано';
    const priceLabel = price !== null ? this.formatMoney(price) : 'цена не указана';
    return `${countLabel} · ${priceLabel}`;
  }

  private getHardwareSummary(item: HardwareItem): string {
    const parts: string[] = [];

    if (item.handleColor) {
      parts.push(`цвет ручки ${item.handleColor}`);
    }
    if (item.fixatorCount !== null) {
      parts.push(`фиксаторов ${item.fixatorCount}`);
    }
    if (item.thumbturnCount !== null) {
      parts.push(`крутилок ${item.thumbturnCount}`);
    }
    if (item.lockCount !== null) {
      parts.push(`замков ${item.lockCount}`);
    }
    if (item.cylinderCount !== null) {
      parts.push(`барабанов ${item.cylinderCount}`);
    }
    if (item.hingeRightCount !== null) {
      parts.push(`петель правых ${item.hingeRightCount}`);
    }
    if (item.hingeLeftCount !== null) {
      parts.push(`петель левых ${item.hingeLeftCount}`);
    }

    return parts.join(' · ') || 'Набор комплектующих без дополнительных уточнений';
  }

  private getHardwarePositionsCount(item: HardwareItem): number {
    return [
      item.handleCount,
      item.lockCount,
      item.fixatorCount,
      item.clickCount,
      item.thumbturnCount,
      item.escutcheonCount,
      item.cylinderCount,
      item.boltCount,
      item.hingeCount,
      item.doorStopCount,
    ].filter((value) => value !== null && value > 0).length;
  }
}
