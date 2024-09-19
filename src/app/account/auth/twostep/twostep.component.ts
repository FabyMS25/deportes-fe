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

    confirmar() {
      const enteredOtp = this.otpComponent?.currentVal;
      
      if (enteredOtp?.length !== this.config.length) {
        alert('Por favor, ingrese el código completo.');
        return;
      }  
      if (enteredOtp === this.userData.verificationCode) {
        this.userData.estadoUsuario = 'Activo';
        if(!this.userData.codigoContribuyente){
          this.registerContribuyente(this.userData)
        }else{
            this.addData(this.userData);
        }
      } else {
          this.notify('Código incorrecto. Por favor, inténtelo de nuevo.','success');  
        this.otpComponent?.setValue(''); 
      }
    }

  
    sendEmail(): Promise<void> {
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
  addData(datos:Contribuyente){
    this.contribuyentesService.save(datos).subscribe({
      next:(data:any)=>{
        if (data['status'] === 'OK') {
          this.notify('Sus Datos fueron registrados!','success');  
          const user = data.payload;        
          // this.sendEmail(user,link)       
          this.userDataService.setTemporaryUserData(null);
          this.router.navigate(['/auth/success-msg'], { queryParams: { username: user.userName } });
 
        }else{
          this.notify(data.payload, 'error');
        }
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    })
  }
  
  formatDate(date: Date): string {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /* RUAT API Requests */
  registerContribuyente(data:any){
    this.ruatService.registerContribuyente(data ).subscribe({    
      next: (resp: any) => {
        if(resp['status']==='OK'){
          const response = resp.payload
          if(response.continuarFlujo){
            this.notify("Usted se encuentra registrado en el Ruat",'success')
            this.userData.codigoContribuyente = response.codigoContribuyente
            this.addData(this.userData);  
          }else{
            this.notify(response.mensaje,'error')
          }
        }else{
          this.notify(resp.payload,'error')
        }
      },
      error: (error: any) => {        
        console.error('Error:', error);
      }
    });
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
