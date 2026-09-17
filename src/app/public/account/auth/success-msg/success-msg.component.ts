import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-success-msg',
  templateUrl: './success-msg.component.html',
  styleUrls: ['./success-msg.component.scss']
})

export class SuccessMsgComponent implements OnInit {
  year: number = new Date().getFullYear();

  constructor() { }

  ngOnInit(): void {
  }

}
