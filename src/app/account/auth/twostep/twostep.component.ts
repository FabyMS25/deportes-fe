import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgOtpInputComponent } from 'ng-otp-input'; 

import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';
import { UserDataService } from '../signup/user-data.service';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { GlobalComponent } from 'src/app/global-component';
import { environment } from 'src/environments/environment';
import { EstadoRuat, EstadoUsuario } from 'src/app/core/constants/Estados';

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

  constructor( private router: Router, 
    private route: ActivatedRoute,
    private userDataService : UserDataService,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService,
  ) {  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const username = params['username'];
      this.userData = this.userDataService.getTemporaryUserData();
    });
  }

  async confirmar() {
    const enteredOtp = this.otpComponent?.currentVal;
    if (!enteredOtp || enteredOtp.length !== this.config.length) {
      this.notify('Por favor, ingrese el código completo.', 'error');
      return;
    }
    if (enteredOtp !== this.userData.verificationCode) {
      this.notify('Código incorrecto. Por favor, inténtelo de nuevo.', 'error');
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
        const ruatResp = await this.registerContribuyente(ruatData);
        if (!ruatResp) {
          this.notify('No se pudo registrar en el Ruat', 'error');
          return;
        }
        this.userData.estadoUsuario = EstadoUsuario.ACTIVO;
        this.userData.estadoRuat = EstadoRuat.ACTIVO
        this.userData.verificadoRuat = true
      }

      const savedUser = await this.addData(this.userData);
      if (!savedUser) return;

      await this.sendEmail(this.userData.userName, this.userData.password);

      this.userDataService.setTemporaryUserData(null);
      this.notify('Sus Datos fueron registrados!', 'success');
      this.router.navigate(['/auth/success-msg'], { queryParams: { username: this.userData.userName } });

    } catch (error) {
      console.error('Error durante la confirmación:', error);
      this.notify('Ocurrió un error inesperado durante el registro.', 'error');
    }
  }

  private sendEmail(username: string, password: string): Promise<void> {
    const email = this.userData.email;
    return emailjs.send(environment.EmailJS.idService, environment.EmailJS.idTemplate, {
      from_name: "GAMQ-DEPORTES",
      to_name:this.userData.nombre,
      message: `USUARIO: ${username}, CONTRASEÑA: ${password}`,
      reply_to: email,
    }, environment.EmailJS.publicKey)
      .then(() => {
        this.notify(`Un email fue enviado a ${email} con su USUARIO y CONTRASEÑA`, 'success');
      })
        // .then((response: EmailJSResponseStatus) => {
        //   this.notify("Un email fue enviado a " + email + " con su USUARIO y CONTRASEÑA ", 'success');
        // })
      .catch((error) => {
        this.notify("No se pudo enviar correctamente el e-mail", 'error');
        throw error;
      });
  }
  resendEmail(): Promise<void> {
    const email = this.userData.email;
    const codigo = this.userData.verificationCode;

    return emailjs.send(environment.EmailJS.idService, environment.EmailJS.idTemplate, {
      from_name: "GAMQ-DEPORTES",
      to_name:  this.userData.nombre,
      message: `Su código de verificación es: ${codigo}`,
      reply_to: email,
    }, environment.EmailJS.publicKey)
      .then(() => {
        this.notify(`Un email fue enviado a ${email} con el código de confirmación`, 'success');
      })
      .catch((error) => {
        this.notify("No se pudo enviar correctamente el e-mail", 'error');
        throw error;
      });
  }
    
  /* API Request */
  private async addData(datos: Contribuyente): Promise<Contribuyente | null> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.save(datos).subscribe({
        next: (data: any) => {
          if (data.status === 'OK') {
            resolve(data.payload as Contribuyente);
          } else {
            this.notify(data.payload || 'Error al guardar los datos', 'error');
            resolve(null);
          }
        },
        error: (error) => {
          this.notify('No se pudo guardar los datos: ' + error.message, 'error');
          reject(error);
        }
      });
    });
  }
  
  /* RUAT API Requests */
  private async registerContribuyente(data:any): Promise<any>{
    const codigoAlcaldia = GlobalComponent.RUAT_codigoAlcaldia;//this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';
    const codigoUsuario = GlobalComponent.RUAT_codigoUsuario;//this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';
    return new Promise((resolve, reject) => {
      this.ruatService.registerContribuyente(codigoAlcaldia,codigoUsuario,data ).subscribe({    
        next: (resp: any) => {
          if(resp['status']==='OK'){
            const response = resp.payload
            if(response.continuarFlujo){
              this.userData.codigoContribuyente = response.codigoContribuyente
              // this.addData(this.userData);  
              // this.notify("Usted se encuentra registrado en el Ruat",'success')
              resolve(response); 
            }else{
              this.notify(response.mensaje,'error')
              resolve(null); 
            }
          }else{
            this.notify(resp.payload,'error')
            resolve(null); 
          }
        },
        error: (error) => {
          this.notify('Error al registrar en RUAT: ' + error.message, 'error');
          reject(error);
        }
      });
    })
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
