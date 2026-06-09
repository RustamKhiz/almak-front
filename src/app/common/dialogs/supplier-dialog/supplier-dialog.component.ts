import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CATALOG_KEYS } from '../../../common/constants/catalog-keys';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
import { CatalogsService } from '../../../services/catalogs.service';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';

export interface SupplierDialogData {
  supplier: string;
}

export interface SupplierDialogResult {
  supplier: string;
}

@Component({
  selector: 'app-supplier-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, CatalogAutocompleteFieldComponent],
  templateUrl: './supplier-dialog.component.html',
  styleUrl: './supplier-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SupplierDialogComponent, SupplierDialogResult>);
  private readonly data = inject<SupplierDialogData>(MAT_DIALOG_DATA);
  private readonly catalogsService = inject(CatalogsService);

  protected readonly supplierOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.suppliers, SUPPLIER_OPTIONS),
    { initialValue: SUPPLIER_OPTIONS },
  );
  protected readonly title = computed(() => 'Изменить поставщика');
  protected readonly form = this.fb.nonNullable.group({
    supplier: this.data.supplier,
  });

  protected onCancelClick(): void {
    this.dialogRef.close();
  }

  protected onSaveClick(): void {
    const value = this.form.getRawValue();
    this.dialogRef.close({ supplier: value.supplier.trim() });
  }
}
