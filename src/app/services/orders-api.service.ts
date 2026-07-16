import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BackendAddOrderPaymentPayload,
  BackendOrder,
  BackendOrderPayload,
  BackendOrderStatusPayload,
  BackendUpdateOrderDiscountPayload,
} from './order-api.types';
import { CoreService } from './core.service';

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly coreService = inject(CoreService);
  private readonly baseUrl = `${this.coreService.apiBaseUrl}/orders`;

  getOrders(): Observable<BackendOrder[]> {
    return this.http.get<BackendOrder[]>(this.baseUrl);
  }

  getOrder(id: number): Observable<BackendOrder> {
    return this.http.get<BackendOrder>(`${this.baseUrl}/${id}`);
  }

  createOrder(payload: BackendOrderPayload): Observable<BackendOrder> {
    return this.http.post<BackendOrder>(this.baseUrl, payload);
  }

  updateOrder(id: number, payload: BackendOrderPayload): Observable<BackendOrder> {
    return this.http.put<BackendOrder>(`${this.baseUrl}/${id}`, payload);
  }

  updateOrderStatus(id: number, payload: BackendOrderStatusPayload): Observable<BackendOrder> {
    return this.http.patch<BackendOrder>(`${this.baseUrl}/${id}/status`, payload);
  }

  addOrderPayment(id: number, payload: BackendAddOrderPaymentPayload): Observable<BackendOrder> {
    return this.http.post<BackendOrder>(`${this.baseUrl}/${id}/payments`, payload);
  }

  reverseOrderPayment(orderId: number, paymentId: number): Observable<BackendOrder> {
    return this.http.delete<BackendOrder>(`${this.baseUrl}/${orderId}/payments/${paymentId}`);
  }

  updateOrderDiscount(id: number, payload: BackendUpdateOrderDiscountPayload): Observable<BackendOrder> {
    return this.http.patch<BackendOrder>(`${this.baseUrl}/${id}/discounts`, payload);
  }

  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
