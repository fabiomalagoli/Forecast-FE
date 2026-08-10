import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const MODULES: any[] = [
  MatButtonModule,
  MatIconModule,
  MatFormFieldModule,
  FormsModule,
  ReactiveFormsModule,
];

@Component({
  selector: 'app-contact-administrator',
  standalone: true,
  imports: [MODULES],
  templateUrl: './contact-administrator.component.html',
  styleUrl: './contact-administrator.component.scss',
})

export class ContactAdministratorComponent {

}