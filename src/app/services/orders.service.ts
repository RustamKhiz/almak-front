import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BackendOrderStatus,
  CapitalCovering,
  CapitalItem,
  DoorLeafType,
  EntranceDoorItem,
  EntranceDoorKind,
  EntranceDoorOpening,
  ExtensionCovering,
  ExtensionItem,
  HardwareItem,
  HardwareMechanismType,
  InteriorDoorCovering,
  InteriorDoorItem,
  MoldingCovering,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  OrderItemType,
  OrderPayment,
  OrderStatus,
  PanelingCovering,
  PanelingItem,
  PanelingKind,
  PanelingSize,
  SkirtingItem,
} from '../types/order.types';
import { getOrderTotal } from '../common/utils/order-calculations';
import { CoreService } from './core.service';

interface BackendOrder {
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

interface BackendOrderPayment {
  id: number;
  orderId: number;
  amount: number;
  comment?: string;
  createdAt?: string;
  reversalOfPaymentId?: number | null;
  reversedByPaymentId?: number | null;
}

interface BackendInteriorDoor {
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
interface BackendEntranceDoor {
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
interface BackendMolding {
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
interface BackendExtension {
  id: number;
  order_id: number;
  supplier?: string;
  costPrice?: number;
  color: string;
  covering?: string;
  width: number;
  height: number;
  setCount?: number;
  quantityPerSet?: number;
  totalArea?: number;
  comment?: string;
  count: number;
  price: number;
}
interface BackendCapital {
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
interface BackendHardware {
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
interface BackendPaneling {
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
interface BackendPanelingSize {
  width: number;
  height: number;
}
interface BackendSkirting {
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

interface BackendOrderPayload {
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

interface BackendInteriorDoorPayload {
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
interface BackendEntranceDoorPayload {
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
interface BackendMoldingPayload {
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
interface BackendExtensionPayload {
  supplier: string;
  costPrice: number;
  color: string;
  covering: string;
  width: number;
  height: number;
  setCount: number;
  quantityPerSet: number;
  totalArea: number;
  comment: string;
  count: number;
  price: number;
}
interface BackendCapitalPayload {
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
interface BackendHardwarePayload {
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
interface BackendPanelingPayload {
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
interface BackendSkirtingPayload {
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
interface BackendOrderStatusPayload {
  status: number;
}

interface BackendAddOrderPaymentPayload {
  amount: number;
  comment: string;
}

interface BackendUpdateOrderDiscountPayload {
  amount: number;
}

export interface OrderRecord {
  id: number;
  customer: string;
  phone: string;
  date: string;
  price: number;
  prepayment: number;
  discount: number;
  comment: string;
  status: OrderStatus;
  isPaid: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly coreService = inject(CoreService);

