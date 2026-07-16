import { BackendOrderStatus, ExtensionSize, PanelingSize } from '../types/order.types';

export interface BackendOrder {
  id: number;
  customer: string;
  phone: string;
  date: string;
  price: number;
  prepayment: number;
  discount: number;
  needsDelivery: boolean;
  deliveryAddress: string;
  comment: string;
  status: BackendOrderStatus;
  isPaid: boolean;
  payments?: BackendOrderPayment[];
  interiorDoors?: BackendInteriorDoor[];
  entranceDoors?: BackendEntranceDoor[];
  moldings?: BackendMolding[];
  extensions?: BackendExtension[];
  capitals?: BackendCapital[];
  hardwares?: BackendHardware[];
  panelings?: BackendPaneling[];
  skirtings?: BackendSkirting[];
  created_at?: string;
}

export interface BackendOrderPayment {
  id: number;
  orderId: number;
  amount: number;
  comment?: string;
  createdAt?: string;
  reversalOfPaymentId?: number | null;
  reversedByPaymentId?: number | null;
}

export interface BackendInteriorDoor {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  model: string;
  color: string;
  price: number;
  price2?: number | null;
  width: number;
  width2?: number | null;
  height: number;
  height2?: number | null;
  hasGlass?: boolean;
  glassComment?: string;
  leafType: string;
  count: number;
  count2?: number | null;
  covering?: string;
  rebateBarCount?: number;
  rebateBarPrice?: number | null;
  comment?: string;
}

export interface BackendEntranceDoor {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  kind: string;
  opening?: string;
  leafType?: string;
  model: string;
  width: number;
  height: number;
  color: string;
  painting?: string | null;
  panelColor?: string | null;
  hasPeephole?: boolean | null;
  count: number;
  price: number;
  comment?: string;
}

export interface BackendMolding {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  frameLength?: number | null;
  framePrice: number;
  frameSetCount?: number;
  frameBoxCount?: number;
  frameThresholdCount?: number;
  frameThresholdPrice?: number;
  frameCount: number;
  platbandType: string;
  platbandFigure?: string | null;
  platbandLength?: number | null;
  platbandPrice: number;
  platbandSetCount?: number;
  platbandCount: number;
  platbandDeductionPrice?: number;
  rebateBarCount: number;
  rebateBarPrice?: number;
  color: string;
  covering?: string;
  comment?: string;
}

export interface BackendExtension {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  color: string;
  covering?: string;
  width: number;
  height: number;
  sizes?: BackendExtensionSize[];
  setCount?: number;
  quantityPerSet?: number;
  totalArea?: number;
  comment?: string;
  count: number;
  price: number;
}

export interface BackendExtensionSize {
  width: number;
  height: number;
  quantity?: number;
}

export interface BackendCapital {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  name: string;
  color: string;
  covering?: string;
  width: number;
  height: number;
  price: number;
  comment?: string;
  count: number;
}

export interface BackendHardware {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  handleModel?: string | null;
  handleColor?: string | null;
  handleCount?: number | null;
  handlePrice?: number | null;
  lockCount?: number | null;
  lockPrice?: number | null;
  fixatorCount?: number | null;
  fixatorPrice?: number | null;
  clickCount?: number | null;
  clickPrice?: number | null;
  thumbturnCount?: number | null;
  thumbturnPrice?: number | null;
  escutcheonCount?: number | null;
  escutcheonPrice?: number | null;
  cylinderCount?: number | null;
  cylinderPrice?: number | null;
  boltCount?: number | null;
  boltPrice?: number | null;
  hingeRightCount?: number | null;
  hingeLeftCount?: number | null;
  hingeCount?: number | null;
  hingePrice?: number | null;
  doorStopCount?: number | null;
  doorStopPrice?: number | null;
  comment?: string;
}

export interface BackendPaneling {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  color: string;
  size?: string;
  width: number;
  height: number;
  covering?: string;
  kind?: string;
  sizes?: BackendPanelingSize[];
  quantityPerSet?: number;
  totalArea?: number;
  count: number;
  price: number;
  comment?: string;
}

export interface BackendPanelingSize {
  width: number;
  height: number;
}

export interface BackendSkirting {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  model: string;
  color: string;
  height: number;
  length: number;
  count: number;
  price: number;
  comment?: string;
}

