import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_MOLDING_COVERING, MOLDING_COVERING_OPTIONS } from '../../constants/molding-catalog';
import { CATALOG_KEYS } from '../../constants/catalog-keys';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { CatalogsService } from '../../../services/catalogs.service';
import { MoldingItem, MoldingPlatbandType, OrderItemType } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { bindLeadingCapitalization } from '../../utils/form-text';
import { DraggableDialogTitleComponent } from '../draggable-dialog-title/draggable-dialog-title.component';

export interface MoldingDialogData {
  mode: 'create' | 'edit';
  molding?: MoldingItem;
  defaultColor?: string;
  defaultCovering?: string;
  defaultFrameSetCount?: number;
}

export type MoldingDialogResult = Omit<MoldingItem, 'id'>;

@Component({
  selector: 'app-molding-dialog',
  imports: [
    DraggableDialogTitleComponent,
    ReactiveFormsModule,
    DecimalPipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
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

  private readonly catalogsService = inject(CatalogsService);

  protected readonly coveringOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.moldingCoverings, [...MOLDING_COVERING_OPTIONS]),
    { initialValue: [...MOLDING_COVERING_OPTIONS] as readonly string[] },
  );
  protected readonly supplierOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.suppliers, SUPPLIER_OPTIONS),
    { initialValue: SUPPLIER_OPTIONS },
  );

  protected readonly form = this.fb.nonNullable.group({
    supplier: this.data.molding?.supplier ?? '',
    frameLength: [this.data.molding?.frameLength ?? null, [Validators.min(0)]],
    framePrice: [this.data.molding?.framePrice ?? null, [Validators.min(0)]],
    frameSetCount: [
      this.data.mode === 'edit' && this.data.molding
        ? Math.max(0, Number(((this.data.molding.frameCount ?? 0) - (this.data.molding.frameBoxCount ?? 0)).toFixed(1)))
        : (this.data.defaultFrameSetCount ?? 0),
      [Validators.required, Validators.min(0)],
    ],
    frameBoxCount: [this.data.molding?.frameBoxCount ?? 0, [Validators.required, Validators.min(0)]],
    frameCount: [this.data.molding?.frameCount ?? 0, [Validators.required, Validators.min(0)]],
    color: [this.data.molding?.color ?? this.data.defaultColor ?? '', [Validators.required]],
    covering: [
      this.data.molding?.covering ?? this.data.defaultCovering ?? DEFAULT_MOLDING_COVERING,
      [Validators.required],
    ],
    comment: this.data.molding?.comment ?? '',
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать коробки' : 'Добавить коробки'));

  constructor() {
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);

    this.form.controls.frameSetCount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateFrameCount();
    });
    this.form.controls.frameBoxCount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateFrameCount();
    });

    this.updateFrameCount();
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
      costPrice: this.data.molding?.costPrice ?? 0,
      frameLength: value.frameLength == null ? null : Math.max(0, value.frameLength),
      framePrice: value.framePrice ?? 0,
      frameSetCount: Math.max(0, Number((value.frameSetCount ?? 0).toFixed(1))),
      frameBoxCount: Math.max(0, Number((value.frameBoxCount ?? 0).toFixed(1))),
      frameThresholdCount: 0,
      frameThresholdPrice: 0,
      frameCount: this.calculateFrameCount(value.frameSetCount, value.frameBoxCount),
      platbandType: MoldingPlatbandType.Oval,
      platbandFigure: null,
      platbandLength: null,
      platbandPrice: 0,
      platbandSetCount: 0,
      platbandCount: 0,
      platbandDeductionPrice: 0,
      rebateBarCount: 0,
      rebateBarPrice: 0,
      color: value.color.trim(),
      covering: value.covering,
      comment: value.comment.trim(),
    });
  }

  protected getFrameCount(): number {
    return this.calculateFrameCount(this.form.controls.frameSetCount.value, this.form.controls.frameBoxCount.value);
  }

  protected getFrameTotal(): number {
    return Number(this.form.controls.framePrice.value ?? 0) * Number(this.form.controls.frameBoxCount.value ?? 0);
  }

  private updateFrameCount(): void {
    this.form.controls.frameCount.setValue(this.getFrameCount(), { emitEvent: false });
  }

  private calculateFrameCount(setCount: number | null | undefined, boxCount: number | null | undefined): number {
    return Number((Number(setCount ?? 0) + Number(boxCount ?? 0)).toFixed(1));
  }
}
