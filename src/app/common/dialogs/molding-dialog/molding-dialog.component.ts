import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_MOLDING_COVERING,
  DEFAULT_MOLDING_PLATBAND_TYPE,
  MOLDING_COVERING_LABELS,
  MOLDING_COVERING_OPTIONS,
  MOLDING_PLATBAND_TYPE_LABELS,
  MOLDING_PLATBAND_TYPE_OPTIONS,
} from '../../constants/molding-catalog';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { MoldingCovering, MoldingItem, MoldingPlatbandType, OrderItemType } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { bindLeadingCapitalization } from '../../utils/form-text';

export interface MoldingDialogData {
  mode: 'create' | 'edit';
  molding?: MoldingItem;
  defaultColor?: string;
  defaultCovering?: MoldingCovering;
}

export type MoldingDialogResult = Omit<MoldingItem, 'id'>;

@Component({
  selector: 'app-molding-dialog',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    CatalogAutocompleteFieldComponent,
    QuantityFieldComponent,
  ],
  templateUrl: './molding-dialog.component.html',
  styleUrl: './molding-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoldingDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<MoldingDialogComponent, MoldingDialogResult>);
  private readonly data = inject<MoldingDialogData>(MAT_DIALOG_DATA);

  protected readonly platbandTypeOptions = MOLDING_PLATBAND_TYPE_OPTIONS;
  protected readonly platbandTypeLabels = MOLDING_PLATBAND_TYPE_LABELS;
  protected readonly coveringOptions = MOLDING_COVERING_OPTIONS;
  protected readonly coveringLabels = MOLDING_COVERING_LABELS;
  protected readonly supplierOptions = SUPPLIER_OPTIONS;
  protected readonly platbandType = MoldingPlatbandType;
  protected readonly isFigureType = signal(this.data.molding?.platbandType === MoldingPlatbandType.Figure);

  protected readonly form = this.fb.nonNullable.group({
    supplier: this.data.molding?.supplier ?? '',
    frameLength: [this.data.molding?.frameLength ?? null, [Validators.min(0)]],
    framePrice: [this.data.molding?.framePrice ?? null, [Validators.min(0)]],
    frameSetCount: [
      this.normalizeIntegerCount(
        this.data.molding?.frameSetCount ?? Math.floor((this.data.molding?.frameCount ?? 2.5) / 2.5),
      ),
      [Validators.required, Validators.min(0)],
    ],
    frameBoxCount: [
      this.normalizeIntegerCount(this.data.molding?.frameBoxCount ?? 0),
      [Validators.required, Validators.min(0)],
    ],
    frameThresholdCount: [0, [Validators.required, Validators.min(0)]],
    frameThresholdPrice: [0, [Validators.required, Validators.min(0)]],
    frameCount: [this.data.molding?.frameCount ?? 2.5, [Validators.required, Validators.min(0)]],
    platbandType: [this.data.molding?.platbandType ?? DEFAULT_MOLDING_PLATBAND_TYPE, [Validators.required]],
    platbandFigure: this.data.molding?.platbandFigure ?? '',
    platbandLength: [this.data.molding?.platbandLength ?? null, [Validators.min(0)]],
    platbandPrice: [this.data.molding?.platbandPrice ?? null, [Validators.min(0)]],
    platbandSetCount: [
      this.normalizeIntegerCount(
        this.data.molding?.platbandSetCount ?? Math.floor((this.data.molding?.platbandCount ?? 2.5) / 2.5),
      ),
      [Validators.required, Validators.min(0)],
    ],
    platbandCount: [this.getInitialPlatbandAdditionalCount(), [Validators.required, Validators.min(0)]],
    platbandDeductionPrice: [this.data.molding?.platbandDeductionPrice ?? 0, [Validators.min(0)]],
    rebateBarCount: [this.data.molding?.rebateBarCount ?? 0, [Validators.required, Validators.min(0)]],
    rebateBarPrice: [this.data.molding?.rebateBarPrice ?? null, [Validators.min(0)]],
    color: [this.data.molding?.color ?? this.data.defaultColor ?? '', [Validators.required]],
    covering: [
      this.data.molding?.covering ?? this.data.defaultCovering ?? DEFAULT_MOLDING_COVERING,
      [Validators.required],
    ],
    comment: this.data.molding?.comment ?? '',
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать погонаж' : 'Добавить погонаж'));

  constructor() {
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.platbandFigure, this.destroyRef);

    this.form.controls.frameSetCount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateFrameCount();
    });

    this.form.controls.frameBoxCount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateFrameCount();
    });

    this.form.controls.platbandType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const isFigure = value === MoldingPlatbandType.Figure;
      this.isFigureType.set(isFigure);
      this.syncFigureState(isFigure);
    });

    this.syncFigureState(this.form.controls.platbandType.value === MoldingPlatbandType.Figure);
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
      type: OrderItemType.Molding,
      supplier: value.supplier.trim(),
      frameLength: value.frameLength == null ? null : Math.max(0, value.frameLength),
      framePrice: value.framePrice ?? 0,
      frameSetCount: this.normalizeIntegerCount(value.frameSetCount),
      frameBoxCount: this.normalizeIntegerCount(value.frameBoxCount),
      frameThresholdCount: 0,
      frameThresholdPrice: 0,
      frameCount: this.calculateFrameCount(value.frameSetCount, value.frameBoxCount),
      platbandType: value.platbandType,
      platbandFigure: value.platbandType === MoldingPlatbandType.Figure ? value.platbandFigure.trim() || null : null,
      platbandLength: value.platbandLength == null ? null : Math.max(0, value.platbandLength),
      platbandPrice: value.platbandPrice ?? 0,
      platbandSetCount: this.normalizeIntegerCount(value.platbandSetCount),
      platbandCount: this.getPlatbandCount(),
      platbandDeductionPrice:
        value.platbandType === MoldingPlatbandType.Figure ? Number(value.platbandDeductionPrice ?? 0) : 0,
      rebateBarCount: value.rebateBarCount,
      rebateBarPrice: value.rebateBarPrice ?? 0,
      color: value.color.trim(),
      covering: value.covering,
      comment: value.comment.trim(),
    });
  }

  private syncFigureState(isFigure: boolean): void {
    if (isFigure) {
      this.form.controls.platbandFigure.enable({ emitEvent: false });
      this.form.controls.platbandFigure.addValidators([Validators.required]);
    } else {
      this.form.controls.platbandFigure.disable({ emitEvent: false });
      this.form.controls.platbandFigure.removeValidators([Validators.required]);
      this.form.controls.platbandFigure.setValue('', { emitEvent: false });
    }

    this.form.controls.platbandFigure.updateValueAndValidity({ emitEvent: false });
  }

  protected getFrameCount(): number {
    return this.calculateFrameCount(this.form.controls.frameSetCount.value, this.form.controls.frameBoxCount.value);
  }

  private updateFrameCount(): void {
    this.form.controls.frameCount.setValue(this.getFrameCount(), { emitEvent: false });
  }

  private calculateFrameCount(setCount: number | null | undefined, boxCount: number | null | undefined): number {
    return Number((this.normalizeIntegerCount(setCount) * 2.5 + this.normalizeIntegerCount(boxCount)).toFixed(1));
  }

  protected getFrameTotal(): number {
    return (
      Number(this.form.controls.framePrice.value ?? 0) *
      this.normalizeIntegerCount(this.form.controls.frameBoxCount.value)
    );
  }

  protected getPlatbandBaseTotal(): number {
    return Number(this.form.controls.platbandPrice.value ?? 0) * this.getPlatbandCount();
  }

  protected getPlatbandDeductionTotal(): number {
    if (this.form.controls.platbandType.value !== MoldingPlatbandType.Figure) {
      return 0;
    }

    return Number(this.form.controls.platbandDeductionPrice.value ?? 0) * this.getPlatbandCount();
  }

  protected getPlatbandTotal(): number {
    return this.getPlatbandBaseTotal() - this.getPlatbandDeductionTotal();
  }

  protected getRebateBarTotal(): number {
    return Number(this.form.controls.rebateBarPrice.value ?? 0) * Number(this.form.controls.rebateBarCount.value ?? 0);
  }

  protected getDraftTotal(): number {
    return this.getFrameTotal() + this.getPlatbandTotal() + this.getRebateBarTotal();
  }

  protected getPlatbandCount(): number {
    return Number(
      (
        this.normalizeIntegerCount(this.form.controls.platbandSetCount.value) * 2.5 +
        Number(this.form.controls.platbandCount.value ?? 0)
      ).toFixed(1),
    );
  }

  private getInitialPlatbandAdditionalCount(): number {
    const totalCount = this.data.molding?.platbandCount;
    if (totalCount == null) {
      return 0;
    }

    const setCount = this.data.molding?.platbandSetCount ?? Math.floor((this.data.molding?.platbandCount ?? 2.5) / 2.5);
    return Math.max(0, Number((totalCount - this.normalizeIntegerCount(setCount) * 2.5).toFixed(1)));
  }

  private normalizeIntegerCount(value: number | null | undefined): number {
    return Math.max(0, Math.round(Number(value ?? 0)));
  }
}