export interface BackendOrderPayload {
  customer: string;
  phone: string;
  date: string;
  price: number;
  prepayment: number;
  discount: number;
  needsDelivery: boolean;
  deliveryAddress: string;
  comment: string;
  status: BackendOrderStatus;
  isPaid: boolean;
  interiorDoors: BackendInteriorDoorPayload[];
  entranceDoors: BackendEntranceDoorPayload[];
  moldings: BackendMoldingPayload[];
  extensions: BackendExtensionPayload[];
  capitals: BackendCapitalPayload[];
  hardwares: BackendHardwarePayload[];
  panelings: BackendPanelingPayload[];
  skirtings: BackendSkirtingPayload[];
}

export interface BackendInteriorDoorPayload {
  supplier: string;
  costPrice: number;
  model: string;
  color: string;
  price: number;
  price2?: number | null;
  width: number;
  width2?: number | null;
  height: number;
  height2?: number | null;
  hasGlass: boolean;
  glassComment: string;
  leafType: string;
  count: number;
  count2?: number | null;
  covering: string;
  rebateBarCount: number;
  rebateBarPrice: number | null;
  comment: string;
}

export interface BackendEntranceDoorPayload {
  supplier: string;
  costPrice: number;
  kind: string;
  opening: string;
  leafType: string;
  model: string;
  width: number;
  height: number;
  color: string;
  painting?: string | null;
  panelColor?: string | null;
  hasPeephole?: boolean | null;
  count: number;
  price: number;
  comment: string;
}

export interface BackendMoldingPayload {
  supplier: string;
  costPrice: number;
  frameLength?: number | null;
  framePrice: number;
  frameSetCount: number;
  frameBoxCount: number;
  frameThresholdCount: number;
  frameThresholdPrice: number;
  frameCount: number;
  platbandType: string;
  platbandFigure?: string | null;
  platbandLength?: number | null;
  platbandPrice: number;
  platbandSetCount: number;
  platbandCount: number;
  platbandDeductionPrice: number;
  rebateBarCount: number;
  rebateBarPrice: number;
  color: string;
  covering: string;
  comment: string;
}

export interface BackendExtensionPayload {
  supplier: string;
  costPrice: number;
  color: string;
  covering: string;
  width: number;
  height: number;
  sizes: readonly ExtensionSize[];
  setCount: number;
  quantityPerSet: number;
  totalArea: number;
  comment: string;
  count: number;
  price: number;
}

export interface BackendCapitalPayload {
  supplier: string;
  costPrice: number;
  name: string;
  color: string;
  covering: string;
  width: number;
  height: number;
  price: number;
  comment: string;
  count: number;
}

export interface BackendHardwarePayload {
  supplier: string;
  costPrice: number;
  handleModel?: string | null;
  handleColor?: string | null;
  handleCount?: number | null;
  handlePrice?: number | null;
  lockCount?: number | null;
  lockPrice?: number | null;
  fixatorCount?: number | null;
  fixatorPrice?: number | null;
  clickCount?: number | null;
  clickPrice?: number | null;
  thumbturnCount?: number | null;
  thumbturnPrice?: number | null;
  escutcheonCount?: number | null;
  escutcheonPrice?: number | null;
  cylinderCount?: number | null;
  cylinderPrice?: number | null;
  boltCount?: number | null;
  boltPrice?: number | null;
  hingeRightCount?: number | null;
  hingeLeftCount?: number | null;
  hingeCount?: number | null;
  hingePrice?: number | null;
  doorStopCount?: number | null;
  doorStopPrice?: number | null;
  comment: string;
}

export interface BackendPanelingPayload {
  supplier: string;
  costPrice: number;
  color: string;
  width: number;
  height: number;
  covering: string;
  kind: string;
  sizes: readonly PanelingSize[];
  totalArea: number;
  count: number;
  price: number;
  comment: string;
}

export interface BackendSkirtingPayload {
  supplier: string;
  costPrice: number;
  model: string;
  color: string;
  height: number;
  length: number;
  count: number;
  price: number;
  comment: string;
}

export interface BackendOrderStatusPayload {
  status: number;
}

export interface BackendAddOrderPaymentPayload {
  amount: number;
  comment: string;
}

export interface BackendUpdateOrderDiscountPayload {
  amount: number;
}
