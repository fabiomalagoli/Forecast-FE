import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { AppButton } from '../../shared/button/button';

@Component({
  selector: 'app-sidebar',
  imports: [AppButton],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  @Output() selected = new EventEmitter<string>();

  onBtnClick(id: string) {
    this.selected.emit(id);
  }

}
