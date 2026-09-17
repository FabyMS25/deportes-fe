import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgOtpInputComponent } from 'ng-otp-input'; 

import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';
import { UserDataService } from '../signup/user-data.service';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { environment } from 'src/environments/environment';
import { EstadoRuat, EstadoUsuario } from 'src/app/core/constants/Estados';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-twostep',
  templateUrl: './twostep.component.html',
  styleUrls: ['./twostep.component.scss']
})
export class TwoStepComponent implements OnInit {

  year: number = new Date().getFullYear();
  @ViewChild(NgOtpInputComponent, { static: false }) otpComponent?: NgOtpInputComponent;

  userData: any;
  config = {
    allowNumbersOnly: true,
    length: 4,
    isPasswordInput: false,
    disableAutoFocus: false,
    placeholder: '',
    inputStyles: {
      'width': '80px',
      'height': '50px'
    }
  };




  constructor( 
    private router: Router, 
    private route: ActivatedRoute,
    private userDataService: UserDataService,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService,
    private translate: TranslateService,
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const username = params['username'];
      this.userData = this.userDataService.getTemporaryUserData();
    });
  }

  async confirmar() {
    const enteredOtp = this.otpComponent?.currentVal;
    if (!enteredOtp || enteredOtp.length !== this.config.length) {
      this.notify(this.translate.instant('TWO_STEP.CODE_REQUIRED'), 'error');
      return;
    }
    if (enteredOtp !== this.userData.verificationCode) {
      this.notify(this.translate.instant('TWO_STEP.CODE_INVALID'), 'error');
      this.otpComponent?.setValue('');
      return;
    }
    try {
      if (!this.userData.verificadoRuat) {

        
        const ruatData = { ...this.userData };
        if (ruatData.fechaNacimiento) {
          const date = new Date(ruatData.fechaNacimiento);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          ruatData.fechaNacimiento = `${day}/${month}/${year}`;
        }        
        const ruatResp = await this.registerTaxpayer(ruatData);
        if (!ruatResp) {
          this.notify(this.translate.instant('TWO_STEP.RUAT_REGISTRATION_FAILED'), 'error');
          return;
        }
        this.userData.estadoUsuario = EstadoUsuario.ACTIVO;
        this.userData.estadoRuat = EstadoRuat.ACTIVO;
        this.userData.verificadoRuat = true;
      }

      const savedUser = await this.addData(this.userData);
      if (!savedUser) return;

      await this.sendEmail(this.userData.userName, this.userData.password);

      this.userDataService.setTemporaryUserData(null);
      this.notify(this.translate.instant('TWO_STEP.REGISTRATION_COMPLETE'), 'success');
      this.router.navigate(['/auth/success-msg'], { queryParams: { username: this.userData.userName } });

    } catch (error) {
      this.notify(this.translate.instant('TWO_STEP.REGISTRATION_FAILED'), 'error');
    }
  }

  private sendEmail(username: string, password: string): Promise<void> {
    const email = this.userData.email;
    return emailjs.send(environment.EmailJS.idService, environment.EmailJS.idTemplate, {
      from_name: "GAMQ-DEPORTES",
      to_name: this.userData.nombre,
      message: `USUARIO: ${username}, CONTRASEÑA: ${password}`,
      reply_to: email,
    }, environment.EmailJS.publicKey)
      .then(() => {
        this.notify(this.translate.instant('TWO_STEP.CREDENTIALS_EMAIL_SENT', { email }), 'success');
      })
      .catch((error) => {
        this.notify(this.translate.instant('TWO_STEP.EMAIL_FAILED'), 'error');
        throw error;
      });
  }

  resendEmail(): Promise<void> {
    const email = this.userData.email;
    const codigo = this.userData.verificationCode;

    return emailjs.send(environment.EmailJS.idService, environment.EmailJS.idTemplate, {
      from_name: "GAMQ-DEPORTES",
      to_name:  this.userData.nombre,
      message: `${this.translate.instant('TWO_STEP.VERIFICATION_CODE_EMAIL')} ${codigo}`,
      reply_to: email,
    }, environment.EmailJS.publicKey)
      .then(() => {
        this.notify(this.translate.instant('TWO_STEP.CODE_EMAIL_SENT', { email }), 'success');
      })
      .catch((error) => {
        this.notify(this.translate.instant('TWO_STEP.EMAIL_FAILED'), 'error');
        throw error;
      });
  }
    
  /* API Request */
  private async addData(datos: Contribuyente): Promise<Contribuyente | null> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.save(datos).subscribe({
        next: (data: Contribuyente) => resolve(data),
        error: (error) => {
          this.notify(`${this.translate.instant('TWO_STEP.SAVE_FAILED')}: ${error.message}`, 'error');
          reject(error);
        }
      });
    });
  }
  
  /* RUAT API Requests */
private async registerTaxpayer(data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    this.ruatService.registerTaxpayer(data).subscribe({
      next: (response: any) => {
          if (this.ruatService.canContinue(response)) {
            this.userData.codigoContribuyente = this.ruatService.getResponseData(response).codigoContribuyente;
            resolve(response); 
          } else {
            this.notify(this.ruatService.getResponseMessage(response, this.translate.instant('TWO_STEP.RUAT_REGISTRATION_FAILED')), 'error');
            resolve(null); 
          }
      },
      error: (error) => {
        this.notify(this.ruatService.getResponseMessage(error, this.translate.instant('TWO_STEP.RUAT_REGISTRATION_FAILED')), 'error');
        reject(error);
      }
    });
  });
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
}
