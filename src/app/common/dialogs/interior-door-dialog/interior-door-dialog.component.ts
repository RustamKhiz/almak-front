import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { DOOR_LEAF_TYPE_LABELS, DOOR_LEAF_TYPE_OPTIONS } from '../../constants/door-catalog';
import {
  DEFAULT_INTERIOR_DOOR_HEIGHT,
  DEFAULT_INTERIOR_DOOR_WIDTH,
  INTERIOR_DOOR_HEIGHT_OPTIONS,
  INTERIOR_DOOR_WIDTH_OPTIONS,
} from '../../constants/interior-door-catalog';
import { InteriorDoorItem } from '../../../types/order.types';

export interface InteriorDoorDialogData {
  mode: 'create' | 'edit';
  door?: InteriorDoorItem;
}

export type InteriorDoorDialogResult = Omit<InteriorDoorItem, 'id'>;

@Component({
  selector: 'app-interior-door-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
  ],
  templateUrl: './interior-door-dialog.component.html',
  styleUrl: './interior-door-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteriorDoorDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<InteriorDoorDialogComponent, InteriorDoorDialogResult>);
  private readonly data = inject<InteriorDoorDialogData>(MAT_DIALOG_DATA);

  protected readonly doorLeafTypeOptions = DOOR_LEAF_TYPE_OPTIONS;
  protected readonly doorLeafTypeLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly widthOptions = INTERIOR_DOOR_WIDTH_OPTIONS;
  protected readonly heightOptions = INTERIOR_DOOR_HEIGHT_OPTIONS;

  protected readonly form = this.fb.group({
    model: [this.data.door?.model ?? '', [Validators.required]],
    hasGlass: [this.data.door?.hasGlass ?? false],
    width: [this.data.door?.width ?? DEFAULT_INTERIOR_DOOR_WIDTH, [Validators.required]],
    width2: [this.data.door?.width2 ?? (null as number | null)],
    height: [this.data.door?.height ?? DEFAULT_INTERIOR_DOOR_HEIGHT, [Validators.required]],
    price: [this.data.door?.price ?? 0, [Validators.required, Validators.min(0)]],
    leafType: [this.data.door?.leafType ?? DOOR_LEAF_TYPE_OPTIONS[0], [Validators.required]],
    count: [this.data.door?.count ?? 1, [Validators.required, Validators.min(1)]],
    comment: [this.data.door?.comment ?? ''],
  });

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать межкомнатную дверь' : 'Добавить межкомнатную дверь',
  );

  constructor() {
    this.form.controls.leafType.valueChanges.subscribe((leafType) => {
      if (leafType === 'Double') {
        this.form.controls.width2.addValidators([Validators.required]);
      } else {
        this.form.controls.width2.removeValidators([Validators.required]);
        this.form.controls.width2.setValue(null, { emitEvent: false });
      }

      this.form.controls.width2.updateValueAndValidity({ emitEvent: false });
    });

    if (this.form.controls.leafType.value === 'Double') {
      this.form.controls.width2.addValidators([Validators.required]);
      this.form.controls.width2.updateValueAndValidity({ emitEvent: false });
    }
  }

  protected onDecreaseCountClick(): void {
    const currentValue = Number(this.form.controls.count.value ?? 1);
    this.form.controls.count.setValue(Math.max(1, currentValue - 1));
  }

  protected onIncreaseCountClick(): void {
    const currentValue = Number(this.form.controls.count.value ?? 1);
    this.form.controls.count.setValue(currentValue + 1);
  }

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
      model: value.model ?? '',
      hasGlass: value.hasGlass,
      width: value.width ?? DEFAULT_INTERIOR_DOOR_WIDTH,
      width2: value.leafType === 'Double' ? (value.width2 ?? DEFAULT_INTERIOR_DOOR_WIDTH) : null,
      height: value.height ?? DEFAULT_INTERIOR_DOOR_HEIGHT,
      price: value.price ?? 0,
      leafType: value.leafType ?? DOOR_LEAF_TYPE_OPTIONS[0],
      count: Math.max(1, Number(value.count ?? 1)),
      comment: value.comment?.trim() ?? '',
    });
  }
}
