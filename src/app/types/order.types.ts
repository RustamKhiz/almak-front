export type DoorLeafType = 'Single' | 'Double';
export enum OrderStatus {
  Accepted = 1,
  Progress = 2,
  Completed = 3,
}

export enum BackendOrderStatus {
  Accepted = 'accepted',
  Progress = 'progress',
  Completed = 'completed',
}

export interface InteriorDoorItem {
  id: number;
  model: string;
  price: number;
  width: number;
  width2: number | null;
  height: number;
  hasGlass: boolean;
  leafType: DoorLeafType;
  count: number;
  comment: string;
}

export interface OrderCustomerForm {
  name: string;
  phone: string;
  date: string;
  prepayment: number;
  discount: number;
  needsDelivery: boolean;
  deliveryAddress: string;
  comment: string;
  status: OrderStatus;
}

export interface OrderCreatePayload extends OrderCustomerForm {
  orders: readonly InteriorDoorItem[];
}
