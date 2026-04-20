import {
  CapitalItem,
  ExtensionItem,
  HardwareItem,
  MoldingItem,
  OrderCreatePayload,
  PanelingItem,
} from '../../types/order.types';

export function getOptionalTotal(count: number | null, price: number | null): number {
  return Number(count ?? 0) * Number(price ?? 0);
}

export function getMoldingTotal(item: MoldingItem): number {
  return item.framePrice * item.frameCount + item.platbandPrice * item.platbandCount;
}

export function getExtensionTotal(item: ExtensionItem): number {
  return item.totalArea * item.price * item.count;
}

export function getPanelingTotal(item: PanelingItem): number {
  return item.totalArea * item.price * item.count;
}

export function getCapitalTotal(item: CapitalItem): number {
  return item.price * item.count;
}

export function getHardwareTotal(item: HardwareItem): number {
  return (
    getOptionalTotal(item.handleCount, item.handlePrice) +
    getOptionalTotal(item.lockCount, item.lockPrice) +
    getOptionalTotal(item.fixatorCount, item.fixatorPrice) +
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
    order.interiorDoors.reduce((sum, item) => sum + item.price * item.count, 0) +
    order.entranceDoors.reduce((sum, item) => sum + item.price * item.count, 0) +
    order.moldings.reduce((sum, item) => sum + getMoldingTotal(item), 0) +
    order.extensions.reduce((sum, item) => sum + getExtensionTotal(item), 0) +
    order.capitals.reduce((sum, item) => sum + getCapitalTotal(item), 0) +
    order.hardwares.reduce((sum, item) => sum + getHardwareTotal(item), 0) +
    order.panelings.reduce((sum, item) => sum + getPanelingTotal(item), 0)
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
