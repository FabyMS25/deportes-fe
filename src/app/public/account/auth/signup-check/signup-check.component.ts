import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserDocType} from 'src/app/core/constants/UserData';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { UserDataService } from '../signup/user-data.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

@Component({
  selector: 'app-signup-check',
  templateUrl: './signup-check.component.html',
  styleUrl: './signup-check.component.scss'
})
export class SignupCheckComponent {

  SignupForm!: UntypedFormGroup;
  submitted = false;
  year: number = new Date().getFullYear();
  
  identityTypes = UserDocType
  cityAcronym= CityAcronym

  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private ruatService: RuatRequestsService,
    private userDataService: UserDataService,
    private contribuyentesService: ContribuyentesService
  ) { }

  ngOnInit(): void {
     this.SignupForm = this.formBuilder.group({
      tipoDocumento:['', [Validators.required]],
      numeroDocumento:['', [Validators.required]],
      expedido:[''],
    }); 
  }

  get f() { return this.SignupForm.controls; }
  
  /**
   * Form submit
   */
  async onSubmit() {
    this.submitted = true;  
    if (this.SignupForm.valid) {
      this.SignupForm.enable();
      let datos = {
        tipoDocumento: this.SignupForm.value.tipoDocumento,
        numeroDocumento: this.SignupForm.value.numeroDocumento,
        expedido: this.SignupForm.value.expedido,
      };
      await this.searchContribuyente(datos);
    } else {
      this.notify('Formulario Inválido!', 'error');
      Object.keys(this.SignupForm.controls).forEach(key => {
        const control = this.SignupForm.get(key);
        control?.markAsTouched();
      });
    }
  }  

  private notify(message: any, type: any): void {
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
  /* API REQUESTS */ 
  private searchUser(value: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            const usersList:Contribuyente[] = data.payload
            if (usersList) {
                const itExist = usersList.some(user => user.numeroDocumento === value);
                resolve(itExist);
            } 
            resolve(false);
          } else {
            resolve(false);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }
  /* API RUAT Services */
  ruatData: any;
  async searchContribuyente(data: any) {
    this.ruatService.getContribuyentePorCi(data.numeroDocumento, data.tipoDocumento, data.expedido).subscribe({    
      next: (resp: any) => {
        if (resp['status'] === 'OK') {
          const response = resp.payload;
          if (this.ruatService.canContinue(response)) {
            this.ruatData = this.ruatService.getResponseData(response);
            this.searchUser(data.numeroDocumento)
              .then((exist) => {
                if (exist) {
                  this.notify("Usted ya cuenta con un registro en Deportes- GAMQ", 'error');
                } else {
                  this.userDataService.setTemporaryUserData(this.ruatData);
                  this.notify("Usted tiene datos registrados en Ruat, Proceder con registro en Deportes-GAMQ", 'success');
                  this.router.navigate(['/auth/signup'], { queryParams: { userExist: true } });
                }
              })
              .catch(error => {
                console.error('Error in searchUsers:', error);
              });
          } else {
            this.notify(this.ruatService.getResponseMessage(response, 'No se encontraron datos en RUAT') + " Puede proceder con su registro", 'success');
            this.router.navigate(['/auth/signup'], { queryParams: { userExist: false } });          
          }
        } else {      
          this.notify(this.ruatService.getResponseMessage(resp, "El contribuyente no se encuentra registrado en el Gobierno Municipal.") + " Puede proceder con su registro", 'success');
          this.router.navigate(['/auth/signup'], { queryParams: { userExist: false } }); 
        }
      },
      error: (error: any) => {
        if (error.status === 401 || error.status === 403) {
          this.notify('No se pudo consultar RUAT, por favor intente nuevamente', 'error');
        }
      }
    });
  }
}
