import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { PassResetsService } from 'src/app/core/services/api/pass-resets.service';
import { environment } from 'src/environments/environment';
import { GlobalComponent } from 'src/app/global-component';

@Component({
  selector: 'app-pass-reset',
  templateUrl: './pass-reset.component.html',
  styleUrls: ['./pass-reset.component.scss']
})

/**
 * Pass-Reset pass-reset Component
 */
export class PassResetComponent implements OnInit {
  link= environment.assetsUrl+'/auth/pass-create'
  passresetForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = '';
  returnUrl!: string;
  year: number = new Date().getFullYear();

  constructor(private formBuilder: UntypedFormBuilder, private resetService: PassResetsService) { }

  ngOnInit(): void {
     this.passresetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.passresetForm.controls; }

  
  generateToken(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
    // return bin2hex(random_bytes($length));
  
    
   onSubmit() {
    this.submitted = true;
    if (this.passresetForm.valid) {
      this.resetService.save(this.passresetForm.value.email).subscribe(
        (result: any) => {
          if(result.status === 'OK'){
            const resp = result.payload
            this.sendEmail(this.passresetForm.value.email, resp.token);
            this.notify(result.message, 'success');
          }else{
            this.notify(result, 'error');
          }
        },
        (error: any) => {
          this.notify(error.error.message, 'error');
        }
      );

      // this.sendEmail(this.passresetForm.value.email,'')
    }
  }

  sendEmail(email:string, token:string){
    const reply_to = email;  
    // const to_name = name;    
    // const token = this.generateToken();
    //storeToken($email, $token);
    const resetLink = this.link+"?token="+token;
    
    emailjs.send("service_auth","template_m93u8sa",{
        from_name: "GAMQ-DEPORTES",
        to_name: email,
        // message: "Un cambio de contraseña fue solicitado para el email: " + codigo,
        message: resetLink,
        reply_to: reply_to,
      },'X9362U1QpUzthcHGT')
      .then((response: EmailJSResponseStatus) => {
        this.submitted = false;
        this.notify("Un email fue enviado a "+email+" con las intrucciones para el cambio de contraseña", 'success');
      }, (error) => {
        this.submitted = false;
        this.notify("No se pudo enviar correctamente el e-mail", 'error');
      });    
  }

    /* repetitive functions */
    private notify(message: string, type: 'success' | 'error' | 'warning' | 'info' | 'question') {
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
