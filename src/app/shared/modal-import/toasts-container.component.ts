import { Component, TemplateRef } from '@angular/core';

import { ToastService } from './toast-service';

@Component({
  selector: 'app-toasts',
  template: `
  @for(toast of toastService.toasts;track $index){
    <ngb-toast
      [class]="toast.classname"
      [header]="toast.header"
      [autohide]="true"
      [delay]="toast.delay || 5000"
      style="white-space: pre-line; line-height: 1.35;"
      (hidden)="toastService.remove(toast)"
    >
      <ng-template [ngIf]="isTemplate(toast)" [ngIfElse]="text">
        <ng-template [ngTemplateOutlet]="toast.textOrTpl"></ng-template>
      </ng-template>

      <ng-template #text>{{ toast.textOrTpl }}</ng-template>
    </ngb-toast>
  }
  `,
  host: { '[class.ngb-toasts]': 'true' }
})
export class ToastsContainer {
  constructor(public toastService: ToastService) { }

  isTemplate(toast: { textOrTpl: any; }) { return toast.textOrTpl instanceof TemplateRef; }
}
