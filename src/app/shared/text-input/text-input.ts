import { CommonModule } from '@angular/common';
import { Component, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Project } from '../../projects/project/project.model';

@Component({
  selector: 'app-text-input',
  imports: [FormsModule, CommonModule],
  templateUrl: './text-input.html',
  styleUrl: './text-input.css',
})
export class TextInputComponent {

}
