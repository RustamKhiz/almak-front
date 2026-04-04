import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { DOOR_LEAF_TYPE_LABELS, DOOR_LEAF_TYPE_OPTIONS } from '../../constants/door-catalog';
import {
  DEFAULT_INTERIOR_DOOR_COVERING,
  INTERIOR_DOOR_COVERING_LABELS,
  INTERIOR_DOOR_COVERING_OPTIONS,
} from '../../constants/interior-door-covering';
import {
  DEFAULT_INTERIOR_DOOR_HEIGHT,
  DEFAULT_INTERIOR_DOOR_WIDTH,
  INTERIOR_DOOR_HEIGHT_OPTIONS,
  INTERIOR_DOOR_WIDTH_OPTIONS,
} from '../../constants/interior-door-catalog';
import { DoorLeafType, InteriorDoorItem, OrderItemType } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';

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
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    CatalogAutocompleteFieldComponent,
    QuantityFieldComponent,
  ],
  templateUrl: './interior-door-dialog.component.html',
  styleUrl: './interior-door-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteriorDoorDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<InteriorDoorDialogComponent, InteriorDoorDialogResult>);
  private readonly data = inject<InteriorDoorDialogData>(MAT_DIALOG_DATA);

  protected readonly doorLeafTypeOptions = DOOR_LEAF_TYPE_OPTIONS;
  protected readonly doorLeafTypeLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly widthOptions = INTERIOR_DOOR_WIDTH_OPTIONS;
  protected readonly heightOptions = INTERIOR_DOOR_HEIGHT_OPTIONS;
  protected readonly coveringOptions = INTERIOR_DOOR_COVERING_OPTIONS;
  protected readonly coveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  protected readonly doorLeafType = DoorLeafType;

  protected readonly form = this.fb.group({
    model: [this.data.door?.model ?? '', [Validators.required]],
    hasGlass: [this.data.door?.hasGlass ?? false],
    width: [this.data.door?.width ?? DEFAULT_INTERIOR_DOOR_WIDTH, [Validators.required, Validators.min(1)]],
    width2: [this.data.door?.width2 ?? (null as number | null)],
    height: [this.data.door?.height ?? DEFAULT_INTERIOR_DOOR_HEIGHT, [Validators.required, Validators.min(1)]],
    price: [this.data.door?.price ?? 0, [Validators.required, Validators.min(0)]],
    leafType: [this.data.door?.leafType ?? DoorLeafType.Single, [Validators.required]],
    count: [this.data.door?.count ?? 1, [Validators.required, Validators.min(1)]],
    covering: [this.data.door?.covering ?? DEFAULT_INTERIOR_DOOR_COVERING, [Validators.required]],
    comment: [this.data.door?.comment ?? ''],
  });

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать межкомнатную дверь' : 'Добавить межкомнатную дверь',
  );

  constructor() {
    this.form.controls.leafType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((leafType) => {
      if (leafType === DoorLeafType.Double) {
        this.form.controls.width2.addValidators([Validators.required, Validators.min(1)]);
      } else {
        this.form.controls.width2.removeValidators([Validators.required, Validators.min(1)]);
        this.form.controls.width2.setValue(null, { emitEvent: false });
      }

      this.form.controls.width2.updateValueAndValidity({ emitEvent: false });
    });

    if (this.form.controls.leafType.value === DoorLeafType.Double) {
      this.form.controls.width2.addValidators([Validators.required, Validators.min(1)]);
      this.form.controls.width2.updateValueAndValidity({ emitEvent: false });
    }
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
      type: OrderItemType.InteriorDoor,
      model: value.model ?? '',
      hasGlass: value.hasGlass ?? false,
      width: value.width ?? DEFAULT_INTERIOR_DOOR_WIDTH,
      width2: value.leafType === DoorLeafType.Double ? (value.width2 ?? DEFAULT_INTERIOR_DOOR_WIDTH) : null,
      height: value.height ?? DEFAULT_INTERIOR_DOOR_HEIGHT,
      price: value.price ?? 0,
      leafType: value.leafType ?? DoorLeafType.Single,
      count: Math.max(1, Number(value.count ?? 1)),
      covering: value.covering ?? DEFAULT_INTERIOR_DOOR_COVERING,
      comment: value.comment?.trim() ?? '',
    });
  }
}
