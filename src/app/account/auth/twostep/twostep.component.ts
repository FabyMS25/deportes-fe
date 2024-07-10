import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { UserDataService } from '../signup/user-data.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';

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
  userData: any;

  constructor(
    private route: ActivatedRoute,
    private userDataService : UserDataService,
    private contribuyentesService: ContribuyentesService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const username = params['username'];
      this.userData = this.userDataService.getTemporaryUserData();
      console.log(username)
      console.log(this.userData)
      if (!this.userData) {
        // Handle error: no user data found
        console.error('No user data found');
        // Redirect to signup or show error
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

    /* API SERVICES */
    getContribuyente(uuid:string){
      console.log(uuid)
    }
    
  addData(datos:Contribuyente){
    this.contribuyentesService.save(datos).subscribe({
      next:(data:any)=>{
        if (data['status'] === 'OK') {
          // this.SignupForm.reset();   
          // this.submitted=false;
          this.notify('Sus Datos fueron registrados!','success');  
          const user = data.payload;        
          const link = `http://localhost:4200/auth/twostep?username=${user.userName}`;
          // this.sendEmail(user,link)       
          // this.router.navigate(['/auth/twostep'], { queryParams: { uuid: user.uuid } });
          // this.router.navigate(['/auth/twostep'], { queryParams: { username: datos.userName } });
 
        }else{
          this.notify(data.payload, 'error');
        }
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
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
