import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserDocType} from 'src/app/core/constants/UserData';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { UserDataService } from '../signup/user-data.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';

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

  constructor(private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService,
    // private ruatService: RuatCallsService,
    private router: Router,
    private userDataService: UserDataService,
    private systemConfigsService: ConfiguracionSistemaService
  ) { }

  ngOnInit(): void {
    this.getConfigsSystem();
    // this.authRuat()
    
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
  onSubmit() {
    this.submitted = true;  
    if (this.SignupForm.valid) {
      this.SignupForm.enable();
      let datos = {
        tipoDocumento: this.SignupForm.value.tipoDocumento,
        numeroDocumento: this.SignupForm.value.numeroDocumento,
        expedido:this.SignupForm.value.expedido,
      };
      this.searchContribuyente(datos);

    } else {
      this.notify('Formulario Invalido!', 'error');
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
            const usersList:any[] = data.payload
            if (usersList) {
                const itExist = usersList.some(user => user.nroCarnet === value);
                resolve(itExist);
            } 
            resolve(false);
          } else {
            resolve(false);
          }
        },
        error: (error) => {
          console.error('Error fetching users:', error);
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
            this.authRuat()
          }
        }
      });
  }
  private authRuat() {
    const usuario = this.systemConfigList.find(config => config.clave === 'USUARIO_RUAT')?.valorTexto || '';
    const clave = this.systemConfigList.find(config => config.clave === 'CLAVE_RUAT')?.valorTexto || '';
      this.ruatService.authenticate(usuario,clave).subscribe({
        next: (response) => {          
          window.sessionStorage.setItem('ruatToken', response.token);
        },
        error: (error) => {
          this.notify("Falla en la coneccion con el RUAT, porfavor intente mas tarde",'error')
        }
      });
  }

  ruatData: any;
  searchContribuyente(data:any){
    console.log(data)
    this.ruatService.getContribuyentePorCi('QUI',data.numeroDocumento,data.tipoDocumento, data.expedido ).subscribe({    
      next: (resp: any) => {
        if(resp['status']==='OK'){
          const response = resp.payload
        if(response.continuarFlujo){
          this.ruatData= response;
          this.searchUser(data.numeroDocumento)
            .then((exist) => {
              if(exist){
                this.notify("Usted ya cuenta con un registro en Deportes- GAMQ ",'error')

              }else{
                this.userDataService.setTemporaryUserData(this.ruatData);
                this.notify("Usted tiene datos registrados en Ruat,Proceder con registro en Deportes-GAMQ ",'success')
                this.router.navigate(['/auth/signup'], { queryParams: { userExist: true } });
              }
            })
            .catch(error => {
              console.error('Error in searchUsers:', error);});

        }else{
          this.notify(response.mensaje+" Puede proceder con su registro",'success')
          this.router.navigate(['/auth/signup'], { queryParams: { userExist:false } });          
        }

        }else{      
          this.notify("El contribuyente no se encuentra registrado en el Gobierno Municipal."+" Puede proceder con su registro",'success')
          this.router.navigate(['/auth/signup'], { queryParams: { userExist:false } }); 
        }
      },
      error: (error: any) => {        
        console.error('Error:', error);
      }
    });
  }
}
