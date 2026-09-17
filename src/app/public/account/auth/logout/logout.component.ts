import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss']
})

export class LogoutComponent implements OnInit {
  year: number = new Date().getFullYear();

  constructor() { }

  ngOnInit(): void {
  }

}
