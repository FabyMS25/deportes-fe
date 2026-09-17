import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-top-pages',
  templateUrl: './top-pages.component.html',
  styleUrls: ['./top-pages.component.scss']
})

export class TopPagesComponent implements OnInit {

  @Input() List: Array<{
    complexName?: string;
    total?: string;
    totalIncome?: string;
  }> | undefined;

  constructor() { }

  ngOnInit(): void {
  }

}
