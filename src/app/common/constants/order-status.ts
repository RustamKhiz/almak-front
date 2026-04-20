import { OrderStatus } from '../../types/order.types';

export const ORDER_STATUS_OPTIONS: readonly OrderStatus[] = [
  OrderStatus.Accepted,
  OrderStatus.Ordered,
  OrderStatus.Received,
  OrderStatus.CustomerNotified,
  OrderStatus.Issued,
  OrderStatus.Completed,
];

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  [OrderStatus.Accepted]: 'Принят',
  [OrderStatus.Ordered]: 'Заказан',
  [OrderStatus.Received]: 'Получен',
  [OrderStatus.CustomerNotified]: 'Клиент оповещен',
  [OrderStatus.Issued]: 'Выдан',
  [OrderStatus.Completed]: 'Завершен',
};

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] || 'Неизвестный статус';
}

export function getOrderPaymentLabel(isPaid: boolean): string {
  return isPaid ? 'Оплачен' : 'Не оплачен';
}
