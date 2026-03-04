import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmDialogViewData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

const DEFAULT_CONFIRM_DIALOG_DATA: ConfirmDialogViewData = {
  title: 'Подтверждение',
  message: 'Вы уверены, что хотите продолжить?',
  confirmText: 'Да',
  cancelText: 'Нет',
};

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
  private readonly inputData = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  protected readonly data: ConfirmDialogViewData = {
    title: this.inputData?.title?.trim() || DEFAULT_CONFIRM_DIALOG_DATA.title,
    message: this.inputData?.message?.trim() || DEFAULT_CONFIRM_DIALOG_DATA.message,
    confirmText: this.inputData?.confirmText?.trim() || DEFAULT_CONFIRM_DIALOG_DATA.confirmText,
    cancelText: this.inputData?.cancelText?.trim() || DEFAULT_CONFIRM_DIALOG_DATA.cancelText,
  };

  protected onConfirmClick(): void {
    this.dialogRef.close(true);
  }

  protected onCancelClick(): void {
    this.dialogRef.close(false);
  }
}
