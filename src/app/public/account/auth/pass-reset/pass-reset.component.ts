import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import emailjs from 'emailjs-com';
import { PassResetsService } from 'src/app/core/services/api/pass-resets.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pass-reset',
  templateUrl: './pass-reset.component.html',
  styleUrls: ['./pass-reset.component.scss']
})
export class PassResetComponent implements OnInit {
  passresetForm!: UntypedFormGroup;
  submitted = false;
  year = new Date().getFullYear();

  constructor(private formBuilder: UntypedFormBuilder, private resetService: PassResetsService) { }

  ngOnInit(): void {
    this.passresetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.passresetForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (!this.passresetForm.valid) return;

    this.resetService.requestPasswordReset(this.passresetForm.value.email).subscribe({
      next: (result) => {
        const email = this.passresetForm.value.email;
        const sendEmail = result.token ? this.sendResetEmail(email, result.token) : Promise.resolve();
        sendEmail.then(() => {
          this.submitted = false;
          this.notify(result.message || 'Si el correo está registrado, recibirá instrucciones para recuperar su contraseña.', 'success');
        }).catch(() => {
          this.submitted = false;
          this.notify('No se pudo enviar el email. Intente nuevamente más tarde.', 'error');
        });
      },
      error: () => {
        this.submitted = false;
        this.notify('No se pudo procesar la solicitud. Intente nuevamente más tarde.', 'error');
      }
    });
  }

  private sendResetEmail(email: string, token: string): Promise<void> {
    const link = `${environment.assetsUrl}/auth/pass-create?token=${encodeURIComponent(token)}`;
    return emailjs.send(
      environment.EmailJS.idService,
      environment.EmailJS.idTemplatePasswordReset,
      { from_name: 'GAMQ-DEPORTES', to_name: email, message: link, reply_to: email },
      environment.EmailJS.publicKey
    ).then(() => undefined);
  }

  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info' | 'question'): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 5000,
      timerProgressBar: true
    });
  }
}
