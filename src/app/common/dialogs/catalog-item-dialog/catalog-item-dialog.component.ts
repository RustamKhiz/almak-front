import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogItem } from '../../../types/catalog.types';

export interface CatalogItemDialogData {
  item?: CatalogItem;
}

@Component({
  selector: 'app-catalog-item-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './catalog-item-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogItemDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CatalogItemDialogComponent, string>);
  private readonly data = inject<CatalogItemDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data?.item;
  protected readonly valueControl = new FormControl(this.data?.item?.value ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(200)],
  });

  protected onSave(): void {
    if (this.valueControl.invalid) return;
    this.dialogRef.close(this.valueControl.value.trim());
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }
}
