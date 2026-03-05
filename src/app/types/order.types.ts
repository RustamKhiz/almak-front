export type DoorType = 'Entrance' | 'Interior';
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

export interface DoorItem {
  id: number;
  type: DoorType;
  model: string;
  price: number;
  color: string;
  width: number;
  height: number;
  leafType: DoorLeafType;
  count: number;
}

export interface OrderCustomerForm {
  name: string;
  phone: string;
  date: string;
  prepayment: number;
  quantity: number;
  comment: string;
  status: OrderStatus;
}

export interface OrderCreatePayload extends OrderCustomerForm {
  orders: readonly DoorItem[];
}