  getOrders(): Observable<readonly OrderRecord[]> {
    return this.http
      .get<BackendOrder[]>(`${this.coreService.apiBaseUrl}/orders`)
      .pipe(map((orders) => orders.map((item) => this.mapBackendOrderToRecord(item))));
  }
  getOrder(id: number): Observable<OrderCreatePayload> {
    return this.http
      .get<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}`)
      .pipe(map((order) => this.mapBackendOrderToCreatePayload(order)));
  }
  createOrder(payload: OrderCreatePayload): Observable<number> {
    return this.http
      .post<BackendOrder>(`${this.coreService.apiBaseUrl}/orders`, this.mapCreatePayloadToBackend(payload))
      .pipe(map((order) => order.id));
  }
  updateOrder(id: number, payload: OrderCreatePayload): Observable<number> {
    return this.http
      .put<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}`, this.mapCreatePayloadToBackend(payload))
      .pipe(map((order) => order.id));
  }
  updateOrderStatus(id: number, status: OrderStatus): Observable<OrderStatus> {
    return this.http
      .patch<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}/status`, {
        status,
      } as BackendOrderStatusPayload)
      .pipe(map((order) => this.mapBackendStatusToOrderStatus(order.status)));
  }
  addOrderPayment(id: number, amount: number, comment: string): Observable<OrderCreatePayload> {
    return this.http
      .post<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}/payments`, {
        amount,
        comment,
      } as BackendAddOrderPaymentPayload)
      .pipe(map((order) => this.mapBackendOrderToCreatePayload(order)));
  }
  reverseOrderPayment(orderId: number, paymentId: number): Observable<OrderCreatePayload> {
    return this.http
      .delete<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${orderId}/payments/${paymentId}`)
      .pipe(map((order) => this.mapBackendOrderToCreatePayload(order)));
  }
  updateOrderDiscount(id: number, amount: number): Observable<OrderCreatePayload> {
    return this.http
      .patch<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}/discounts`, {
        amount,
      } as BackendUpdateOrderDiscountPayload)
      .pipe(map((order) => this.mapBackendOrderToCreatePayload(order)));
  }
  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.coreService.apiBaseUrl}/orders/${id}`);
  }

  private mapBackendOrderToRecord(order: BackendOrder): OrderRecord {
    return {
      id: order.id,
      customer: order.customer,
      phone: order.phone,
      date: order.date,
      price: order.price,
      prepayment: order.prepayment,
      discount: order.discount ?? 0,
      comment: order.comment ?? '',
      status: this.mapBackendStatusToOrderStatus(order.status),
      isPaid: order.isPaid ?? false,
    };
  }

  private mapBackendOrderToCreatePayload(order: BackendOrder): OrderCreatePayload {
    return {
      name: order.customer,
      phone: order.phone,
      date: order.date,
      prepayment: order.prepayment,
      discount: order.discount ?? 0,
      needsDelivery: order.needsDelivery ?? false,
      deliveryAddress: order.deliveryAddress ?? '',
      comment: order.comment ?? '',
      status: this.mapBackendStatusToOrderStatus(order.status),
      isPaid: order.isPaid ?? false,
      payments: (order.payments ?? []).map((payment) => this.mapBackendPaymentToItem(payment)),
      interiorDoors: (order.interiorDoors ?? []).map((item) => this.mapBackendDoorToDoorItem(item)),
      entranceDoors: (order.entranceDoors ?? []).map((item) => this.mapBackendEntranceDoorToDoorItem(item)),
      moldings: (order.moldings ?? []).map((item) => this.mapBackendMoldingToItem(item)),
      extensions: (order.extensions ?? []).map((item) => this.mapBackendExtensionToItem(item)),
      capitals: (order.capitals ?? []).map((item) => this.mapBackendCapitalToItem(item)),
      hardwares: (order.hardwares ?? []).map((item) => this.mapBackendHardwareToItem(item)),
      panelings: (order.panelings ?? []).map((item) => this.mapBackendPanelingToItem(item)),
      skirtings: (order.skirtings ?? []).map((item) => this.mapBackendSkirtingToItem(item)),
    };
  }

  private mapCreatePayloadToBackend(payload: OrderCreatePayload): BackendOrderPayload {
    return {
      customer: payload.name,
      phone: payload.phone,
      date: payload.date,
      price: getOrderTotal(payload),
      prepayment: payload.prepayment,
      discount: payload.discount,
      needsDelivery: payload.needsDelivery,
      deliveryAddress: payload.deliveryAddress,
      comment: payload.comment,
      status: this.mapOrderStatusToBackendStatus(payload.status),
      isPaid: payload.isPaid,
      interiorDoors: payload.interiorDoors.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        model: item.model,
        color: item.color,
        price: this.toNonNegativeNumber(item.price),
        price2: this.toNullableNonNegativeNumber(item.price2),
        width: this.toPositiveInteger(item.width),
        width2: this.toNullablePositiveInteger(item.width2),
        height: this.toPositiveInteger(item.height),
        height2: this.toNullablePositiveInteger(item.height2),
        hasGlass: item.hasGlass,
        glassComment: item.glassComment,
        leafType: item.leafType,
        count: this.toPositiveInteger(item.count),
        count2: this.toNullablePositiveInteger(item.count2),
        covering: item.covering,
        rebateBarCount: this.toNonNegativeInteger(item.rebateBarCount),
        rebateBarPrice: this.toNullableNonNegativeNumber(item.rebateBarPrice),
        comment: item.comment,
      })),
      entranceDoors: payload.entranceDoors.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        kind: item.kind,
        opening: item.opening || EntranceDoorOpening.Left,
        leafType: item.leafType,
        model: item.model,
        width: item.width,
        height: item.height,
        color: item.color,
        painting: item.painting,
        panelColor: item.panelColor,
        hasPeephole: item.hasPeephole,
        count: item.count,
        price: item.price,
        comment: item.comment,
      })),
      moldings: payload.moldings.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        frameLength: this.toNullableNonNegativeInteger(item.frameLength),
        framePrice: this.toNonNegativeNumber(item.framePrice),
        frameSetCount: this.toNonNegativeInteger(item.frameSetCount),
        frameBoxCount: this.toNonNegativeInteger(item.frameBoxCount),
        frameThresholdCount: 0,
        frameThresholdPrice: 0,
        frameCount: this.toNonNegativeNumber(item.frameCount),
        platbandType: item.platbandType,
        platbandFigure: item.platbandFigure,
        platbandLength: this.toNullableNonNegativeInteger(item.platbandLength),
        platbandPrice: this.toNonNegativeNumber(item.platbandPrice),
        platbandSetCount: this.toNonNegativeInteger(item.platbandSetCount),
        platbandCount: this.toNonNegativeNumber(item.platbandCount),
        platbandDeductionPrice: this.toNonNegativeNumber(item.platbandDeductionPrice),
        rebateBarCount: this.toNonNegativeInteger(item.rebateBarCount),
        rebateBarPrice: this.toNonNegativeNumber(item.rebateBarPrice),
        color: item.color,
        covering: item.covering,
        comment: item.comment,
      })),
      extensions: payload.extensions.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        color: item.color,
        covering: item.covering,
        width: item.width,
        height: item.height,
        setCount: item.setCount,
        quantityPerSet: item.quantityPerSet,
        totalArea: item.totalArea,
        comment: item.comment,
        count: item.count,
        price: item.price,
      })),
      capitals: payload.capitals.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        name: item.name,
        color: item.color,
        covering: item.covering,
        width: item.width,
        height: item.height,
        price: item.price,
        comment: item.comment,
        count: item.count,
      })),
      hardwares: payload.hardwares.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        handleModel: item.handleModel || null,
        handleColor: item.handleColor || null,
        handleCount: item.handleCount,
        handlePrice: item.handlePrice,
        lockCount: item.lockCount,
        lockPrice: item.lockPrice,
        fixatorCount: item.fixatorCount,
        fixatorPrice: item.fixatorPrice,
        clickCount: item.clickCount,
        clickPrice: item.clickPrice,
        thumbturnCount: item.thumbturnCount,
        thumbturnPrice: item.thumbturnPrice,
        escutcheonCount: item.escutcheonCount,
        escutcheonPrice: item.escutcheonPrice,
        cylinderCount: item.cylinderCount,
        cylinderPrice: item.cylinderPrice,
        boltCount: item.boltCount,
        boltPrice: item.boltPrice,
        hingeRightCount: item.hingeRightCount,
        hingeLeftCount: item.hingeLeftCount,
        hingeCount: item.hingeCount,
        hingePrice: item.hingePrice,
        doorStopCount: item.doorStopCount,
        doorStopPrice: item.doorStopPrice,
        comment: item.comment,
      })),
      panelings: payload.panelings.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        color: item.color,
        width: item.width,
        height: item.height,
        covering: item.covering,
        kind: item.kind,
        sizes: item.sizes,
        totalArea: item.totalArea,
        count: item.count,
        price: item.price,
        comment: item.comment,
      })),
      skirtings: payload.skirtings.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        model: item.model,
        color: item.color,
        height: this.toPositiveInteger(item.height),
        length: this.toNonNegativeNumber(item.length),
        count: this.toPositiveInteger(item.count),
        price: this.toNonNegativeNumber(item.price),
        comment: item.comment,
      })),
    };
  }

  private mapBackendPaymentToItem(payment: BackendOrderPayment): OrderPayment {
    return {
      id: payment.id,
      amount: payment.amount,
      comment: payment.comment ?? '',
      createdAt: payment.createdAt ?? '',
      reversalOfPaymentId: payment.reversalOfPaymentId ?? null,
      reversedByPaymentId: payment.reversedByPaymentId ?? null,
    };
  }

  private mapBackendDoorToDoorItem(door: BackendInteriorDoor): InteriorDoorItem {
    return {
      id: door.id,
      type: OrderItemType.InteriorDoor,
      supplier: door.supplier ?? '',
      costPrice: door.costPrice ?? 0,
      model: door.model,
      color: door.color ?? '',
      price: door.price,
      price2: door.price2 ?? null,
      width: door.width,
      width2: door.width2 ?? null,
      height: door.height,
      height2: door.height2 ?? null,
      hasGlass: door.hasGlass ?? false,
      glassComment: door.glassComment ?? '',
      leafType: door.leafType === DoorLeafType.Double ? DoorLeafType.Double : DoorLeafType.Single,
      count: door.count,
      count2: door.count2 ?? null,
      covering: this.mapInteriorCovering(door.covering),
      rebateBarCount: door.rebateBarCount ?? 0,
      rebateBarPrice: door.rebateBarPrice ?? null,
      comment: door.comment ?? '',
    };
  }
  private mapBackendEntranceDoorToDoorItem(door: BackendEntranceDoor): EntranceDoorItem {
    return {
      id: door.id,
      type: OrderItemType.EntranceDoor,
      supplier: door.supplier ?? '',
      costPrice: door.costPrice ?? 0,
      kind: door.kind === EntranceDoorKind.Welded ? EntranceDoorKind.Welded : EntranceDoorKind.Factory,
      opening: door.opening === EntranceDoorOpening.Right ? EntranceDoorOpening.Right : EntranceDoorOpening.Left,
      leafType: door.leafType === DoorLeafType.Double ? DoorLeafType.Double : DoorLeafType.Single,
      model: door.model,
      width: door.width,
      height: door.height,
      color: door.color,
      painting: door.painting ?? null,
      panelColor: door.panelColor ?? null,
      hasPeephole: door.hasPeephole ?? null,
      count: door.count,
      price: door.price,
      comment: door.comment ?? '',
    };
  }
  private mapBackendMoldingToItem(item: BackendMolding): MoldingItem {
    return {
      id: item.id,
      type: OrderItemType.Molding,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      frameLength: item.frameLength ?? null,
      framePrice: item.framePrice,
      frameSetCount: item.frameSetCount ?? Math.floor(item.frameCount / 2.5),
      frameBoxCount: item.frameBoxCount ?? 0,
      frameThresholdCount: item.frameThresholdCount ?? this.getLegacyFrameThresholdCount(item.frameCount),
      frameThresholdPrice: item.frameThresholdPrice ?? 500,
      frameCount: item.frameCount,
      platbandType: this.mapMoldingPlatbandType(item.platbandType),
      platbandFigure: item.platbandFigure ?? null,
      platbandLength: item.platbandLength ?? null,
      platbandPrice: item.platbandPrice,
      platbandSetCount: item.platbandSetCount ?? Number((item.platbandCount / 2.5).toFixed(1)),
      platbandCount: item.platbandCount,
      platbandDeductionPrice: item.platbandDeductionPrice ?? 0,
      rebateBarCount: item.rebateBarCount ?? 0,
      rebateBarPrice: item.rebateBarPrice ?? 0,
      color: item.color ?? '',
      covering: this.mapMoldingCovering(item.covering),
      comment: item.comment ?? '',
    };
  }
  private mapBackendExtensionToItem(item: BackendExtension): ExtensionItem {
    return {
      id: item.id,
      type: OrderItemType.Extension,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      color: item.color ?? '',
      covering: this.mapExtensionCovering(item.covering),
      width: item.width,
      height: item.height,
      setCount: item.setCount ?? Number(((item.quantityPerSet ?? 0.5) / 2.5).toFixed(1)),
      quantityPerSet: item.quantityPerSet ?? 0.5,
      totalArea: item.totalArea ?? Number(((item.width * item.height * 0.5) / 10000).toFixed(2)),
      comment: item.comment ?? '',
      count: item.count,
      price: item.price,
    };
  }
  private mapBackendCapitalToItem(item: BackendCapital): CapitalItem {
    return {
      id: item.id,
      type: OrderItemType.Capital,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      name: item.name ?? '',
      color: item.color ?? '',
      covering: this.mapCapitalCovering(item.covering),
      width: item.width,
      height: item.height,
      price: item.price,
      comment: item.comment ?? '',
      count: item.count,
    };
  }
  private mapBackendHardwareToItem(item: BackendHardware): HardwareItem {
    return {
      id: item.id,
      type: OrderItemType.Hardware,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      handleModel: item.handleModel ?? '',
      handleColor: item.handleColor ?? '',
      handleCount: item.handleCount ?? null,
      handlePrice: item.handlePrice ?? null,
      lockCount: item.lockCount ?? null,
      lockPrice: item.lockPrice ?? null,
      fixatorCount: item.fixatorCount ?? null,
      fixatorPrice: item.fixatorPrice ?? null,
      clickCount: item.clickCount ?? null,
      clickPrice: item.clickPrice ?? null,
      thumbturnCount: item.thumbturnCount ?? null,
      thumbturnPrice: item.thumbturnPrice ?? null,
      escutcheonCount: item.escutcheonCount ?? null,
      escutcheonPrice: item.escutcheonPrice ?? null,
      cylinderCount: item.cylinderCount ?? null,
      cylinderPrice: item.cylinderPrice ?? null,
      boltCount: item.boltCount ?? null,
      boltPrice: item.boltPrice ?? null,
      hingeRightCount: item.hingeRightCount ?? item.hingeCount ?? null,
      hingeLeftCount: item.hingeLeftCount ?? null,
      hingeCount: item.hingeCount ?? null,
      hingePrice: item.hingePrice ?? null,
      doorStopCount: item.doorStopCount ?? null,
      doorStopPrice: item.doorStopPrice ?? null,
      comment: item.comment ?? '',
    };
  }
  private mapBackendPanelingToItem(item: BackendPaneling): PanelingItem {
    const sizes = this.normalizePanelingSizes(item);
    const totalArea = item.sizes?.length
      ? this.calculatePanelingTotalArea(sizes)
      : Number(((item.totalArea ?? this.calculatePanelingTotalArea(sizes)) * (item.count ?? 1)).toFixed(2));

    return {
      id: item.id,
      type: OrderItemType.Paneling,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      color: item.color ?? '',
      size: `${item.width}x${item.height}`,
      width: item.width,
      height: item.height,
      covering: this.mapPanelingCovering(item.covering),
      kind: this.mapPanelingKind(item.kind),
      sizes,
      totalArea,
      count: item.count,
      price: item.price,
      comment: item.comment ?? '',
    };
  }

  private mapBackendSkirtingToItem(item: BackendSkirting): SkirtingItem {
    return {
      id: item.id,
      type: OrderItemType.Skirting,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      model: item.model ?? '',
      color: item.color ?? '',
      height: item.height,
      length: item.length,
      count: item.count,
      price: item.price,
      comment: item.comment ?? '',
    };
  }

  private mapInteriorCovering(value?: string): InteriorDoorCovering {
    switch (value) {
      case InteriorDoorCovering.Enamel:
      case InteriorDoorCovering.Veneer:
      case InteriorDoorCovering.Embossing:
      case InteriorDoorCovering.PVC:
        return value;
      default:
        return InteriorDoorCovering.PVC;
    }
  }
  private mapMoldingCovering(value?: string): MoldingCovering {
    switch (value) {
      case MoldingCovering.Enamel:
      case MoldingCovering.Veneer:
      case MoldingCovering.Embossing:
      case MoldingCovering.PVC:
        return value;
      default:
        return MoldingCovering.Enamel;
    }
  }
  private mapExtensionCovering(value?: string): ExtensionCovering {
    switch (value) {
      case ExtensionCovering.Enamel:
      case ExtensionCovering.Veneer:
      case ExtensionCovering.Embossing:
        return value;
      default:
        return ExtensionCovering.Enamel;
    }
  }
  private mapCapitalCovering(value?: string): CapitalCovering {
    switch (value) {
      case CapitalCovering.Enamel:
      case CapitalCovering.Veneer:
      case CapitalCovering.Embossing:
        return value;
      default:
        return CapitalCovering.Enamel;
    }
  }
  private mapPanelingCovering(value?: string): PanelingCovering {
    switch (value) {
      case PanelingCovering.Enamel:
      case PanelingCovering.Veneer:
      case PanelingCovering.Embossing:
      case PanelingCovering.PVC:
        return value;
      default:
        return PanelingCovering.Enamel;
    }
  }
  private mapPanelingKind(value?: string): PanelingKind {
    switch (value) {
      case PanelingKind.Smooth:
      case PanelingKind.Figure:
      case PanelingKind.Baguette:
        return value;
      default:
        return PanelingKind.Smooth;
    }
  }
  private normalizePanelingSizes(item: BackendPaneling): PanelingSize[] {
    const parsedSizes = this.parsePanelingSizeList(item.size);
    if (parsedSizes.length > 1) {
      return parsedSizes;
    }

    if (item.sizes?.length) {
      return item.sizes.map((size) => ({ width: size.width, height: size.height }));
    }

    if (parsedSizes.length === 1) {
      return parsedSizes;
    }

    return [{ width: item.width, height: item.height }];
  }
  private parsePanelingSizeList(value?: string): PanelingSize[] {
    if (!value) {
      return [];
    }

    return value
      .split(';')
      .map((part) => part.trim())
      .map((part) => {
        const match = part.match(/^(\d+)\s*[xх×]\s*(\d+)$/i);
        if (!match) {
          return null;
        }

        return {
          width: Number(match[1]),
          height: Number(match[2]),
        };
      })
      .filter((size): size is PanelingSize => !!size && size.width > 0 && size.height > 0);
  }
  private calculatePanelingTotalArea(sizes: readonly PanelingSize[]): number {
    const totalArea = sizes.reduce((sum, size) => sum + (size.width * size.height) / 10000, 0);

    return Number(totalArea.toFixed(2));
  }
  private mapMoldingPlatbandType(value?: string): MoldingPlatbandType {
    switch (value) {
      case MoldingPlatbandType.Oval:
      case MoldingPlatbandType.Smooth:
      case MoldingPlatbandType.Figure:
        return value;
      default:
        return MoldingPlatbandType.Oval;
    }
  }

  private getLegacyFrameThresholdCount(frameCount: number): number {
    const remainder = Number((frameCount % 2.5).toFixed(1));
    return Math.max(0, Math.round(remainder / 0.5));
  }

  private toNonNegativeNumber(value: unknown, fallback = 0): number {
    const normalized = Number(value ?? fallback);
    if (!Number.isFinite(normalized)) {
      return fallback;
    }

    return Math.max(0, normalized);
  }

  private toNullableNonNegativeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return this.toNonNegativeNumber(value);
  }

  private toPositiveInteger(value: unknown, fallback = 1): number {
    const normalized = Number(value ?? fallback);
    if (!Number.isFinite(normalized)) {
      return fallback;
    }

    return Math.max(1, Math.round(normalized));
  }

  private toNonNegativeInteger(value: unknown, fallback = 0): number {
    const normalized = Number(value ?? fallback);
    if (!Number.isFinite(normalized)) {
      return fallback;
    }

    return Math.max(0, Math.round(normalized));
  }

  private toNullablePositiveInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return this.toPositiveInteger(value);
  }

  private toNullableNonNegativeInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return this.toNonNegativeInteger(value);
  }

  private mapHardwareMechanismType(value?: string | null): HardwareMechanismType | null {
    switch (value) {
      case HardwareMechanismType.Lock:
      case HardwareMechanismType.Fixator:
        return value;
      default:
        return null;
    }
  }

  private mapBackendStatusToOrderStatus(status: BackendOrderStatus): OrderStatus {
    switch (status) {
      case BackendOrderStatus.Ordered:
        return OrderStatus.Ordered;
      case BackendOrderStatus.Received:
        return OrderStatus.Received;
      case BackendOrderStatus.CustomerNotified:
        return OrderStatus.CustomerNotified;
      case BackendOrderStatus.Issued:
        return OrderStatus.Issued;
      case BackendOrderStatus.Completed:
        return OrderStatus.Completed;
      default:
        return OrderStatus.Accepted;
    }
  }
  private mapOrderStatusToBackendStatus(status: OrderStatus): BackendOrderStatus {
    switch (status) {
      case OrderStatus.Ordered:
        return BackendOrderStatus.Ordered;
      case OrderStatus.Received:
        return BackendOrderStatus.Received;
      case OrderStatus.CustomerNotified:
        return BackendOrderStatus.CustomerNotified;
      case OrderStatus.Issued:
        return BackendOrderStatus.Issued;
      case OrderStatus.Completed:
        return BackendOrderStatus.Completed;
      default:
        return BackendOrderStatus.Accepted;
    }
  }
}
