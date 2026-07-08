import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CAPITAL_COVERING_OPTIONS, DEFAULT_CAPITAL_COVERING } from '../../constants/molding-catalog';
import { CATALOG_KEYS } from '../../constants/catalog-keys';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { CatalogsService } from '../../../services/catalogs.service';
import { CapitalItem, OrderItemType } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { NumberInputNoWheelDirective } from '../../directives/number-input-no-wheel.directive';
import { bindLeadingCapitalization } from '../../utils/form-text';
import { DraggableDialogTitleComponent } from '../draggable-dialog-title/draggable-dialog-title.component';

export interface CapitalDialogData {
  mode: 'create' | 'edit';
  capital?: CapitalItem;
  defaultColor?: string;
  defaultCovering?: string;
}

export type CapitalDialogResult = Omit<CapitalItem, 'id'>;

@Component({
  selector: 'app-capital-dialog',
  imports: [
    DraggableDialogTitleComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    CatalogAutocompleteFieldComponent,
    QuantityFieldComponent,
    NumberInputNoWheelDirective,
  ],
  templateUrl: './capital-dialog.component.html',
  styleUrl: './capital-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapitalDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<CapitalDialogComponent, CapitalDialogResult>);
  private readonly data = inject<CapitalDialogData>(MAT_DIALOG_DATA);

  private readonly catalogsService = inject(CatalogsService);

  protected readonly coveringOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.capitalCoverings, [...CAPITAL_COVERING_OPTIONS]),
    { initialValue: [...CAPITAL_COVERING_OPTIONS] as readonly string[] },
  );
  protected readonly supplierOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.suppliers, SUPPLIER_OPTIONS),
    { initialValue: SUPPLIER_OPTIONS },
  );

  protected readonly form = this.fb.group({
    supplier: [this.data.capital?.supplier ?? ''],
    name: [this.data.capital?.name ?? '', [Validators.required]],
    color: [this.data.capital?.color ?? this.data.defaultColor ?? '', [Validators.required]],
    covering: [
      this.data.capital?.covering ?? this.data.defaultCovering ?? DEFAULT_CAPITAL_COVERING,
      [Validators.required],
    ],
    width: [this.data.capital?.width ?? null, [Validators.required, Validators.min(1)]],
    height: [this.data.capital?.height ?? null, [Validators.required, Validators.min(1)]],
    price: [this.data.capital?.price ?? null, [Validators.required, Validators.min(0)]],
    comment: [this.data.capital?.comment ?? ''],
    count: [this.data.capital?.count ?? 1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    bindLeadingCapitalization(this.form.controls.name, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);
  }

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать капитель' : 'Добавить капитель',
  );

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
      type: OrderItemType.Capital,
      supplier: value.supplier?.trim() || '',
      costPrice: this.data.capital?.costPrice ?? 0,
      name: value.name?.trim(),
      color: value.color?.trim(),
      covering: value.covering,
      width: value.width,
      height: value.height,
      price: value.price,
      comment: value.comment?.trim(),
      count: value.count,
    });
  }
}
