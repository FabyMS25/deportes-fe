import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  public readonly languages: string[] = ['es', 'en'];
  public readonly defaultLanguage = 'es';

  constructor(public translate: TranslateService, private cookieService: CookieService) {

    let selectedLanguage: string;

    this.translate.addLangs(this.languages);
    this.translate.setDefaultLang(this.defaultLanguage);

    if (this.cookieService.check('lang')) {
      selectedLanguage = this.cookieService.get('lang');
    } else {
      selectedLanguage = this.translate.getBrowserLang() ?? this.defaultLanguage;
    }

    this.setLanguage(selectedLanguage, false);
  }

  public setLanguage(language: string, persist = true): void {
    const supportedLanguage = this.languages.includes(language)
      ? language
      : this.defaultLanguage;

    this.translate.use(supportedLanguage);
    if (persist) {
      this.cookieService.set('lang', supportedLanguage);
    }
  }

}
