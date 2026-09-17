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
    
   onSubmit() {
    this.submitted = true;
    if (this.passresetForm.valid) {
      this.resetService.save(this.passresetForm.value.email).subscribe(
        (result: any) => {
          this.sendEmail(this.passresetForm.value.email, result.token);
          this.notify('Se envió el enlace de recuperación', 'success');
        },
        (error: any) => {
          this.notify(error.error.message, 'error');
        }
      );
    }
  }

  sendEmail(email:string, token:string){
    const reply_to = email;
    const resetLink = this.link+"?token="+token;
    
    emailjs.send("service_auth","template_m93u8sa",{
        from_name: "GAMQ-DEPORTES",
        to_name: email,
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
