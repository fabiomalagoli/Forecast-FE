import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-input',
  imports: [FormsModule, CommonModule],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class TextInputComponent {
}
