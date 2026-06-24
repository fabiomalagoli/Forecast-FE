import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDeleteDialogData {
  name: string;
  entityLabel?: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: 'confirm-delete-dialog.html',
  styleUrl: 'confirm-delete-dialog.scss'
})
export class ConfirmDeleteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialogComponent>);
  readonly data = inject<ConfirmDeleteDialogData>(MAT_DIALOG_DATA);

  get entityLabel(): string {
    return this.data.entityLabel ?? 'l\'elemento';
  }
}
