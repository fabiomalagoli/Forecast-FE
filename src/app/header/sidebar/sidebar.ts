import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  @Output() selected = new EventEmitter<string>();

  onBtnClick(id: string) {
    this.selected.emit(id);
  }

}
