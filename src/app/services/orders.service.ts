import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BackendOrderStatus,
  DoorLeafType,
  EntranceDoorItem,
  EntranceDoorKind,
  InteriorDoorCovering,
  InteriorDoorItem,
  MoldingCovering,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  OrderItemType,
  OrderStatus,
} from '../types/order.types';
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
  interiorDoors?: BackendInteriorDoor[];
  entranceDoors?: BackendEntranceDoor[];
  moldings?: BackendMolding[];
  created_at?: string;
}

interface BackendInteriorDoor {
  id: number;
  order_id: number;
  model: string;
  price: number;
  width: number;
  width2?: number | null;
  height: number;
  hasGlass?: boolean;
  leafType: string;
  count: number;
  covering?: string;
  comment?: string;
}

interface BackendEntranceDoor {
  id: number;
  order_id: number;
  kind: string;
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
  frameLength?: number | null;
  framePrice: number;
  frameCount: number;
  platbandType: string;
  platbandFigure?: string | null;
  platbandLength?: number | null;
  platbandPrice: number;
  platbandCount: number;
  rebateBarCount: number;
  color: string;
  covering?: string;
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
  interiorDoors: BackendInteriorDoorPayload[];
  entranceDoors: BackendEntranceDoorPayload[];
  moldings: BackendMoldingPayload[];
}

interface BackendInteriorDoorPayload {
  model: string;
  price: number;
  width: number;
  width2?: number | null;
  height: number;
  hasGlass: boolean;
  leafType: string;
  count: number;
  covering: string;
  comment: string;
}

interface BackendEntranceDoorPayload {
  kind: string;
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
  frameLength?: number | null;
  framePrice: number;
  frameCount: number;
  platbandType: string;
  platbandFigure?: string | null;
  platbandLength?: number | null;
  platbandPrice: number;
  platbandCount: number;
  rebateBarCount: number;
  color: string;
  covering: string;
  comment: string;
}

