import { Routes } from '@angular/router';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent),
    title: 'Все заказы',
    canActivate: [authGuard],
  },
  {
    path: 'order',
    loadComponent: () => import('./pages/order/order.component').then((m) => m.OrderComponent),
    title: 'Заказ',
    canActivate: [authGuard],
  },
  {
    path: 'drafts',
    loadComponent: () => import('./pages/order-drafts/order-drafts.component').then((m) => m.OrderDraftsComponent),
    title: 'Черновики',
  },
  {
    path: 'drafts/:draftId',
    loadComponent: () => import('./pages/order/order.component').then((m) => m.OrderComponent),
    title: 'Черновик заказа',
  },
  {
    path: 'order/:id',
    loadComponent: () => import('./pages/order-view/order-view.component').then((m) => m.OrderViewComponent),
    title: 'Просмотр заказа',
    canActivate: [authGuard],
  },
  {
    path: 'order/:id/edit',
    loadComponent: () => import('./pages/order/order.component').then((m) => m.OrderComponent),
    title: 'Редактирование заказа',
    canActivate: [authGuard],
  },
  {
    path: 'orders-charts',
    loadComponent: () => import('./pages/orders-charts/orders-charts.component').then((m) => m.OrdersChartsComponent),
    title: 'График',
    canActivate: [authGuard],
  },
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth.component').then((m) => m.AuthComponent),
    title: 'Авторизация',
  },
  { path: '**', redirectTo: 'orders' },
];
