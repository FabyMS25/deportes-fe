import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-basic',
  templateUrl: './basic.component.html',
  styleUrls: ['./basic.component.scss']
})
export class BasicComponent implements OnInit {

  year: number = new Date().getFullYear();

  constructor() { }

  ngOnInit(): void {
    document.documentElement.setAttribute('data-sidebar-size', 'lg');
  }

}
