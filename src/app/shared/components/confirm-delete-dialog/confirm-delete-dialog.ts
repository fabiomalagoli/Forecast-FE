import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AppButtonComponent } from '../../../shared/button/button';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: 'confirm-delete-dialog.html',
  styleUrl: 'confirm-delete-dialog.scss'
})
export class ConfirmDeleteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialogComponent>);
  // Riceve i dati passati dal componente padre
  readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);
}