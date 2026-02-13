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
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { GlobalComponent } from 'src/app/global-component';

@Component({
  selector: 'app-signup-check',
  templateUrl: './signup-check.component.html',
  styleUrl: './signup-check.component.scss'
})
export class SignupCheckComponent {

  SignupForm!: UntypedFormGroup;
  submitted = false;
  year: number = new Date().getFullYear();
  systemConfigList: ConfiguracionSistema[] = [];
  
  identityTypes = UserDocType
  cityAcronym= CityAcronym

  private isAuthenticated = false;
  private authenticationAttempted = false;

  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private ruatService: RuatRequestsService,
    private userDataService: UserDataService,
    private contribuyentesService: ContribuyentesService,
    private systemConfigsService: ConfiguracionSistemaService
  ) { }

  ngOnInit(): void {
    this.getConfigsSystem();
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
  private getConfigsSystem() {
    this.systemConfigsService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.systemConfigList = data.payload;
          this.authRuat();
        }
      },
      error: (error) => {
        this.notify('Error loading system configuration', 'error');
      }
    });
  }
  private authRuat(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.authenticationAttempted = true;      
      const usuario = GlobalComponent.RUAT_usuario;
      const clave = GlobalComponent.RUAT_clave;      
      this.ruatService.authenticate(usuario, clave).subscribe({
        next: (response) => {          
          window.sessionStorage.setItem('ruat-token', response.token);
          this.isAuthenticated = true;
          resolve(true);
        },
        error: (error) => {
          this.isAuthenticated = false;
          this.notify("Falla en la conexión con el RUAT, por favor intente más tarde", 'error');
          reject(error);
        }
      });
    });
  }

  ruatData: any;
  async searchContribuyente(data: any) {
    if (!this.isAuthenticated) {
      try {
        if (!this.authenticationAttempted) {
          await this.authRuat();
        } else {
          await this.authRuat();
        }
      } catch (error) {
        this.notify('No se pudo autenticar con el servicio RUAT', 'error');
        return;
      }
    }
    this.ruatService.getContribuyentePorCi('QUI', data.numeroDocumento, data.tipoDocumento, data.expedido).subscribe({    
      next: (resp: any) => {
        if (resp['status'] === 'OK') {
          const response = resp.payload;
          if (response.continuarFlujo) {
            this.ruatData = response;
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
            this.notify(response.mensaje + " Puede proceder con su registro", 'success');
            this.router.navigate(['/auth/signup'], { queryParams: { userExist: false } });          
          }
        } else {      
          this.notify("El contribuyente no se encuentra registrado en el Gobierno Municipal. Puede proceder con su registro", 'success');
          this.router.navigate(['/auth/signup'], { queryParams: { userExist: false } }); 
        }
      },
      error: (error: any) => {
        if (error.status === 401 || error.status === 403) {
          this.isAuthenticated = false;
          this.notify('La sesión ha expirado, por favor intente nuevamente', 'error');
        }
      }
    });
  }
}
