import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OrderCreatePayload, OrderStatus } from '../types/order.types';
import {
  BackendAddOrderPaymentPayload,
  BackendOrderStatusPayload,
  BackendUpdateOrderDiscountPayload,
  SupplierStat,
  SupplierStatsFilters,
} from './order-api.types';
import { OrderMapper, OrderRecord } from './order.mapper';
import { OrdersApiService } from './orders-api.service';

export type { OrderRecord } from './order.mapper';
export type { SupplierStat, SupplierStatsFilters } from './order-api.types';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(OrdersApiService);
  private readonly mapper = inject(OrderMapper);

  getOrders(): Observable<readonly OrderRecord[]> {
    return this.api.getOrders().pipe(map((orders) => orders.map((order) => this.mapper.toRecord(order))));
  }

  getOrder(id: number): Observable<OrderCreatePayload> {
    return this.api.getOrder(id).pipe(map((order) => this.mapper.toCreatePayload(order)));
  }

  getSupplierStats(filters: SupplierStatsFilters): Observable<readonly SupplierStat[]> {
    return this.api.getSupplierStats(filters);
  }

  createOrder(payload: OrderCreatePayload): Observable<number> {
    return this.api.createOrder(this.mapper.toBackendPayload(payload)).pipe(map((order) => order.id));
  }

  updateOrder(id: number, payload: OrderCreatePayload): Observable<number> {
    return this.api.updateOrder(id, this.mapper.toBackendPayload(payload)).pipe(map((order) => order.id));
  }

  updateOrderStatus(id: number, status: OrderStatus): Observable<OrderStatus> {
    const request: BackendOrderStatusPayload = { status };
    return this.api.updateOrderStatus(id, request).pipe(map((order) => this.mapper.toOrderStatus(order.status)));
  }

  addOrderPayment(id: number, amount: number, comment: string): Observable<OrderCreatePayload> {
    const request: BackendAddOrderPaymentPayload = { amount, comment };
    return this.api.addOrderPayment(id, request).pipe(map((order) => this.mapper.toCreatePayload(order)));
  }

  reverseOrderPayment(orderId: number, paymentId: number): Observable<OrderCreatePayload> {
    return this.api.reverseOrderPayment(orderId, paymentId).pipe(map((order) => this.mapper.toCreatePayload(order)));
  }

  updateOrderDiscount(id: number, amount: number): Observable<OrderCreatePayload> {
    const request: BackendUpdateOrderDiscountPayload = { amount };
    return this.api.updateOrderDiscount(id, request).pipe(map((order) => this.mapper.toCreatePayload(order)));
  }

  deleteOrder(id: number): Observable<void> {
    return this.api.deleteOrder(id);
  }
}
