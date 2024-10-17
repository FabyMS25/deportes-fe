import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgOtpInputComponent } from 'ng-otp-input'; 

import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';
import { UserDataService } from '../signup/user-data.service';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';

@Component({
  selector: 'app-twostep',
  templateUrl: './twostep.component.html',
  styleUrls: ['./twostep.component.scss']
})

/**
 * Two Step Component
 */
export class TwoStepComponent implements OnInit {

  year: number = new Date().getFullYear();
  @ViewChild(NgOtpInputComponent, { static: false }) otpComponent?: NgOtpInputComponent;

  userData: any;

  constructor( private router: Router, 
    private route: ActivatedRoute,
    private userDataService : UserDataService,
    private contribuyentesService: ContribuyentesService,
    // private ruatService: RuatCallsService,
    private ruatService: RuatRequestsService,
  ) {  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const username = params['username'];
      this.userData = this.userDataService.getTemporaryUserData();
    });
  }

   /**
   * Confirm Otp Verification
   */
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

    async confirmar() {
      const enteredOtp = this.otpComponent?.currentVal;
      
      if (enteredOtp?.length !== this.config.length) {
        alert('Por favor, ingrese el código completo.');
        return;
      }  
      if (enteredOtp === this.userData.verificationCode) {
        if(!this.userData.codigoContribuyente){
          const ruatResp = await this.registerContribuyente(this.userData)
          if(ruatResp){
            this.userData.estadoUsuario = 'Activo';
            await this.addData(this.userData);
            this.sendEmail(this.userData.userName, this.userData.password)
            this.userDataService.setTemporaryUserData(null);
            this.notify('Sus Datos fueron registrados!','success'); 
            this.router.navigate(['/auth/success-msg'], { queryParams: { username: this.userData.userName } });
          }else{
            this.notify('No se pudo registrar en el Ruat', 'error');
            // await this.addData(this.userData);
            // this.sendEmail(this.userData.userName, this.userData.password)
            // this.router.navigate(['/auth/success-msg'], { queryParams: { username: this.userData.userName } });
          }
        }else{
            this.addData(this.userData);
        }
      } else {
          this.notify('Código incorrecto. Por favor, inténtelo de nuevo.','success');  
        this.otpComponent?.setValue(''); 
      }
    }

    private sendEmail(username:string,password:string): Promise<void> {
      const email = this.userData.correo;
      const name = this.userData.nombre;
      const message = 'USUARIO: '+ username +', CONTRASEÑA: '+ password;
    
      return emailjs.send("service_auth", "template_6htavso", {
        from_name: "GAMQ-DEPORTES",
        to_name: name,
        message: message,
        reply_to: email,
      }, 'X9362U1QpUzthcHGT')
        .then((response: EmailJSResponseStatus) => {
          this.notify("Un email fue enviado a " + email + " con su USUARIO y CONTRASEÑA ", 'success');
        })
        .catch((error) => {
          this.notify("No se pudo enviar correctamente el e-mail", 'error');
          throw error; 
        });
    }
  
    resendEmail(): Promise<void> {
      const email = this.userData.correo;
      const name = this.userData.nombre;
      const codigo = this.userData.verificationCode;
    
      return emailjs.send("service_auth", "template_6htavso", {
        from_name: "GAMQ-DEPORTES",
        to_name: name,
        message: codigo,
        reply_to: email,
      }, 'X9362U1QpUzthcHGT')
        .then((response: EmailJSResponseStatus) => {
          this.notify("Un email fue enviado a " + email + " con el codigo de confirmacion", 'success');
        })
        .catch((error) => {
          this.notify("No se pudo enviar correctamente el e-mail", 'error');
          throw error; 
        });
    }
    
  /* API Request */
  private async addData(datos:Contribuyente){
    return new Promise((resolve, reject) => {
      this.contribuyentesService.save(datos).subscribe({
        next:(data:any)=>{
          if (data['status'] === 'OK') { 
            const user = data.payload;     
            resolve(user)     
          }else{
            this.notify(data.payload, 'error');
            resolve(null);
          }
        },
        error: (error) => {
          reject()
          this.notify('No se pudo Guardar los datos! '+error, 'error');
        }
      })
    })
  }
  

  /* RUAT API Requests */
  private async registerContribuyente(data:any): Promise<any>{
    return new Promise((resolve, reject) => {
      this.ruatService.registerContribuyente(data ).subscribe({    
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
          resolve(error);
        }
      });
    })
  }

  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 2000,
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
