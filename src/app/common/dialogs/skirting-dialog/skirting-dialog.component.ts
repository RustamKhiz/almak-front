import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CATALOG_KEYS } from '../../constants/catalog-keys';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { CatalogsService } from '../../../services/catalogs.service';
import { OrderItemType, SkirtingItem } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { bindLeadingCapitalization } from '../../utils/form-text';

export interface SkirtingDialogData {
  mode: 'create' | 'edit';
  skirting?: SkirtingItem;
  defaultColor?: string;
}

export type SkirtingDialogResult = Omit<SkirtingItem, 'id'>;

@Component({
  selector: 'app-skirting-dialog',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    CatalogAutocompleteFieldComponent,
    QuantityFieldComponent,
  ],
  templateUrl: './skirting-dialog.component.html',
  styleUrl: './skirting-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkirtingDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<SkirtingDialogComponent, SkirtingDialogResult>);
  private readonly data = inject<SkirtingDialogData>(MAT_DIALOG_DATA);

  private readonly catalogsService = inject(CatalogsService);

  protected readonly supplierOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.suppliers, SUPPLIER_OPTIONS),
    { initialValue: SUPPLIER_OPTIONS },
  );

  protected readonly form = this.fb.nonNullable.group({
    model: [this.data.skirting?.model ?? '', [Validators.required]],
    color: [this.data.skirting?.color ?? this.data.defaultColor ?? '', [Validators.required]],
    height: [this.data.skirting?.height ?? (null as number | null), [Validators.required, Validators.min(1)]],
    length: [this.data.skirting?.length ?? (null as number | null), [Validators.required, Validators.min(0.01)]],
    count: [this.data.skirting?.count ?? 1, [Validators.required, Validators.min(1)]],
    price: [this.data.skirting?.price ?? (null as number | null), [Validators.required, Validators.min(0)]],
    comment: [this.data.skirting?.comment ?? ''],
    supplier: [this.data.skirting?.supplier ?? ''],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  protected readonly totalLength = computed(() => {
    const v = this.formValue();
    return Number(((v.length ?? 0) * (v.count ?? 0)).toFixed(2));
  });

  protected readonly totalCost = computed(() => {
    return Number((this.totalLength() * (this.formValue().price ?? 0)).toFixed(2));
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать плинтус' : 'Добавить плинтус'));

  constructor() {
    bindLeadingCapitalization(this.form.controls.model, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);
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
      type: OrderItemType.Skirting,
      supplier: value.supplier.trim(),
      costPrice: this.data.skirting?.costPrice ?? 0,
      model: value.model.trim(),
      color: value.color.trim(),
      height: Math.max(1, Math.round(value.height ?? 1)),
      length: Math.max(0, value.length ?? 0),
      count: Math.max(1, Math.round(value.count)),
      price: Math.max(0, value.price ?? 0),
      comment: value.comment.trim(),
    });
  }
}
