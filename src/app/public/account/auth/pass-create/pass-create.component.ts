import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MustMatch } from './must-match';
import { ActivatedRoute, Router } from '@angular/router';
import { PassResetsService } from 'src/app/core/services/api/pass-resets.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pass-create',
  templateUrl: './pass-create.component.html',
  styleUrls: ['./pass-create.component.scss']
})

export class PassCreateComponent implements OnInit {

  token: string | null = null;
   passresetForm!: UntypedFormGroup;
   submitted = false;
   passwordField!: boolean;
   confirmField!: boolean;
   error = '';
   returnUrl!: string;
   year: number = new Date().getFullYear();
 
   constructor(
      private formBuilder: UntypedFormBuilder, 
      private route: ActivatedRoute,
      private router: Router,
       private passResetService: PassResetsService
    ) { }
 
    async ngOnInit() {    
      
      this.passresetForm = this.formBuilder.group({
         password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), Validators.pattern('(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}')]],
        cpassword: ['', [Validators.required]]       
       }, {
         validator: MustMatch('password', 'cpassword')
       });

       
       this.token = this.route.snapshot.queryParamMap.get('token');
       if (this.token) {
         void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
       }
      if (this.token) {
        try {
          const valid = await this.validateToken(this.token); 
          if (!valid) {
            this.router.navigate(['/public/404-basic']);
          }
        } catch (error) {
          this.router.navigate(['/public/404-basic']);
        }
      }else{
        this.router.navigate(['/public/404-basic']);
      } 

      var myInput = document.getElementById("password-input") as HTMLInputElement;
      var letter = document.getElementById("pass-lower");
      var capital = document.getElementById("pass-upper");
      var number = document.getElementById("pass-number");
      var length = document.getElementById("pass-length");

      myInput.onfocus = function () {
        let input = document.getElementById("password-contain") as HTMLElement;
        input.style.display = "block"
      };

      myInput.onblur = function () {
        let input = document.getElementById("password-contain") as HTMLElement;
        input.style.display = "none"
      };

      myInput.onkeyup = function () {
        var lowerCaseLetters = /[a-z]/g;
        if (myInput.value.match(lowerCaseLetters)) {
            letter?.classList.remove("invalid");
            letter?.classList.add("valid");
        } else {
            letter?.classList.remove("valid");
            letter?.classList.add("invalid");
        }

        var upperCaseLetters = /[A-Z]/g;
        if (myInput.value.match(upperCaseLetters)) {
            capital?.classList.remove("invalid");
            capital?.classList.add("valid");
        } else {
            capital?.classList.remove("valid");
            capital?.classList.add("invalid");
        }

        var numbers = /[0-9]/g;
        if (myInput.value.match(numbers)) {
            number?.classList.remove("invalid");
            number?.classList.add("valid");
        } else {
            number?.classList.remove("valid");
            number?.classList.add("invalid");
        }

        if (myInput.value.length >= 8) {
            length?.classList.remove("invalid");
            length?.classList.add("valid");
        } else {
            length?.classList.remove("valid");
            length?.classList.add("invalid");
        }
      };

   }
 
   get f() { return this.passresetForm.controls; }
 
   /**
    * Form submit
    */
    onSubmit() {
     this.submitted = true;
     const password = this.f['password'].value;
     if (this.passresetForm.valid && this.token) {
       this.resetPassword(this.token, password);
     } else {
       this.passresetForm.markAllAsTouched();
     }
  }



  private async validateToken(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.passResetService.validateToken(token).subscribe({
        next: (valid) => resolve(valid === true),
        error: () => {
          resolve(false);
        }
      });
    });
  }

  private resetPassword(token: string, password: string) {
    this.passResetService.completePasswordReset(token, password).subscribe({
      next: (message) => {
          this.router.navigate(['/auth/login']).then(() => {
            this.notify(message, 'success');
          });
      },
      error: (err) => {
        this.notify(err?.message || "El enlace no es válido o venció. Solicite uno nuevo.", 'error');
      }
    });
  }
  
   /**
   * Password Hide/Show
   */
    togglepasswordField() {
      this.passwordField = !this.passwordField;
    }

    /**
   * Password Hide/Show
   */
    toggleconfirmField() {
      this.confirmField = !this.confirmField;
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
