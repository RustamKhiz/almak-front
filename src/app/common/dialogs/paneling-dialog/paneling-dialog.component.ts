import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_PANELING_COVERING,
  DEFAULT_PANELING_KIND,
  PANELING_COVERING_OPTIONS,
  PANELING_KIND_LABELS,
  PANELING_KIND_OPTIONS,
} from '../../constants/molding-catalog';
import { CATALOG_KEYS } from '../../constants/catalog-keys';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { CatalogsService } from '../../../services/catalogs.service';
import { OrderItemType, PanelingItem, PanelingSize } from '../../../types/order.types';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';
import { bindLeadingCapitalization } from '../../utils/form-text';

export interface PanelingDialogData {
  mode: 'create' | 'edit';
  paneling?: PanelingItem;
  defaultColor?: string;
  defaultCovering?: string;
}

export type PanelingDialogResult = Omit<PanelingItem, 'id'>;

@Component({
  selector: 'app-paneling-dialog',
  imports: [
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
  templateUrl: './paneling-dialog.component.html',
  styleUrl: './paneling-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelingDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<PanelingDialogComponent, PanelingDialogResult>);
  private readonly data = inject<PanelingDialogData>(MAT_DIALOG_DATA);

  private readonly catalogsService = inject(CatalogsService);

  protected readonly coveringOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.panelingCoverings, [...PANELING_COVERING_OPTIONS]),
    { initialValue: [...PANELING_COVERING_OPTIONS] as readonly string[] },
  );
  protected readonly kindOptions = PANELING_KIND_OPTIONS;
  protected readonly kindLabels = PANELING_KIND_LABELS;
  protected readonly supplierOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.suppliers, SUPPLIER_OPTIONS),
    { initialValue: SUPPLIER_OPTIONS },
  );

  protected readonly form = this.fb.group({
    supplier: [this.data.paneling?.supplier ?? ''],
    color: [this.data.paneling?.color ?? this.data.defaultColor ?? '', [Validators.required]],
    count: [this.data.paneling?.count ?? 1, [Validators.required, Validators.min(1)]],
    price: [this.data.paneling?.price ?? null, [Validators.required, Validators.min(0)]],
    covering: [
      this.data.paneling?.covering ?? this.data.defaultCovering ?? DEFAULT_PANELING_COVERING,
      [Validators.required],
    ],
    kind: [this.data.paneling?.kind ?? DEFAULT_PANELING_KIND, [Validators.required]],
    sizes: this.fb.array(this.getInitialSizes().map((size) => this.createSizeGroup(size))),
    comment: [this.data.paneling?.comment ?? ''],
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать обшивку' : 'Добавить обшивку'));

  constructor() {
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);

    this.syncSizeControls(this.form.controls.count.value ?? 1);

    this.form.controls.count.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((count) => {
      this.syncSizeControls(count ?? 1);
    });
  }

  protected get sizeControls() {
    return this.form.controls.sizes.controls;
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
    const sizes = value.sizes.map((size) => ({
      width: Number(size.width),
      height: Number(size.height),
    }));
    const firstSize = sizes[0];

    this.dialogRef.close({
      type: OrderItemType.Paneling,
      supplier: value.supplier?.trim() || '',
      costPrice: this.data.paneling?.costPrice ?? 0,
      color: value.color!.trim(),
      size: this.formatSizes(sizes),
      count: value.count!,
      price: value.price!,
      covering: value.covering!,
      kind: value.kind!,
      width: firstSize.width,
      height: firstSize.height,
      sizes,
      totalArea: this.calculateTotalArea(sizes),
      comment: value.comment?.trim() || '',
    });
  }

  protected calculateSizeArea(width: number | null, height: number | null): number {
    if (width == null || height == null) {
      return 0;
    }

    return Number(((width * height) / 10000).toFixed(2));
  }

  protected getTotalArea(): number {
    return this.calculateTotalArea(this.form.controls.sizes.getRawValue());
  }

  protected getDraftTotal(): number {
    return this.getTotalArea() * Number(this.form.controls.price.value ?? 0);
  }

  private getInitialSizes(): PanelingSize[] {
    const sizes = this.data.paneling?.sizes;
    if (sizes?.length) {
      return sizes.map((size) => ({ width: size.width, height: size.height }));
    }

    if (this.data.paneling?.width && this.data.paneling.height) {
      return [{ width: this.data.paneling.width, height: this.data.paneling.height }];
    }

    return [{ width: 0, height: 0 }];
  }

  private createSizeGroup(size: PanelingSize) {
    return this.fb.group({
      width: [size.width || null, [Validators.required, Validators.min(1)]],
      height: [size.height || null, [Validators.required, Validators.min(1)]],
    });
  }

  private syncSizeControls(count: number): void {
    const normalizedCount = Math.max(1, Math.floor(Number(count) || 1));
    const sizes = this.form.controls.sizes;

    while (sizes.length < normalizedCount) {
      sizes.push(this.createSizeGroup({ width: 0, height: 0 }));
    }

    while (sizes.length > normalizedCount) {
      sizes.removeAt(sizes.length - 1);
    }
  }

  private calculateTotalArea(sizes: readonly Partial<PanelingSize>[]): number {
    const total = sizes.reduce((sum, size) => sum + this.calculateSizeArea(size.width ?? null, size.height ?? null), 0);

    return Number(total.toFixed(2));
  }

  private formatSizes(sizes: readonly PanelingSize[]): string {
    return sizes.map((size) => `${size.width}x${size.height}`).join('; ');
  }
}
