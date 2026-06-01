export enum DoorLeafType {
  Single = 'Single',
  Double = 'Double',
}

export enum OrderItemType {
  InteriorDoor = 'interiorDoor',
  EntranceDoor = 'entranceDoor',
  Molding = 'molding',
  Extension = 'extension',
  Capital = 'capital',
  Hardware = 'hardware',
  Paneling = 'paneling',
}

export enum InteriorDoorCovering {
  Enamel = 'Enamel',
  Veneer = 'Veneer',
  Embossing = 'Embossing',
  PVC = 'PVC',
}

export enum EntranceDoorKind {
  Factory = 'factory',
  Welded = 'welded',
}

export enum EntranceDoorOpening {
  Left = 'left',
  Right = 'right',
}

export enum MoldingPlatbandType {
  Oval = 'oval',
  Smooth = 'smooth',
  Figure = 'figure',
}

export enum MoldingCovering {
  Enamel = 'Enamel',
  Veneer = 'Veneer',
  Embossing = 'Embossing',
  PVC = 'PVC',
}

export enum ExtensionCovering {
  Enamel = 'Enamel',
  Veneer = 'Veneer',
  Embossing = 'Embossing',
}

export enum CapitalCovering {
  Enamel = 'Enamel',
  Veneer = 'Veneer',
  Embossing = 'Embossing',
}

export enum PanelingCovering {
  Enamel = 'Enamel',
  Veneer = 'Veneer',
  Embossing = 'Embossing',
  PVC = 'PVC',
}

export enum PanelingKind {
  Smooth = 'smooth',
  Figure = 'figure',
  Baguette = 'baguette',
}

export enum HardwareMechanismType {
  Lock = 'lock',
  Fixator = 'fixator',
}

export enum OrderStatus {
  Accepted = 1,
  Ordered = 2,
  Received = 3,
  CustomerNotified = 4,
  Issued = 5,
  Completed = 6,
}

export enum BackendOrderStatus {
  Accepted = 'accepted',
  Ordered = 'ordered',
  Received = 'received',
  CustomerNotified = 'customer_notified',
  Issued = 'issued',
  Completed = 'completed',
}

export interface InteriorDoorItem {
  id: number;
  type: OrderItemType.InteriorDoor;
  supplier: string;
  model: string;
  color: string;
  price: number;
  price2: number | null;
  width: number;
  width2: number | null;
  height: number;
  height2: number | null;
  hasGlass: boolean;
  glassComment: string;
  leafType: DoorLeafType;
  count: number;
  count2: number | null;
  covering: InteriorDoorCovering;
  comment: string;
}

export interface EntranceDoorItem {
  id: number;
  type: OrderItemType.EntranceDoor;
  supplier: string;
  kind: EntranceDoorKind;
  opening: EntranceDoorOpening;
  leafType: DoorLeafType;
  model: string;
  width: number;
  height: number;
  color: string;
  painting: string | null;
  panelColor: string | null;
  hasPeephole: boolean | null;
  count: number;
  price: number;
  comment: string;
}

export interface MoldingItem {
  id: number;
  type: OrderItemType.Molding;
  supplier: string;
  frameLength: number | null;
  framePrice: number;
  frameSetCount: number;
  frameBoxCount: number;
  frameThresholdCount: number;
  frameThresholdPrice: number;
  frameCount: number;
  platbandType: MoldingPlatbandType;
  platbandFigure: string | null;
  platbandLength: number | null;
  platbandPrice: number;
  platbandSetCount: number;
  platbandCount: number;
  platbandDeductionPrice: number;
  rebateBarCount: number;
  rebateBarPrice: number;
  color: string;
  covering: MoldingCovering;
  comment: string;
}

export interface ExtensionItem {
  id: number;
  type: OrderItemType.Extension;
  supplier: string;
  color: string;
  covering: ExtensionCovering;
  width: number;
  height: number;
  setCount: number;
  quantityPerSet: number;
  totalArea: number;
  comment: string;
  count: number;
  price: number;
}

export interface CapitalItem {
  id: number;
  type: OrderItemType.Capital;
  supplier: string;
  name: string;
  color: string;
  covering: CapitalCovering;
  width: number;
  height: number;
  price: number;
  comment: string;
  count: number;
}

export interface PanelingItem {
  id: number;
  type: OrderItemType.Paneling;
  supplier: string;
  color: string;
  size: string;
  width: number;
  height: number;
  covering: PanelingCovering;
  kind: PanelingKind;
  sizes: readonly PanelingSize[];
  totalArea: number;
  count: number;
  price: number;
  comment: string;
}

export interface PanelingSize {
  width: number;
  height: number;
}

export interface HardwareItem {
  id: number;
  type: OrderItemType.Hardware;
  supplier: string;
  handleModel: string;
  handleColor: string;
  handleCount: number | null;
  handlePrice: number | null;
  lockCount: number | null;
  lockPrice: number | null;
  fixatorCount: number | null;
  fixatorPrice: number | null;
  clickCount: number | null;
  clickPrice: number | null;
  thumbturnCount: number | null;
  thumbturnPrice: number | null;
  escutcheonCount: number | null;
  escutcheonPrice: number | null;
  cylinderCount: number | null;
  cylinderPrice: number | null;
  boltCount: number | null;
  boltPrice: number | null;
  hingeCount: number | null;
  hingePrice: number | null;
  doorStopCount: number | null;
  doorStopPrice: number | null;
  comment: string;
}

export interface OrderPayment {
  id: number;
  amount: number;
  comment: string;
  createdAt: string;
  reversalOfPaymentId: number | null;
  reversedByPaymentId: number | null;
}

export interface OrderCustomerForm {
  name: string;
  phone: string;
  date: string;
  prepayment: number;
  discount: number;
  needsDelivery: boolean;
  isPaid: boolean;
  deliveryAddress: string;
  comment: string;
  status: OrderStatus;
}

export interface OrderCreatePayload extends OrderCustomerForm {
  payments: readonly OrderPayment[];
  interiorDoors: readonly InteriorDoorItem[];
  entranceDoors: readonly EntranceDoorItem[];
  moldings: readonly MoldingItem[];
  extensions: readonly ExtensionItem[];
  capitals: readonly CapitalItem[];
  hardwares: readonly HardwareItem[];
  panelings: readonly PanelingItem[];
}
