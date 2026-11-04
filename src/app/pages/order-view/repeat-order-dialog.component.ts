import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';

export interface RepeatOrderOptions {
  copyComment: boolean;
  copyDiscount: boolean;
}

@Component({
  selector: 'app-repeat-order-dialog',
  imports: [MatButtonModule, MatCheckboxModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Повторить заказ</h2>
    <mat-dialog-content>
      <p>Перенесём товары, клиента и доставку в новый черновик. Укажите новую дату и проверьте цены.</p>
      <div><mat-checkbox #comment>Перенести комментарий к заказу</mat-checkbox></div>
      <div><mat-checkbox #discount>Перенести скидку</mat-checkbox></div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Отмена</button>
      <button
        mat-flat-button
        type="button"
        [mat-dialog-close]="{ copyComment: comment.checked, copyDiscount: discount.checked }"
      >
        Создать черновик
      </button>
    </mat-dialog-actions>
  `,
})
export class RepeatOrderDialogComponent {}
