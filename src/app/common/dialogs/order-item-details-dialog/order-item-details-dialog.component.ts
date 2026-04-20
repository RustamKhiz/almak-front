import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DecimalPipe } from '@angular/common';

export interface OrderItemDetailsRow {
  label: string;
  value: string;
}

export interface OrderItemDetailsSection {
  title: string;
  rows: OrderItemDetailsRow[];
}

export interface OrderItemDetailsDialogData {
  title: string;
  subtitle?: string;
  badges?: string[];
  total?: number;
  priceLabel?: string;
  totalLabel?: string;
  sections: OrderItemDetailsSection[];
}

@Component({
  selector: 'app-order-item-details-dialog',
  imports: [MatDialogModule, MatButtonModule, DecimalPipe],
  templateUrl: './order-item-details-dialog.component.html',
  styleUrl: './order-item-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderItemDetailsDialogComponent {
  protected readonly dialogRef = inject(MatDialogRef<OrderItemDetailsDialogComponent>);
  protected readonly data = inject<OrderItemDetailsDialogData>(MAT_DIALOG_DATA);

  protected onCloseClick(): void {
    this.dialogRef.close();
  }
}
