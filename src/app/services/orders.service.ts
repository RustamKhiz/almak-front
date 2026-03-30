import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BackendOrderStatus,
  DoorLeafType,
  InteriorDoorCovering,
  InteriorDoorItem,
  OrderCreatePayload,
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
  orders?: BackendInteriorDoor[];
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
  orders: BackendInteriorDoorPayload[];
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
    const orders = (order.orders ?? []).map((item) => this.mapBackendDoorToDoorItem(item));

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
      orders,
    };
  }

  private mapCreatePayloadToBackend(payload: OrderCreatePayload): BackendOrderPayload {
    const total = payload.orders.reduce((sum, item) => sum + item.price * item.count, 0);
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
      orders: payload.orders.map((item) => ({
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
    };
  }

  private mapBackendDoorToDoorItem(door: BackendInteriorDoor): InteriorDoorItem {
    return {
      id: door.id,
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