interface BackendOrderStatusPayload {
  status: number;
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
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly coreService: CoreService = inject(CoreService);

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
    const payload: BackendOrderStatusPayload = { status };
    return this.http
      .patch<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}/status`, payload)
      .pipe(map((order) => this.mapBackendStatusToOrderStatus(order.status)));
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
    };
  }

  private mapBackendOrderToCreatePayload(order: BackendOrder): OrderCreatePayload {
    const interiorDoors = (order.interiorDoors ?? []).map((item) => this.mapBackendDoorToDoorItem(item));
    const entranceDoors = (order.entranceDoors ?? []).map((item) => this.mapBackendEntranceDoorToDoorItem(item));
    const moldings = (order.moldings ?? []).map((item) => this.mapBackendMoldingToItem(item));

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
      interiorDoors,
      entranceDoors,
      moldings,
    };
  }

  private mapCreatePayloadToBackend(payload: OrderCreatePayload): BackendOrderPayload {
    const total =
      payload.interiorDoors.reduce((sum, item) => sum + item.price * item.count, 0) +
      payload.entranceDoors.reduce((sum, item) => sum + item.price * item.count, 0) +
      payload.moldings.reduce((sum, item) => sum + item.framePrice * item.frameCount + item.platbandPrice * item.platbandCount, 0);

    return {
      customer: payload.name,
      phone: payload.phone,
      date: payload.date,
      price: total,
      prepayment: payload.prepayment,
      discount: payload.discount,
      needsDelivery: payload.needsDelivery,
      deliveryAddress: payload.deliveryAddress,
      comment: payload.comment,
      status: this.mapOrderStatusToBackendStatus(payload.status),
      interiorDoors: payload.interiorDoors.map((item) => ({
        model: item.model,
        price: item.price,
        width: item.width,
        width2: item.width2,
        height: item.height,
        hasGlass: item.hasGlass,
        leafType: item.leafType,
        count: item.count,
        covering: item.covering,
        comment: item.comment,
      })),
      entranceDoors: payload.entranceDoors.map((item) => ({
        kind: item.kind,
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
        frameLength: item.frameLength,
        framePrice: item.framePrice,
        frameCount: item.frameCount,
        platbandType: item.platbandType,
        platbandFigure: item.platbandFigure,
        platbandLength: item.platbandLength,
        platbandPrice: item.platbandPrice,
        platbandCount: item.platbandCount,
        rebateBarCount: item.rebateBarCount,
        color: item.color,
        covering: item.covering,
        comment: item.comment,
      })),
    };
  }

  private mapBackendDoorToDoorItem(door: BackendInteriorDoor): InteriorDoorItem {
    return {
      id: door.id,
      type: OrderItemType.InteriorDoor,
      model: door.model,
      price: door.price,
      width: door.width,
      width2: door.width2 ?? null,
      height: door.height,
      hasGlass: door.hasGlass ?? false,
      leafType: door.leafType === DoorLeafType.Double ? DoorLeafType.Double : DoorLeafType.Single,
      count: door.count,
      covering: this.mapBackendCoveringToCovering(door.covering),
      comment: door.comment ?? '',
    };
  }

  private mapBackendEntranceDoorToDoorItem(door: BackendEntranceDoor): EntranceDoorItem {
    return {
      id: door.id,
      type: OrderItemType.EntranceDoor,
      kind: door.kind === EntranceDoorKind.Welded ? EntranceDoorKind.Welded : EntranceDoorKind.Factory,
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
      frameLength: item.frameLength ?? null,
      framePrice: item.framePrice,
      frameCount: item.frameCount,
      platbandType: this.mapBackendPlatbandType(item.platbandType),
      platbandFigure: item.platbandFigure ?? null,
      platbandLength: item.platbandLength ?? null,
      platbandPrice: item.platbandPrice,
      platbandCount: item.platbandCount,
      rebateBarCount: item.rebateBarCount ?? 0,
      color: item.color ?? '',
      covering: this.mapBackendMoldingCovering(item.covering),
      comment: item.comment ?? '',
    };
  }

  private mapBackendCoveringToCovering(covering?: string): InteriorDoorCovering {
    switch (covering) {
      case InteriorDoorCovering.Enamel:
      case InteriorDoorCovering.Veneer:
      case InteriorDoorCovering.Embossing:
      case InteriorDoorCovering.PVC:
        return covering;
      default:
        return InteriorDoorCovering.PVC;
    }
  }

  private mapBackendMoldingCovering(covering?: string): MoldingCovering {
    switch (covering) {
      case MoldingCovering.Enamel:
      case MoldingCovering.Veneer:
      case MoldingCovering.Embossing:
      case MoldingCovering.PVC:
        return covering;
      default:
        return MoldingCovering.Enamel;
    }
  }

  private mapBackendPlatbandType(type?: string): MoldingPlatbandType {
    switch (type) {
      case MoldingPlatbandType.Smooth:
      case MoldingPlatbandType.Figure:
      case MoldingPlatbandType.Oval:
        return type;
      default:
        return MoldingPlatbandType.Oval;
    }
  }

  private mapBackendStatusToOrderStatus(status: BackendOrderStatus): OrderStatus {
    switch (status) {
      case BackendOrderStatus.Progress:
        return OrderStatus.Progress;
      case BackendOrderStatus.Completed:
        return OrderStatus.Completed;
      case BackendOrderStatus.Accepted:
      default:
        return OrderStatus.Accepted;
    }
  }

  private mapOrderStatusToBackendStatus(status: OrderStatus): BackendOrderStatus {
    switch (status) {
      case OrderStatus.Progress:
        return BackendOrderStatus.Progress;
      case OrderStatus.Completed:
        return BackendOrderStatus.Completed;
      case OrderStatus.Accepted:
      default:
        return BackendOrderStatus.Accepted;
    }
  }
}
