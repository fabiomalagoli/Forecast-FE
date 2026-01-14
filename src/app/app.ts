import { Component, Input, signal } from '@angular/core';
import { Header } from './header/header'
import { Grid } from './grid/grid';
import { Progetti } from './progetti/progetti';
import { Clienti } from './clienti/clienti';
import { Sidebar } from './header/sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { required } from '@angular/forms/signals';

@Component({
  selector: 'app-root',
  imports: [Header, Grid, Clienti, Progetti, Sidebar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Forecast-FE');
  @Input({required: true}) selectedPage: string = 'Home';

  OnSidebarIdSelected(pageId: string){
    this.selectedPage = pageId;
    console.log('ID selezionato:', pageId);
  }



}
