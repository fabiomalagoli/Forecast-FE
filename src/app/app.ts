import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header'
import { Grid } from './grid/grid';
import { Progetti } from './progetti/progetti';
import { Clienti } from './clienti/clienti';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Grid, Clienti, Progetti],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Forecast-FE');
  selectedPage = 'Home';
}
