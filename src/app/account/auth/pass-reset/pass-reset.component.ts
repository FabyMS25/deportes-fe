import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

@Component({
  selector: 'app-pass-reset',
  templateUrl: './pass-reset.component.html',
  styleUrls: ['./pass-reset.component.scss']
})

/**
 * Pass-Reset pass-reset Component
 */
export class PassResetComponent implements OnInit {

  // Login Form
  passresetForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = '';
  returnUrl!: string;
  // set the current year
  year: number = new Date().getFullYear();

  constructor(private formBuilder: UntypedFormBuilder) { }

  ngOnInit(): void {
    /**
     * Form Validatyion
     */
     this.passresetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // convenience getter for easy access to form fields
  get f() { return this.passresetForm.controls; }

  
  generateToken(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
    // return bin2hex(random_bytes($length));
  
  /**
   * Form submit
   */
   onSubmit() {
    this.submitted = true;
    if (this.passresetForm.valid) {
      this.sendEmail(this.passresetForm.value.email,'')
    }
  }

  sendEmail(email:string, name:string){
    const reply_to = email;  
    const to_name = name;    
    const token = this.generateToken();
    //storeToken($email, $token);
    const resetLink = "http://localhost:4200/auth/pass-create?token=$token";
    
    emailjs.send("service_auth","template_m93u8sa",{
        from_name: "GAMQ-DEPORTES",
        to_name: to_name,
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
