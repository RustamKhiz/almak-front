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
import { MoldingItem, MoldingPlatbandType, OrderItemType } from '../../../types/order.types';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';

export interface MoldingDialogData {
  mode: 'create' | 'edit';
  molding?: MoldingItem;
}

export type MoldingDialogResult = Omit<MoldingItem, 'id'>;

@Component({
  selector: 'app-molding-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
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
  protected readonly platbandType = MoldingPlatbandType;
  protected readonly isFigureType = signal(this.data.molding?.platbandType === MoldingPlatbandType.Figure);

  protected readonly form = this.fb.group({
    frameLength: [this.data.molding?.frameLength ?? (null as number | null), [Validators.min(0)]],
    framePrice: [this.data.molding?.framePrice ?? 0, [Validators.required, Validators.min(0)]],
    frameCount: [this.data.molding?.frameCount ?? 1, [Validators.required, Validators.min(1)]],
    platbandType: [this.data.molding?.platbandType ?? DEFAULT_MOLDING_PLATBAND_TYPE, [Validators.required]],
    platbandFigure: [this.data.molding?.platbandFigure ?? ''],
    platbandLength: [this.data.molding?.platbandLength ?? (null as number | null), [Validators.min(0)]],
    platbandPrice: [this.data.molding?.platbandPrice ?? 0, [Validators.required, Validators.min(0)]],
    platbandCount: [this.data.molding?.platbandCount ?? 1, [Validators.required, Validators.min(1)]],
    rebateBarCount: [this.data.molding?.rebateBarCount ?? 0, [Validators.required, Validators.min(0)]],
    color: [this.data.molding?.color ?? '', [Validators.required]],
    covering: [this.data.molding?.covering ?? DEFAULT_MOLDING_COVERING, [Validators.required]],
    comment: [this.data.molding?.comment ?? ''],
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать погонаж' : 'Добавить погонаж'));

  constructor() {
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
      frameLength: this.normalizeOptionalNumber(value.frameLength),
      framePrice: Number(value.framePrice ?? 0),
      frameCount: Math.max(1, Number(value.frameCount ?? 1)),
      platbandType: value.platbandType ?? DEFAULT_MOLDING_PLATBAND_TYPE,
      platbandFigure:
        value.platbandType === MoldingPlatbandType.Figure ? this.normalizeText(value.platbandFigure) : null,
      platbandLength: this.normalizeOptionalNumber(value.platbandLength),
      platbandPrice: Number(value.platbandPrice ?? 0),
      platbandCount: Math.max(1, Number(value.platbandCount ?? 1)),
      rebateBarCount: Math.max(0, Number(value.rebateBarCount ?? 0)),
      color: value.color?.trim() ?? '',
      covering: value.covering ?? DEFAULT_MOLDING_COVERING,
      comment: value.comment?.trim() ?? '',
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

  private normalizeOptionalNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = Number(value);
    return Number.isFinite(normalized) ? Math.max(0, normalized) : null;
  }

  private normalizeText(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized ? normalized : null;
  }
}
