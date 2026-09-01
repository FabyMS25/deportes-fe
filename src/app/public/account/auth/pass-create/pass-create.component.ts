import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MustMatch } from './must-match';
import { ActivatedRoute, Router } from '@angular/router';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { PassResetsService } from 'src/app/core/services/api/pass-resets.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pass-create',
  templateUrl: './pass-create.component.html',
  styleUrls: ['./pass-create.component.scss']
})

export class PassCreateComponent implements OnInit {

  token: string | null = null;
   // Login Form
   passresetForm!: UntypedFormGroup;
   submitted = false;
   passwordField!: boolean;
   confirmField!: boolean;
   error = '';
   returnUrl!: string;
   // set the current year
   year: number = new Date().getFullYear();
 
   constructor(
      private formBuilder: UntypedFormBuilder, 
      private route: ActivatedRoute,
      private router: Router,
      private userService: ContribuyentesService,
      private passResetService: PassResetsService
    ) { }
 
    async ngOnInit() {    
      
      this.passresetForm = this.formBuilder.group({
        password: ['', [Validators.required]],
        cpassword: ['', [Validators.required]]       
       }, {
         validator: MustMatch('password', 'cpassword')
       });

       
      this.route.queryParams.subscribe(params => {
        this.token = params['token']; 
      });
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

      // Password Validation set
      var myInput = document.getElementById("password-input") as HTMLInputElement;
      var letter = document.getElementById("pass-lower");
      var capital = document.getElementById("pass-upper");
      var number = document.getElementById("pass-number");
      var length = document.getElementById("pass-length");

      // When the user clicks on the password field, show the message box
      myInput.onfocus = function () {
        let input = document.getElementById("password-contain") as HTMLElement;
        input.style.display = "block"
      };

      // When the user clicks outside of the password field, hide the password-contain box
      myInput.onblur = function () {
        let input = document.getElementById("password-contain") as HTMLElement;
        input.style.display = "none"
      };

      // When the user starts to type something inside the password field
      myInput.onkeyup = function () {
        // Validate lowercase letters
        var lowerCaseLetters = /[a-z]/g;
        if (myInput.value.match(lowerCaseLetters)) {
            letter?.classList.remove("invalid");
            letter?.classList.add("valid");
        } else {
            letter?.classList.remove("valid");
            letter?.classList.add("invalid");
        }

        // Validate capital letters
        var upperCaseLetters = /[A-Z]/g;
        if (myInput.value.match(upperCaseLetters)) {
            capital?.classList.remove("invalid");
            capital?.classList.add("valid");
        } else {
            capital?.classList.remove("valid");
            capital?.classList.add("invalid");
        }

        // Validate numbers
        var numbers = /[0-9]/g;
        if (myInput.value.match(numbers)) {
            number?.classList.remove("invalid");
            number?.classList.add("valid");
        } else {
            number?.classList.remove("valid");
            number?.classList.add("invalid");
        }

        // Validate length
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
   async onSubmit() {
    this.submitted = true;  
    try {
      const password = this.f['password'].value;  
      if (this.passresetForm.valid && this.token) {
        const user = await this.getUser(this.token);  
        if (user) {
          user.password = password
          this.resetPassword(user)          
        } else {
          this.passresetForm.setErrors({ NoUser: true });
        }
      } else {
        this.passresetForm.markAllAsTouched();
      }
    } catch (error:any) {
      this.passresetForm.setErrors({ serverError: true });
    }
  }



  private async validateToken(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.passResetService.validateToken(token).subscribe({
        next: () => resolve(true),
        error: (error) => {
          resolve(false);
        }
      });
    });
  }

  private resetPassword(data: Contribuyente) {   
    this.userService.update(data).subscribe({
      next: () => {
          this.notify("Su contraseña se ha restablecido correctamente. Por favor inicie sesión con su nueva", 'success');
          this.router.navigate(['/auth/login']).then(() => {
            this.notify("Su contraseña se ha restablecido correctamente. Por favor inicie sesión con su nueva", 'success');
          });
      },
      error: (err) => {
        this.notify("Ocurrio un error al restablecer su contraseña. ", 'error');
      }
    });
  }
  
  private async getUser(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.passResetService.getUserByToken(token).subscribe({
        next: (data:any) => resolve(data),
        error: (error) => {
          resolve(null);
        }
      });
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
