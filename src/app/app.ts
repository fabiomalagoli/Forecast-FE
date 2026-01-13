import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header'
import { Grid } from './grid/grid';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Grid],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Forecast-FE');
}
