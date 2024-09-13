import { Component, OnInit } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-faqs',
  templateUrl: './faqs.component.html',
  styleUrls: ['./faqs.component.scss'],
  standalone: true,
  imports: [
    NgbModule,
    SharedModule,
  ],
})

/**
 * Faqs Component
 */
export class FaqsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
