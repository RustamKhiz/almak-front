import { OrderStatus } from '../../types/order.types';

export const ORDER_STATUS_OPTIONS: readonly OrderStatus[] = [
  OrderStatus.Accepted,
  OrderStatus.Progress,
  OrderStatus.Completed,
];

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  [OrderStatus.Accepted]: 'Принят',
  [OrderStatus.Progress]: 'В процессе',
  [OrderStatus.Completed]: 'Завершен',
};

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] || 'Неизвестный статус';
}
