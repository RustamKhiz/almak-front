import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_EXTENSION_COVERING, EXTENSION_COVERING_OPTIONS } from '../../constants/molding-catalog';
import { CATALOG_KEYS } from '../../constants/catalog-keys';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { CatalogsService } from '../../../services/catalogs.service';
import { ExtensionItem, ExtensionSize, OrderItemType } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { NumberInputNoWheelDirective } from '../../directives/number-input-no-wheel.directive';
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
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    DecimalPipe,
    CatalogAutocompleteFieldComponent,
    QuantityFieldComponent,
    NumberInputNoWheelDirective,
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
    sizes: this.fb.array(this.getInitialSizes().map((size) => this.createSizeGroup(size))),
    totalArea: [this.data.extension?.totalArea ?? null, [Validators.required, Validators.min(0)]],
    price: [this.data.extension?.price ?? null, [Validators.required, Validators.min(0)]],
    comment: [this.data.extension?.comment ?? ''],
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать доборы' : 'Добавить доборы'));

  constructor() {
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);

    this.lastAutoTotalArea = this.calculateTotalArea(this.form.controls.sizes.getRawValue());

    if (this.form.controls.totalArea.value == null) {
      this.form.controls.totalArea.setValue(this.lastAutoTotalArea, { emitEvent: false });
    }

    this.form.controls.sizes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((sizes) => {
      const nextAutoTotalArea = this.calculateTotalArea(sizes);
      const currentTotalArea = this.form.controls.totalArea.value;

      if (currentTotalArea == null || currentTotalArea === this.lastAutoTotalArea) {
        this.form.controls.totalArea.setValue(nextAutoTotalArea, { emitEvent: false });
      }

      this.lastAutoTotalArea = nextAutoTotalArea;
    });
  }

  protected get sizeControls() {
    return this.form.controls.sizes.controls;
  }

  protected onCancelClick(): void {
    this.dialogRef.close();
  }

  protected onAddSizeClick(): void {
    this.form.controls.sizes.push(this.createSizeGroup({ width: 0, height: 0, quantity: 1 }));
  }

  protected onRemoveSizeClick(index: number): void {
    if (this.form.controls.sizes.length <= 1) {
      return;
    }

    this.form.controls.sizes.removeAt(index);
  }

  protected onSaveClick(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const sizes = this.normalizeSizes(value.sizes);
    const firstSize = sizes[0];
    const totalQuantity = this.calculateTotalQuantity(sizes);
    this.dialogRef.close({
      type: OrderItemType.Extension,
      supplier: value.supplier?.trim() ?? '',
      costPrice: this.data.extension?.costPrice ?? 0,
      color: value.color?.trim() ?? '',
      covering: value.covering ?? DEFAULT_EXTENSION_COVERING,
      width: firstSize.width,
      height: firstSize.height,
      sizes,
      setCount: 0,
      quantityPerSet: totalQuantity,
      totalArea: Number(value.totalArea ?? 0),
      comment: value.comment?.trim() ?? '',
      count: 1,
      price: Number(value.price ?? 0),
    });
  }

  protected getDraftTotal(): number {
    const value = this.form.getRawValue();

    return Number(value.totalArea ?? 0) * Number(value.price ?? 0);
  }

  protected calculateSizeArea(width: number | null, height: number | null, quantity: number | null): number {
    if (width == null || height == null || quantity == null) {
      return 0;
    }

    return Number(((width * height * (quantity ?? 0)) / 10000).toFixed(2));
  }

  protected getTotalQuantity(): number {
    return this.calculateTotalQuantity(this.form.controls.sizes.getRawValue());
  }

  protected getAutoTotalArea(): number {
    return this.calculateTotalArea(this.form.controls.sizes.getRawValue());
  }

  private getInitialSizes(): ExtensionSize[] {
    const sizes = this.data.extension?.sizes;
    if (sizes?.length) {
      return sizes.map((size) => ({
        width: size.width,
        height: size.height,
        quantity: size.quantity,
      }));
    }

    if (this.data.extension?.width && this.data.extension.height) {
      return [
        {
          width: this.data.extension.width,
          height: this.data.extension.height,
          quantity: this.data.extension.quantityPerSet || 1,
        },
      ];
    }

    return [{ width: 0, height: 0, quantity: 1 }];
  }

  private createSizeGroup(size: ExtensionSize) {
    return this.fb.group({
      width: [size.width || null, [Validators.required, Validators.min(1)]],
      height: [size.height || null, [Validators.required, Validators.min(1)]],
      quantity: [size.quantity || 1, [Validators.required, Validators.min(0.01)]],
    });
  }

  private normalizeSizes(sizes: readonly Partial<ExtensionSize>[]): ExtensionSize[] {
    return sizes.map((size) => ({
      width: Math.max(1, Math.round(Number(size.width ?? 1))),
      height: Math.max(1, Math.round(Number(size.height ?? 1))),
      quantity: Math.max(0, Number(size.quantity ?? 0)),
    }));
  }

  private calculateTotalQuantity(sizes: readonly Partial<ExtensionSize>[]): number {
    const total = sizes.reduce((sum, size) => sum + Number(size.quantity ?? 0), 0);

    return Number(total.toFixed(2));
  }

  private calculateTotalArea(sizes: readonly Partial<ExtensionSize>[]): number {
    const total = sizes.reduce(
      (sum, size) => sum + this.calculateSizeArea(size.width ?? null, size.height ?? null, size.quantity ?? null),
      0,
    );

    return Number(total.toFixed(2));
  }
}
