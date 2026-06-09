import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Catalog } from '../../../types/catalog.types';

export interface CatalogDialogData {
  catalog?: Catalog;
}

@Component({
  selector: 'app-catalog-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './catalog-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CatalogDialogComponent, string>);
  private readonly data = inject<CatalogDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data?.catalog;
  protected readonly nameControl = new FormControl(this.data?.catalog?.name ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100)],
  });

  protected onSave(): void {
    if (this.nameControl.invalid) return;
    this.dialogRef.close(this.nameControl.value.trim());
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }
}
