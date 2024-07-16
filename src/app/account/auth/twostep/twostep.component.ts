import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgOtpInputComponent } from 'ng-otp-input'; // Make sure you have this package installed
// import { UserDataService } from './user-data.service';

import { Contribuyente } from 'src/app/core/models/contribuyente.models';
// import { UserDataService } from '../signup/user-data.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserDataService } from '../signup/user-data.service';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { RuatService } from 'src/app/core/services/ruat/ruat.service';
import { RuatCallsService } from 'src/app/core/services/ruat/php/ruatcalls.service';
// typescriptCopyimport {

@Component({
  selector: 'app-twostep',
  templateUrl: './twostep.component.html',
  styleUrls: ['./twostep.component.scss']
})

/**
 * Two Step Component
 */
export class TwoStepComponent implements OnInit {

  // set the current year
  year: number = new Date().getFullYear();
  @ViewChild(NgOtpInputComponent, { static: false }) otpComponent?: NgOtpInputComponent;

  userData: any;
  ruatData: any;

  constructor( private router: Router, private http: HttpClient,private fb: FormBuilder, 
    private route: ActivatedRoute,
    private userDataService : UserDataService,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatCallsService,
    // private ruatService: RuatService
  ) {  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const username = params['username'];
      this.userData = this.userDataService.getTemporaryUserData();
      console.log(username)
      console.log(this.userData)
      if (this.userData) {
        this.searchContribuyente(this.userData);
      }
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
        this.userData.estadoUsuario = 'Active';
        this.addData(this.userData);
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
  
  /* RUAT API Requests */
  searchContribuyente(data:Contribuyente){
    this.ruatService.getContribuyentePorCi(data.nroCarnet,data.tipoDocumento, data.ciExpedido ).subscribe({    
      next: (response: any) => {
        if(response.continuarFlujo){
          this.notify("Usted se encuentra registrado en el Ruat",'success')
          this.ruatData= response;
          console.log('Contribuyente Data:', response);

        }else{
          this.notify(response.mensaje,'error')
        }
      },
      error: (error: any) => {        
        console.error('Error:', error);
      }
    });
  }

  registerContribuyente(data:Contribuyente){

    this.ruatService.registerContribuyente(data ).subscribe({    
      next: (response: any) => {
        if(response.continuarFlujo){
          this.notify("Usted se encuentra registrado en el Ruat",'success')
          this.ruatData= response;
          console.log('Contribuyente Data:', response);

        }else{
          this.notify(response.mensaje,'error')
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
