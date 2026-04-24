import { DecimalPipe } from '@angular/common';
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
import { pairwise, startWith } from 'rxjs';
import { DOOR_LEAF_TYPE_LABELS, DOOR_LEAF_TYPE_OPTIONS } from '../../constants/door-catalog';
import {
  DEFAULT_INTERIOR_DOOR_COVERING,
  INTERIOR_DOOR_COVERING_LABELS,
  INTERIOR_DOOR_COVERING_OPTIONS,
} from '../../constants/interior-door-covering';
import {
  DEFAULT_INTERIOR_DOOR_HEIGHT,
  DEFAULT_INTERIOR_DOOR_WIDTH,
  DEFAULT_INTERIOR_DOOR_WIDTH2,
  INTERIOR_DOOR_HEIGHT_OPTIONS,
  INTERIOR_DOOR_WIDTH_OPTIONS,
} from '../../constants/interior-door-catalog';
import { DoorLeafType, InteriorDoorItem, OrderItemType } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { bindLeadingCapitalization } from '../../utils/form-text';

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
    DecimalPipe,
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
    color: [this.data.door?.color ?? '', [Validators.required]],
    hasGlass: [this.data.door?.hasGlass ?? false],
    glassComment: [this.data.door?.glassComment ?? ''],
    width: [this.data.door?.width ?? DEFAULT_INTERIOR_DOOR_WIDTH, [Validators.required, Validators.min(1)]],
    width2: [(this.data.door?.width2 ?? DEFAULT_INTERIOR_DOOR_WIDTH2) as number | null],
    height: [this.data.door?.height ?? DEFAULT_INTERIOR_DOOR_HEIGHT, [Validators.required, Validators.min(1)]],
    height2: [(this.data.door?.height2 ?? this.data.door?.height ?? DEFAULT_INTERIOR_DOOR_HEIGHT) as number | null],
    price: [this.data.door?.price ?? null, [Validators.required, Validators.min(0)]],
    price2: [this.data.door?.price2 ?? null],
    leafType: [this.data.door?.leafType ?? DoorLeafType.Single, [Validators.required]],
    count: [this.data.door?.count ?? 1, [Validators.required, Validators.min(1)]],
    count2: [(this.data.door?.count2 ?? this.data.door?.count ?? 1) as number | null],
    covering: [this.data.door?.covering ?? DEFAULT_INTERIOR_DOOR_COVERING, [Validators.required]],
    comment: [this.data.door?.comment ?? ''],
  });

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать межкомнатную дверь' : 'Добавить межкомнатную дверь',
  );

  constructor() {
    bindLeadingCapitalization(this.form.controls.model, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);

    this.form.controls.hasGlass.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((hasGlass) => {
      if (hasGlass) {
        this.form.controls.glassComment.addValidators([Validators.required]);
      } else {
        this.form.controls.glassComment.removeValidators([Validators.required]);
        this.form.controls.glassComment.setValue('', { emitEvent: false });
      }

      this.form.controls.glassComment.updateValueAndValidity({ emitEvent: false });
    });

    this.form.controls.leafType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((leafType) => {
      this.updateSecondLeafControls(leafType);
    });

    if (this.form.controls.hasGlass.value === true) {
      this.form.controls.glassComment.addValidators([Validators.required]);
      this.form.controls.glassComment.updateValueAndValidity({ emitEvent: false });
    }

    this.form.controls.height.valueChanges
      .pipe(startWith(this.form.controls.height.value), pairwise(), takeUntilDestroyed(this.destroyRef))
      .subscribe(([, nextHeight]) => {
        if (this.form.controls.leafType.value === DoorLeafType.Double) {
          this.form.controls.height2.setValue(nextHeight, { emitEvent: false });
        }
      });

    this.form.controls.count.valueChanges
      .pipe(startWith(this.form.controls.count.value), pairwise(), takeUntilDestroyed(this.destroyRef))
      .subscribe(([, nextCount]) => {
        if (this.form.controls.leafType.value === DoorLeafType.Double) {
          this.form.controls.count2.setValue(nextCount, { emitEvent: false });
        }
      });

    this.updateSecondLeafControls(this.form.controls.leafType.value);
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
      model: value.model!.trim(),
      color: value.color!.trim(),
      hasGlass: value.hasGlass,
      glassComment: value.hasGlass ? value.glassComment?.trim() || '' : '',
      width: value.width,
      width2: value.leafType === DoorLeafType.Double ? value.width2! : null,
      height: value.height,
      height2: value.leafType === DoorLeafType.Double ? value.height2! : null,
      price: value.price,
      price2: value.leafType === DoorLeafType.Double ? value.price2! : null,
      leafType: value.leafType,
      count: value.count,
      count2: value.leafType === DoorLeafType.Double ? value.count2! : null,
      covering: value.covering,
      comment: value.comment?.trim() || '',
    });
  }

  protected getDraftTotal(): number {
    const value = this.form.getRawValue();
    const firstLeafTotal = Number(value.price ?? 0) * Number(value.count ?? 0);
    if (value.leafType !== DoorLeafType.Double) {
      return firstLeafTotal;
    }

    return firstLeafTotal + Number(value.price2 ?? 0) * Number(value.count2 ?? 0);
  }

  private updateSecondLeafControls(leafType: DoorLeafType | null): void {
    const secondLeafSizeControls = [this.form.controls.width2, this.form.controls.height2, this.form.controls.count2];
    const secondLeafControls = [...secondLeafSizeControls, this.form.controls.price2];

    if (leafType === DoorLeafType.Double) {
      if (!this.form.controls.width2.value) {
        this.form.controls.width2.setValue(DEFAULT_INTERIOR_DOOR_WIDTH2, { emitEvent: false });
      }
      if (!this.form.controls.height2.value) {
        this.form.controls.height2.setValue(this.form.controls.height.value, { emitEvent: false });
      }
      if (!this.form.controls.count2.value) {
        this.form.controls.count2.setValue(this.form.controls.count.value, { emitEvent: false });
      }
      secondLeafSizeControls.forEach((control) => control.addValidators([Validators.required, Validators.min(1)]));
      this.form.controls.price2.addValidators([Validators.required, Validators.min(0)]);
    } else {
      this.form.controls.width2.setValue(null, { emitEvent: false });
      this.form.controls.height2.setValue(null, { emitEvent: false });
      this.form.controls.price2.setValue(null, { emitEvent: false });
      this.form.controls.count2.setValue(null, { emitEvent: false });
      secondLeafControls.forEach((control) => control.clearValidators());
    }

    secondLeafControls.forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
  }
}
