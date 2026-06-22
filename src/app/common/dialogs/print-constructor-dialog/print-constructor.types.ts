import { OrderCreatePayload } from '../../../types/order.types';

export type PrintConstructorAction = 'print' | 'download';

export type PrintableOrderItemType =
  | 'interiorDoor'
  | 'entranceDoor'
  | 'molding'
  | 'extension'
  | 'capital'
  | 'hardware'
  | 'paneling'
  | 'skirting';

export interface PrintConstructorOptions {
  selectedItemKeys: readonly string[];
  showPrices: boolean;
  showTotals: boolean;
  showDiscount: boolean;
  showPayments: boolean;
  showCustomerInfo: boolean;
  showDeliveryInfo: boolean;
  showComments: boolean;
  showSignatures: boolean;
  showSupplier: boolean;
}

export interface PrintConstructorDialogData {
  orderId: number;
  order: OrderCreatePayload;
}

export interface PrintConstructorDialogResult {
  action: PrintConstructorAction;
  options: PrintConstructorOptions;
}

export interface PrintableOrderItem {
  key: string;
  type: PrintableOrderItemType;
  typeLabel: string;
  title: string;
  summary: string;
  total: number;
}

export interface PrintPreset {
  id: string;
  label: string;
  description: string;
  options: Omit<PrintConstructorOptions, 'selectedItemKeys'>;
}
