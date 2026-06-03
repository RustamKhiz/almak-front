import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SUPPLIER_OPTIONS } from '../../constants/reference-catalogs';
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

  protected readonly supplierOptions = SUPPLIER_OPTIONS;
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
