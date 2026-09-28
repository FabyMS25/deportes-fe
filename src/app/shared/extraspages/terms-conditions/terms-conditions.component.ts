import { CommonModule, Location } from '@angular/common';
import { Component, Input, Optional } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class TermsConditionsComponent {
  @Input() buttons = true;
  returnUnavailable = false;
  constructor(private location: Location, @Optional() private activeModal: NgbActiveModal) {}
  goBack(): void {
    if (this.activeModal) {
      this.activeModal.close();
      return;
    }
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.returnUnavailable = true;
  }
}
