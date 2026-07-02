import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Catalog } from '../../../types/catalog.types';
import { DraggableDialogTitleComponent } from '../draggable-dialog-title/draggable-dialog-title.component';

export interface CatalogDialogData {
  catalog?: Catalog;
}

export interface CatalogDialogResult {
  name: string;
  key: string | null;
}

@Component({
  selector: 'app-catalog-dialog',
  imports: [
    DraggableDialogTitleComponent,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './catalog-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CatalogDialogComponent, CatalogDialogResult>);
  private readonly data = inject<CatalogDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data?.catalog;
  protected readonly nameControl = new FormControl(this.data?.catalog?.name ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100)],
  });
  protected readonly keyControl = new FormControl(this.data?.catalog?.key ?? '', {
    nonNullable: true,
    validators: [Validators.maxLength(100), Validators.pattern(/^[a-z0-9_]*$/)],
  });

  protected onSave(): void {
    if (this.nameControl.invalid || this.keyControl.invalid) return;
    this.dialogRef.close({
      name: this.nameControl.value.trim(),
      key: this.keyControl.value.trim() || null,
    });
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }
}
