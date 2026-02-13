export type DoorType = 'Entrance' | 'Interior';
export type DoorLeafType = 'Single' | 'Double';

export type DoorItem = {
  id: number;
  type: DoorType;
  model: string;
  price: number;
  color: string;
  width: number;
  height: number;
  leafType: DoorLeafType;
  count: number;
};

export type OrderCustomerForm = {
  name: string;
  phone: string;
  date: string;
  prepayment: number;
  quantity: number;
  comment: string;
};

export type OrderCreatePayload = OrderCustomerForm & {
  orders: readonly DoorItem[];
};
