import { Injectable, TemplateRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';
import type { LoginEvent } from 'src/app/core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: any[] = [];

  constructor(private translate: TranslateService) {}

  showLoginStatus(event: LoginEvent): void {
    this.translate.get('SESSION_NOTICE').pipe(take(1)).subscribe(messages => {
      const authenticated = event.ruatStatus === true;
      const roleMessage = this.getRoleMessage(event, messages);
      const body = authenticated
        ? [roleMessage, messages.RUAT_VERIFIED].join('\n')
        : [roleMessage, event.ruatMessage || messages.RUAT_UNCONFIRMED, messages.RUAT_LIMITATIONS].join('\n');
      this.show(body, {
        header: messages.WELCOME,
        classname: authenticated ? 'bg-success text-light' : 'bg-warning text-dark',
        delay: authenticated ? 18000 : 30000,
        replaceKey: 'system-status'
      });
    });
  }

  private getRoleMessage(event: LoginEvent, messages: any): string {
    switch (event.message) {
      case 'welcome_admin':
        return messages.ROLE_ADMIN;
      case 'welcome_staff':
        return messages.ROLE_STAFF;
      case 'welcome_contribuyente':
        return messages.ROLE_CONTRIBUTOR;
      default:
        return messages.SESSION_READY;
    }
  }

  show(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    if (options.replaceKey) {
      this.toasts = this.toasts.filter(t => t.replaceKey !== options.replaceKey);
    }
    this.toasts.push({ textOrTpl, ...options });
  }

  remove(toast: any) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }
}
