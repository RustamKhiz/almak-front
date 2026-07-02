import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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

export interface PlatbandDialogData {
  mode: 'create' | 'edit';
  molding?: MoldingItem;
  defaultColor?: string;
  defaultCovering?: string;
  defaultSetCount?: number;
}

export type PlatbandDialogResult = Omit<MoldingItem, 'id'>[];

@Component({
  selector: 'app-platband-dialog',
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
  templateUrl: './platband-dialog.component.html',
  styleUrl: './platband-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatbandDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<PlatbandDialogComponent, PlatbandDialogResult>);
  private readonly data = inject<PlatbandDialogData>(MAT_DIALOG_DATA);

  private readonly catalogsService = inject(CatalogsService);

  protected readonly coveringOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.moldingCoverings, [...MOLDING_COVERING_OPTIONS]),
    { initialValue: [...MOLDING_COVERING_OPTIONS] as readonly string[] },
  );
  protected readonly supplierOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.suppliers, SUPPLIER_OPTIONS),
    { initialValue: SUPPLIER_OPTIONS },
  );

  protected readonly platbandType = MoldingPlatbandType;
  protected readonly isCreateMode = this.data.mode === 'create';
  protected readonly editType = this.data.molding?.platbandType ?? MoldingPlatbandType.Oval;

  protected readonly form = this.fb.nonNullable.group({
    oval: this.fb.nonNullable.group({
      length: [this.getEditLength(MoldingPlatbandType.Oval), [Validators.min(0)]],
      price: [this.getEditPrice(MoldingPlatbandType.Oval), [Validators.min(0)]],
      setCount: [this.getEditSetCount(MoldingPlatbandType.Oval), [Validators.required, Validators.min(0)]],
      extraCount: [this.getEditExtraCount(MoldingPlatbandType.Oval), [Validators.required, Validators.min(0)]],
    }),
    smooth: this.fb.nonNullable.group({
      length: [this.getEditLength(MoldingPlatbandType.Smooth), [Validators.min(0)]],
      price: [this.getEditPrice(MoldingPlatbandType.Smooth), [Validators.min(0)]],
      setCount: [this.getEditSetCount(MoldingPlatbandType.Smooth), [Validators.required, Validators.min(0)]],
      extraCount: [this.getEditExtraCount(MoldingPlatbandType.Smooth), [Validators.required, Validators.min(0)]],
    }),
    figure: this.fb.nonNullable.group({
      model: [this.getEditModel(), []],
      length: [this.getEditLength(MoldingPlatbandType.Figure), [Validators.min(0)]],
      price: [this.getEditPrice(MoldingPlatbandType.Figure), [Validators.min(0)]],
      setCount: [this.getEditSetCount(MoldingPlatbandType.Figure), [Validators.required, Validators.min(0)]],
      extraCount: [this.getEditExtraCount(MoldingPlatbandType.Figure), [Validators.required, Validators.min(0)]],
    }),
    color: [this.data.molding?.color ?? this.data.defaultColor ?? '', [Validators.required]],
    covering: [
      this.data.molding?.covering ?? this.data.defaultCovering ?? DEFAULT_MOLDING_COVERING,
      [Validators.required],
    ],
    comment: this.data.molding?.comment ?? '',
    supplier: this.data.molding?.supplier ?? '',
  });

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать наличник' : 'Добавить наличники',
  );

  constructor() {
    bindLeadingCapitalization(this.form.controls.color, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.figure.controls.model, this.destroyRef);
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
    const { color, covering, comment, supplier } = value;
    const results: Omit<MoldingItem, 'id'>[] = [];

    if (this.isCreateMode) {
      const oval = value.oval;
      if (oval.setCount > 0 || oval.extraCount > 0 || (oval.price ?? 0) > 0) {
        results.push(
          this.buildItem(
            MoldingPlatbandType.Oval,
            null,
            oval.length,
            oval.price,
            oval.setCount,
            oval.extraCount,
            color,
            covering,
            comment,
            supplier,
          ),
        );
      }
      const smooth = value.smooth;
      if (smooth.setCount > 0 || smooth.extraCount > 0 || (smooth.price ?? 0) > 0) {
        results.push(
          this.buildItem(
            MoldingPlatbandType.Smooth,
            null,
            smooth.length,
            smooth.price,
            smooth.setCount,
            smooth.extraCount,
            color,
            covering,
            comment,
            supplier,
          ),
        );
      }
      const figure = value.figure;
      if (figure.setCount > 0 || figure.extraCount > 0 || (figure.price ?? 0) > 0) {
        results.push(
          this.buildItem(
            MoldingPlatbandType.Figure,
            figure.model || null,
            figure.length,
            figure.price,
            figure.setCount,
            figure.extraCount,
            color,
            covering,
            comment,
            supplier,
          ),
        );
      }
    } else {
      const section = this.getSectionValue(this.editType, value);
      const model = this.editType === MoldingPlatbandType.Figure ? value.figure.model || null : null;
      results.push(
        this.buildItem(
          this.editType,
          model,
          section.length,
          section.price,
          section.setCount,
          section.extraCount,
          color,
          covering,
          comment,
          supplier,
        ),
      );
    }

    this.dialogRef.close(results);
  }

  protected getTotalCount(setCount: number, extraCount: number): number {
    return Number((Number(setCount ?? 0) + Number(extraCount ?? 0)).toFixed(1));
  }

  protected getExtraTotal(price: number | null, extraCount: number): number {
    return Number(price ?? 0) * Number(extraCount ?? 0);
  }

  protected showSection(type: MoldingPlatbandType): boolean {
    return this.isCreateMode || this.editType === type;
  }

  private getEditLength(type: MoldingPlatbandType): number | null {
    return !this.isCreateMode && this.editType === type ? (this.data.molding?.platbandLength ?? null) : null;
  }

  private getEditPrice(type: MoldingPlatbandType): number | null {
    return !this.isCreateMode && this.editType === type ? (this.data.molding?.platbandPrice ?? null) : null;
  }

  private getEditSetCount(type: MoldingPlatbandType): number {
    if (!this.isCreateMode && this.editType === type) {
      return this.data.molding?.platbandSetCount ?? 0;
    }
    return this.isCreateMode && type === MoldingPlatbandType.Oval ? (this.data.defaultSetCount ?? 0) : 0;
  }

  private getEditExtraCount(type: MoldingPlatbandType): number {
    if (!this.isCreateMode && this.editType === type) {
      const total = this.data.molding?.platbandCount ?? 0;
      const set = this.data.molding?.platbandSetCount ?? 0;
      return Math.max(0, Number((total - set).toFixed(1)));
    }
    return 0;
  }

  private getEditModel(): string {
    return !this.isCreateMode && this.editType === MoldingPlatbandType.Figure
      ? (this.data.molding?.platbandFigure ?? '')
      : '';
  }

  private getSectionValue(
    type: MoldingPlatbandType,
    value: ReturnType<typeof this.form.getRawValue>,
  ): {
    length: number | null;
    price: number | null;
    setCount: number;
    extraCount: number;
  } {
    switch (type) {
      case MoldingPlatbandType.Oval:
        return value.oval;
      case MoldingPlatbandType.Smooth:
        return value.smooth;
      case MoldingPlatbandType.Figure:
        return value.figure;
    }
  }

  private buildItem(
    type: MoldingPlatbandType,
    model: string | null,
    length: number | null,
    price: number | null,
    setCount: number,
    extraCount: number,
    color: string,
    covering: string,
    comment: string,
    supplier: string,
  ): Omit<MoldingItem, 'id'> {
    const safeSetCount = Math.max(0, Number((setCount ?? 0).toFixed(1)));
    const safeExtraCount = Math.max(0, Number((extraCount ?? 0).toFixed(1)));
    return {
      type: OrderItemType.Molding,
      supplier: supplier.trim(),
      costPrice: this.data.molding?.costPrice ?? 0,
      frameLength: null,
      framePrice: 0,
      frameSetCount: 0,
      frameBoxCount: 0,
      frameThresholdCount: 0,
      frameThresholdPrice: 0,
      frameCount: 0,
      platbandType: type,
      platbandFigure: type === MoldingPlatbandType.Figure ? model : null,
      platbandLength: length == null ? null : Math.max(0, length),
      platbandPrice: price ?? 0,
      platbandSetCount: safeSetCount,
      platbandCount: Number((safeSetCount + safeExtraCount).toFixed(1)),
      platbandDeductionPrice: 0,
      rebateBarCount: 0,
      rebateBarPrice: 0,
      color: color.trim(),
      covering,
      comment: comment.trim(),
    };
  }
}
