import { Routes } from '@angular/router';
import { OrdersComponent } from './pages/orders/orders.component';
import { OrderComponent } from './pages/order/order.component';
import { OrderViewComponent } from './pages/order-view/order-view.component';
import { AuthComponent } from './pages/auth/auth.component';
import { OrdersChartsComponent } from './pages/orders-charts/orders-charts.component';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  { path: 'orders', component: OrdersComponent, title: 'Все заказы', canActivate: [authGuard] },
  { path: 'order', component: OrderComponent, title: 'Заказ', canActivate: [authGuard] },
  {
    path: 'order/:id',
    component: OrderViewComponent,
    title: 'Просмотр заказа',
    canActivate: [authGuard],
  },
  {
    path: 'order/:id/edit',
    component: OrderComponent,
    title: 'Редактирование заказа',
    canActivate: [authGuard],
  },
  {
    path: 'orders-charts',
    component: OrdersChartsComponent,
    title: 'График',
    canActivate: [authGuard],
  },
  { path: 'auth', component: AuthComponent, title: 'Авторизация' },
  { path: '**', redirectTo: 'orders' },
];
