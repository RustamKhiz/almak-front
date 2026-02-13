import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { DoorItem, DoorLeafType, DoorType } from '../../types/order.types';

export type DoorDialogData = {
  mode: 'create' | 'edit';
  door?: DoorItem;
};

export type DoorDialogResult = Omit<DoorItem, 'id'>;

@Component({
  selector: 'app-order-door-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
  ],
  templateUrl: './order-door-dialog.component.html',
  styleUrl: './order-door-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoorDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<DoorDialogComponent, DoorDialogResult>);
  private readonly data = inject<DoorDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.group({
    type: [this.data.door?.type ?? 'Entrance', [Validators.required]],
    model: [this.data.door?.model ?? '', [Validators.required]],
    price: [this.data.door?.price ?? 0, [Validators.required, Validators.min(0)]],
    color: [this.data.door?.color ?? '', [Validators.required]],
    width: [this.data.door?.width ?? 0, [Validators.required, Validators.min(1)]],
    height: [this.data.door?.height ?? 0, [Validators.required, Validators.min(1)]],
    leafType: [this.data.door?.leafType ?? 'Single', [Validators.required]],
    count: [this.data.door?.count ?? 1, [Validators.required, Validators.min(1)]],
  });

  protected readonly title = this.data.mode === 'edit' ? 'Редактировать дверь' : 'Добавить дверь';

  protected onCancelClick(): void {
    this.dialogRef.close();
  }

  protected onSaveClick(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      type: value.type as DoorType,
      model: value.model ?? '',
      price: Number(value.price ?? 0),
      color: value.color ?? '',
      width: Number(value.width ?? 0),
      height: Number(value.height ?? 0),
      leafType: value.leafType as DoorLeafType,
      count: Number(value.count ?? 1),
    });
  }
}
