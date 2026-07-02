import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_EXTENSION_COVERING, EXTENSION_COVERING_OPTIONS } from '../../constants/molding-catalog';
import { CATALOG_KEYS } from '../../constants/catalog-keys';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { CatalogsService } from '../../../services/catalogs.service';
import { ExtensionItem, OrderItemType } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { bindLeadingCapitalization } from '../../utils/form-text';
import { DraggableDialogTitleComponent } from '../draggable-dialog-title/draggable-dialog-title.component';

export interface ExtensionDialogData {
  mode: 'create' | 'edit';
  extension?: ExtensionItem;
  defaultColor?: string;
  defaultCovering?: string;
}

export type ExtensionDialogResult = Omit<ExtensionItem, 'id'>;

@Component({
  selector: 'app-extension-dialog',
  imports: [
    DraggableDialogTitleComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DecimalPipe,
    CatalogAutocompleteFieldComponent,
    QuantityFieldComponent,
  ],
  templateUrl: './extension-dialog.component.html',
  styleUrl: './extension-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<ExtensionDialogComponent, ExtensionDialogResult>);
  private readonly data = inject<ExtensionDialogData>(MAT_DIALOG_DATA);
  private lastAutoTotalArea = 0;

  private readonly catalogsService = inject(CatalogsService);

  protected readonly coveringOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.extensionCoverings, [...EXTENSION_COVERING_OPTIONS]),
    { initialValue: [...EXTENSION_COVERING_OPTIONS] as readonly string[] },
  );
  protected readonly supplierOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.suppliers, SUPPLIER_OPTIONS),
    { initialValue: SUPPLIER_OPTIONS },
  );

  protected readonly form = this.fb.group({
    supplier: [this.data.extension?.supplier ?? ''],
    color: [this.data.extension?.color ?? this.data.defaultColor ?? '', [Validators.required]],
    covering: [
      this.data.extension?.covering ?? this.data.defaultCovering ?? DEFAULT_EXTENSION_COVERING,
      [Validators.required],
    ],
    width: [this.data.extension?.width ?? null, [Validators.required, Validators.min(1)]],
    height: [this.data.extension?.height ?? null, [Validators.required, Validators.min(1)]],
    setCount: [this.normalizeSetCount(this.data.extension?.setCount ?? 0), [Validators.required, Validators.min(0)]],
    quantityPerSet: [this.data.extension?.quantityPerSet ?? 0, [Validators.required, Validators.min(0)]],
    totalArea: [this.data.extension?.totalArea ?? null, [Validators.required, Validators.min(0)]],
    price: [this.data.extension?.price ?? null, [Validators.required, Validators.min(0)]],
    comment: [this.data.extension?.comment ?? ''],
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать доборы' : 'Добавить доборы'));

  constructor() {
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);

    this.form.controls.setCount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.form.controls.quantityPerSet.setValue(Number((Number(value ?? 0) * 2.5).toFixed(1)));
    });

    this.lastAutoTotalArea = this.calculateArea(
      this.form.controls.width.value,
      this.form.controls.height.value,
      this.form.controls.quantityPerSet.value,
    );

    if (this.form.controls.totalArea.value == null) {
      this.form.controls.totalArea.setValue(this.lastAutoTotalArea, { emitEvent: false });
    }

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ width, height, quantityPerSet }) => {
      const nextAutoTotalArea = this.calculateArea(width ?? null, height ?? null, quantityPerSet ?? null);
      const currentTotalArea = this.form.controls.totalArea.value;

      if (currentTotalArea == null || currentTotalArea === this.lastAutoTotalArea) {
        this.form.controls.totalArea.setValue(nextAutoTotalArea, { emitEvent: false });
      }

      this.lastAutoTotalArea = nextAutoTotalArea;
    });
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
      type: OrderItemType.Extension,
      supplier: value.supplier?.trim() ?? '',
      costPrice: this.data.extension?.costPrice ?? 0,
      color: value.color?.trim(),
      covering: value.covering,
      width: value.width,
      height: value.height,
      setCount: this.normalizeSetCount(value.setCount),
      quantityPerSet: value.quantityPerSet,
      totalArea: value.totalArea,
      comment: value.comment?.trim(),
      count: 1,
      price: value.price,
    });
  }

  protected getDraftTotal(): number {
    const value = this.form.getRawValue();

    return Number(value.totalArea ?? 0) * Number(value.price ?? 0);
  }

  private calculateArea(width: number | null, height: number | null, quantityPerSet: number | null): number {
    if (width == null || height == null || quantityPerSet == null) {
      return 0;
    }

    return Number(((width * height * quantityPerSet) / 10000).toFixed(2));
  }

  private normalizeSetCount(value: number | null | undefined): number {
    return Math.max(0, Math.round(Number(value ?? 0)));
  }
}
