import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-terms-condition-out',
  templateUrl: './terms-condition.component.html',
  styleUrls: ['./terms-condition.component.scss']
})
export class TermsConditionComponent implements OnInit {

  year: number = new Date().getFullYear();
  title = 'Terminos & Condiciones de Uso'

  constructor() { }

  ngOnInit(): void {
    document.documentElement.setAttribute('data-sidebar-size', 'lg');
  }
}
