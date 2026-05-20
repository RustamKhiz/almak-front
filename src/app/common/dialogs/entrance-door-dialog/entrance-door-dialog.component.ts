import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import {
  ENTRANCE_DOOR_HEIGHT_OPTIONS,
  ENTRANCE_DOOR_KIND_LABELS,
  ENTRANCE_DOOR_KIND_OPTIONS,
  ENTRANCE_DOOR_OPENING_LABELS,
  ENTRANCE_DOOR_OPENING_OPTIONS,
  ENTRANCE_DOOR_PAINTING_OPTIONS,
  ENTRANCE_DOOR_PANEL_COLOR_OPTIONS,
  ENTRANCE_DOOR_WIDTH_OPTIONS,
} from '../../constants/entrance-door-catalog';
import {
  DoorLeafType,
  EntranceDoorItem,
  EntranceDoorKind,
  EntranceDoorOpening,
  OrderItemType,
} from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { bindLeadingCapitalization } from '../../utils/form-text';

export interface EntranceDoorDialogData {
  mode: 'create' | 'edit';
  door?: EntranceDoorItem;
}

export type EntranceDoorDialogResult = Omit<EntranceDoorItem, 'id'>;

@Component({
  selector: 'app-entrance-door-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    CatalogAutocompleteFieldComponent,
    QuantityFieldComponent,
  ],
  templateUrl: './entrance-door-dialog.component.html',
  styleUrl: './entrance-door-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntranceDoorDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<EntranceDoorDialogComponent, EntranceDoorDialogResult>);
  private readonly data = inject<EntranceDoorDialogData>(MAT_DIALOG_DATA);

  protected readonly kindOptions = ENTRANCE_DOOR_KIND_OPTIONS;
  protected readonly kindLabels = ENTRANCE_DOOR_KIND_LABELS;
  protected readonly openingOptions = ENTRANCE_DOOR_OPENING_OPTIONS;
  protected readonly openingLabels = ENTRANCE_DOOR_OPENING_LABELS;
  protected readonly widthOptions = ENTRANCE_DOOR_WIDTH_OPTIONS;
  protected readonly heightOptions = ENTRANCE_DOOR_HEIGHT_OPTIONS;
  protected readonly paintingOptions = ENTRANCE_DOOR_PAINTING_OPTIONS;
  protected readonly panelColorOptions = ENTRANCE_DOOR_PANEL_COLOR_OPTIONS;
  protected readonly leafTypeOptions = [DoorLeafType.Single, DoorLeafType.Double] as const;
  protected readonly isWelded = signal(this.data.door?.kind === EntranceDoorKind.Welded);

  protected readonly form = this.fb.nonNullable.group({
    kind: [this.data.door?.kind ?? EntranceDoorKind.Factory, [Validators.required]],
    opening: [this.data.door?.opening ?? EntranceDoorOpening.Left, [Validators.required]],
    leafType: [this.data.door?.leafType ?? DoorLeafType.Single, [Validators.required]],
    model: [this.data.door?.model ?? '', [Validators.required]],
    width: [this.data.door?.width ?? this.widthOptions[0], [Validators.required, Validators.min(1)]],
    height: [this.data.door?.height ?? this.heightOptions[2], [Validators.required, Validators.min(1)]],
    color: [this.data.door?.color ?? '', [Validators.required]],
    painting: [this.data.door?.painting ?? ''],
    panelColor: [this.data.door?.panelColor ?? ''],
    hasPeephole: this.data.door?.hasPeephole ?? true,
    comment: this.data.door?.comment ?? '',
    count: [this.data.door?.count ?? 1, [Validators.required, Validators.min(1)]],
    price: [this.data.door?.price ?? null, [Validators.required, Validators.min(0)]],
  });

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать входную дверь' : 'Добавить входную дверь',
  );

  constructor() {
    bindLeadingCapitalization(this.form.controls.model, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.panelColor, this.destroyRef);

    this.form.controls.kind.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((kind) => {
      const isWelded = kind === EntranceDoorKind.Welded;
      this.isWelded.set(isWelded);
      this.syncWeldedState(isWelded);
    });

    this.syncWeldedState(this.form.controls.kind.value === EntranceDoorKind.Welded);
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
    const kind = value.kind;

    this.dialogRef.close({
      type: OrderItemType.EntranceDoor,
      kind,
      opening: value.opening,
      leafType: value.leafType,
      model: value.model.trim(),
      width: value.width,
      height: value.height,
      color: value.color.trim(),
      painting: kind === EntranceDoorKind.Welded ? value.painting.trim() || null : null,
      panelColor: value.panelColor.trim() || null,
      hasPeephole: kind === EntranceDoorKind.Welded ? value.hasPeephole : null,
      comment: value.comment.trim(),
      count: value.count,
      price: value.price,
    });
  }

  private syncWeldedState(isWelded: boolean): void {
    if (isWelded) {
      this.form.controls.painting.enable({ emitEvent: false });
      this.form.controls.hasPeephole.enable({ emitEvent: false });
      this.form.controls.painting.addValidators([Validators.required]);
      this.form.controls.hasPeephole.addValidators([Validators.required]);
    } else {
      this.form.controls.painting.disable({ emitEvent: false });
      this.form.controls.hasPeephole.disable({ emitEvent: false });
      this.form.controls.painting.removeValidators([Validators.required]);
      this.form.controls.hasPeephole.removeValidators([Validators.required]);
      this.form.controls.painting.setValue('', { emitEvent: false });
      this.form.controls.hasPeephole.setValue(true, { emitEvent: false });
    }

    this.form.controls.painting.updateValueAndValidity({ emitEvent: false });
    this.form.controls.panelColor.updateValueAndValidity({ emitEvent: false });
    this.form.controls.hasPeephole.updateValueAndValidity({ emitEvent: false });
  }
}
