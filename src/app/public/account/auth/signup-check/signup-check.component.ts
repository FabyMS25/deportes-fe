import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserDocType} from 'src/app/core/constants/UserData';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { UserDataService } from '../signup/user-data.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

@Component({
  selector: 'app-signup-check',
  templateUrl: './signup-check.component.html',
  styleUrl: './signup-check.component.scss'
})
export class SignupCheckComponent {

  SignupForm!: UntypedFormGroup;
  submitted = false;
  year: number = new Date().getFullYear();
  
  identityTypes = UserDocType
  cityAcronym= CityAcronym

  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private ruatService: RuatRequestsService,
    private userDataService: UserDataService,
    private contribuyentesService: ContribuyentesService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
     this.SignupForm = this.formBuilder.group({
      tipoDocumento:['', [Validators.required]],
      numeroDocumento:['', [Validators.required]],
      expedido:[''],
    }); 
  }

  get f() { return this.SignupForm.controls; }
  
  /**
   * Form submit
   */
  async onSubmit() {
    this.submitted = true;  
    if (this.SignupForm.valid) {
      this.SignupForm.enable();
      let datos = {
        tipoDocumento: this.SignupForm.value.tipoDocumento,
        numeroDocumento: this.SignupForm.value.numeroDocumento,
        expedido: this.SignupForm.value.expedido,
      };
      await this.searchTaxpayer(datos);
    } else {
      this.notify(this.translate.instant('SIGNUP_CHECK.INVALID_FORM'), 'error');
      Object.keys(this.SignupForm.controls).forEach(key => {
        const control = this.SignupForm.get(key);
        control?.markAsTouched();
      });
    }
  }  

  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 5000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }
  /* API REQUESTS */ 
  private searchUser(value: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.publicExists({ numeroDocumento: value }).subscribe({
        next: result => resolve(result.numeroDocumento === true),
        error: (error) => {
          reject(error);
        }
      });
    });
  }
  /* API RUAT Services */
  ruatData: any;
  async searchTaxpayer(data: any) {
    this.ruatService.getTaxpayerByIdentityNumber(data.numeroDocumento, data.tipoDocumento, data.expedido).subscribe({
      next: (response: any) => {
          if (this.ruatService.canContinue(response)) {
            this.ruatData = this.ruatService.getResponseData(response);
            this.searchUser(data.numeroDocumento)
              .then((exist) => {
                if (exist) {
                  this.notify(this.translate.instant('SIGNUP_CHECK.ALREADY_REGISTERED'), 'error');
                } else {
                  this.userDataService.setTemporaryUserData(this.ruatData);
                  this.notify(this.translate.instant('SIGNUP_CHECK.RUAT_DATA_FOUND'), 'success');
                  this.router.navigate(['/auth/signup'], { queryParams: { userExist: true } });
                }
              })
              .catch(error => {
                console.error('Error in searchUsers:', error);
              });
          } else {
            this.notify(`${this.ruatService.getResponseMessage(response, this.translate.instant('SIGNUP_CHECK.NO_RUAT_DATA'))} ${this.translate.instant('SIGNUP_CHECK.CONTINUE_REGISTRATION')}`, 'success');
            this.router.navigate(['/auth/signup'], { queryParams: { userExist: false } });          
          }
      },
      error: (error: any) => {
        this.notify(
          this.ruatService.getResponseMessage(
            error,
            this.translate.instant('SIGNUP_CHECK.RUAT_UNAVAILABLE')
          ),
          'error'
        );
      }
    });
  }
}
