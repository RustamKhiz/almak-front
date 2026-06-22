import {
  CapitalItem,
  DoorLeafType,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  OrderCreatePayload,
  PanelingItem,
  SkirtingItem,
} from '../../types/order.types';

export function getOptionalTotal(count: number | null, price: number | null): number {
  return Number(count ?? 0) * Number(price ?? 0);
}

export function getFrameTotal(item: MoldingItem): number {
  return item.framePrice * item.frameBoxCount;
}

export function getPlatbandTotal(item: MoldingItem): number {
  const extraCount = Math.max(0, item.platbandCount - item.platbandSetCount);
  return item.platbandPrice * extraCount;
}

export function getMoldingTotal(item: MoldingItem): number {
  return getFrameTotal(item) + getPlatbandTotal(item);
}

export function getExtensionTotal(item: ExtensionItem): number {
  return item.totalArea * item.price;
}

export function getPanelingTotal(item: PanelingItem): number {
  return item.totalArea * item.price;
}

export function getCapitalTotal(item: CapitalItem): number {
  return item.price * item.count;
}

export function getInteriorDoorTotal(item: InteriorDoorItem): number {
  const firstLeafTotal = item.price * item.count;
  const rebateBarTotal = (item.rebateBarPrice ?? 0) * item.rebateBarCount;

  if (item.leafType !== DoorLeafType.Double) {
    return firstLeafTotal;
  }

  return firstLeafTotal + Number(item.price2 ?? 0) * Number(item.count2 ?? 0) + rebateBarTotal;
}

export function getSkirtingTotal(item: SkirtingItem): number {
  return item.price * item.length * item.count;
}

export function getHardwareTotal(item: HardwareItem): number {
  return (
    getOptionalTotal(item.handleCount, item.handlePrice) +
    getOptionalTotal(item.lockCount, item.lockPrice) +
    getOptionalTotal(item.fixatorCount, item.fixatorPrice) +
    getOptionalTotal(item.clickCount, item.clickPrice) +
    getOptionalTotal(item.thumbturnCount, item.thumbturnPrice) +
    getOptionalTotal(item.escutcheonCount, item.escutcheonPrice) +
    getOptionalTotal(item.cylinderCount, item.cylinderPrice) +
    getOptionalTotal(item.boltCount, item.boltPrice) +
    getOptionalTotal(item.hingeCount, item.hingePrice) +
    getOptionalTotal(item.doorStopCount, item.doorStopPrice)
  );
}

export function getOrderTotal(order: OrderCreatePayload): number {
  return (
    order.interiorDoors.reduce((sum, item) => sum + getInteriorDoorTotal(item), 0) +
    order.entranceDoors.reduce((sum, item) => sum + item.price * item.count, 0) +
    order.moldings.reduce((sum, item) => sum + getMoldingTotal(item), 0) +
    order.extensions.reduce((sum, item) => sum + getExtensionTotal(item), 0) +
    order.capitals.reduce((sum, item) => sum + getCapitalTotal(item), 0) +
    order.hardwares.reduce((sum, item) => sum + getHardwareTotal(item), 0) +
    order.panelings.reduce((sum, item) => sum + getPanelingTotal(item), 0) +
    order.skirtings.reduce((sum, item) => sum + getSkirtingTotal(item), 0)
  );
}

export function getTotalToPay(order: OrderCreatePayload): number {
  return Math.max(getOrderTotal(order) - order.discount, 0);
}

export function getPaidAmount(order: OrderCreatePayload): number {
  if (order.payments.length > 0) {
    return order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  return order.prepayment;
}

export function getCustomerDebt(order: OrderCreatePayload): number {
  return Math.max(getTotalToPay(order) - getPaidAmount(order), 0);
}
