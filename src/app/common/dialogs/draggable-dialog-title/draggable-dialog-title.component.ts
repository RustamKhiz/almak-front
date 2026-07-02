import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-draggable-dialog-title',
  imports: [CdkDrag, CdkDragHandle, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './draggable-dialog-title.component.html',
  styleUrl: './draggable-dialog-title.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraggableDialogTitleComponent {}
