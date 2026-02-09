import { Routes } from '@angular/router';
import { OrdersComponent } from './page/orders/orders.component';
import { OrderComponent } from './page/order/order.component';
import { AuthComponent } from './page/auth/auth.component';
import { OrdersChartsComponent } from './page/orders-charts/orders-charts.component';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  { path: 'orders', component: OrdersComponent, title: 'Orders', canActivate: [authGuard] },
  { path: 'order', component: OrderComponent, title: 'Order', canActivate: [authGuard] },
  { path: 'orders-charts', component: OrdersChartsComponent, title: 'Orders Charts', canActivate: [authGuard] },
  { path: 'auth', component: AuthComponent, title: 'Auth' },
  { path: '**', redirectTo: 'orders' },
];