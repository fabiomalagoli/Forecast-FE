import { Component } from '@angular/core';
import { Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'app-header',
  imports: [Sidebar],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {

}
