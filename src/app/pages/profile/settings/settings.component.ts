import { Component, OnInit } from '@angular/core';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { CityAcronym } from 'src/app/core/constants/Places';
import { UserService } from 'src/app/core/services/api-users/users.service';
import Swal from 'sweetalert2';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Observable, catchError, map, of } from 'rxjs';
import { PassResetComponent } from '../password-reset/pass-reset.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Location } from '@angular/common';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { de } from 'date-fns/locale';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  CityAcronym = CityAcronym;
  userRole!: 'Contribuyente' | 'Admin' | 'Encargado';
  userAvatar = "default-profile1.png";
  userData!: any;
  userEmployee!: EncargadoComplejo;
  userContribuyente!: Contribuyente;

  submitted = false;
  personaForm: FormGroup = this.formBuilder.group({
    uuid: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    primerApellido: ['', [Validators.required]],
    segundoApellido: ['', [Validators.required]],
    genero: ['M', [Validators.required]],
    numeroDocumento: ['', [Validators.required]],
    expedido: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
    email: ['', [Validators.required, Validators.email]],
    direccion: ['']
  });

  contactoForm: FormGroup = this.formBuilder.group({
    telefono: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
    email: ['', [Validators.required, Validators.email]],
    direccion: ['']
  });

  constructor(
    private location: Location,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private employeeService: UserService,
    private userService: ContribuyentesService
  ) { }

  ngOnInit(): void {
    const dataSaved = this.authService.currentUser();
    this.userRole = this.authService.getUserRole();
    this.userAvatar = this.authService.getAvatar();
    
    if (this.userRole === 'Contribuyente') {
      this.userContribuyente = dataSaved;
      this.loadContribuyenteData(this.userContribuyente);
    } else if (this.userRole === 'Admin') {
      this.userData = dataSaved.designacion.personaDto;
      this.loadContactoData(this.userData);
    } else {
      this.userData = dataSaved.designacion.personaDto;
      const funcionarioString = localStorage.getItem('assignaments');
      this.userEmployee = funcionarioString ? JSON.parse(funcionarioString) : null;
      this.loadContactoData(this.userData);
    }
  }

  private loadContribuyenteData(contribuyente: Contribuyente) {
    if (contribuyente) {
      this.personaForm.patchValue({
        uuid: contribuyente.uuid,
        nombre: contribuyente.nombre,
        primerApellido: contribuyente.primerApellido,
        segundoApellido: contribuyente.segundoApellido,
        genero: contribuyente.genero,
        numeroDocumento: contribuyente.numeroDocumento,
        expedido: contribuyente.expedido,
        telefono: contribuyente.telefono,
        email: contribuyente.email,
        direccion: contribuyente.direccion
      });
    }
  }

  private loadContactoData(persona: any) {
    if (persona) {
      this.contactoForm.patchValue({
        telefono: persona.nroCelular || persona.telefono,
        email: persona.correoElectronico || persona.email,
        direccion: persona.direccion
      });
    }
  }

  get form() {
    return this.personaForm.controls;
  }

  get contactoFormControls() {
    return this.contactoForm.controls;
  }

  public openModal() {
    const modalRef = this.modalService.open(PassResetComponent, {
      backdrop: 'static',
    });
    modalRef.componentInstance.userRole = this.userRole;
    modalRef.componentInstance.userData = this.userContribuyente || this.userData;
  }

  getAcronymCity(city: string): string {
    let acronym = '';
    CityAcronym.forEach(element => {
      if (element['value'] === city) {
        acronym = element['acronym'];
      }
    });
    return acronym;
  }

  getIdCity(city: string): any {
    let acronym = null;
    CityAcronym.forEach(element => {
      if (element['value'] === city) {
        acronym = element['id'];
      }
    });
    return acronym;
  }

  async saveData() {
    this.submitted = true;
    
    if (this.userRole === 'Contribuyente') {
      if (this.personaForm.valid) {
        const expedidoValue = this.personaForm.value.expedido;
        // const expedidoAcronym = this.getAcronymFromId(expedidoValue);
        
        const persona: Contribuyente = {
          uuid: this.personaForm.value.uuid,
          nombre: this.personaForm.value.nombre,
          primerApellido: this.personaForm.value.primerApellido,
          segundoApellido: this.personaForm.value.segundoApellido,
          numeroDocumento: this.personaForm.value.numeroDocumento,
          expedido: this.personaForm.value.expedido,
          genero: this.personaForm.value.genero,
          telefono: this.personaForm.value.telefono,
          email: this.personaForm.value.email,
          direccion: this.personaForm.value.direccion,

          estadoRuat: this.userContribuyente.estadoRuat,
          verificadoRuat: this.userContribuyente.verificadoRuat,
          esDeportistaElite: this.userContribuyente.esDeportistaElite,
          perteneceEscuelaMunicipal: this.userContribuyente.perteneceEscuelaMunicipal,
          descuentoAplicable: this.userContribuyente.descuentoAplicable,
          estaSancionado: this.userContribuyente.estaSancionado,

          fechaNacimiento: this.userContribuyente.fechaNacimiento,
          estadoUsuario: this.userContribuyente.estadoUsuario,
          codigoContribuyente: this.userContribuyente.codigoContribuyente,
          estadoCivil: this.userContribuyente.estadoCivil,
          tipoDocumento: this.userContribuyente.tipoDocumento,
          nroNit: this.userContribuyente.nroNit,
          tipoContribuyente: this.userContribuyente.tipoContribuyente,
          userName: this.userContribuyente.userName,
          password: this.userContribuyente.password,
        }

        try {
          await this.updateUser(persona);
          this.notify('success', 'Sus datos fueron actualizados con éxito');
        } catch (error) {
          this.notify('error', 'No se pudo actualizar sus datos');
        }
      } else {
        this.notify('error', 'Por favor, complete todos los campos obligatorios');
        return;
      }
    } else {
      if (this.contactoForm.valid) {
        const persona: any = { 
          uuid: this.userData.uuid,
          nroCelular: this.contactoForm.value.telefono,
          correoElectronico: this.contactoForm.value.email,
          direccion: this.contactoForm.value.direccion
        };
        this.updatePersona(persona);
      } else {
        this.notify('error', 'Por favor, complete todos los campos obligatorios');
        return;
      }
    }
  }

  // private getAcronymFromId(expedido: any,getBy:string = 'id'): string {
  //   if(getBy ==='acronym'){
  //     const cityByDescription = CityAcronym.find(c => c.acronym === expedido);
  //     if (cityByDescription) {
  //       return cityByDescription.acronym;
  //     }  
  //   }else{
  //     const cityById = CityAcronym.find(c => c.id === expedido);  
  //     if (cityById) {
  //       return cityById.value;
  //     }
  //   }
  //   return expedido;
  // }

  password: string = '';
  async deleteAccount() {
    if (!this.password) {
      this.notify('error', 'Por favor, ingrese su contraseña.');
      return;
    }

    // For demo purposes - in real app, you should verify password with backend
    if (this.password === this.userContribuyente.password) {
      if (window.confirm("¿Está seguro de que desea cerrar y eliminar la cuenta?")) {
        const updatedUser = { ...this.userContribuyente, estadoUsuario: 'Anulado' };
        await this.updateUser(updatedUser);
        this.notify('success', 'Su cuenta fue anulada, usted ya no podrá realizar operaciones en el sistema');
        this.authService.logout();
      }
    } else {
      this.notify('error', 'La contraseña ingresada es incorrecta.');
    }
  }

  /* API Services */
  private updatePersona(persona: any) {
    this.employeeService.updatePersona(persona).subscribe({
      next: (data) => {
        this.notify('success', 'Registro actualizado con exito');
      },
      error: (error) => {
        this.notify('error', 'No se puedo actualizar el Registro');
      }
    });
  }

  private updateUser(persona: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.userService.update(persona).subscribe({
        next: (data: any) => {
          if (data.status === 'OK') {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: (error) => {
          this.notify('error', 'No se pudo actualizar el Registro');
          reject(error);
        }
      });
    });
  }

  private deleteUser(uuid: string) {
    this.userService.delete(uuid).subscribe({
      next: (data: any) => {
        if (data.status === 'OK') {
          this.notify('success', 'Se elimino su cuenta con exito');
          this.authService.logout()
        } else {
          this.notify('error', 'No se puedo eliminar el Registro');
        }
      },
      error: (error) => {
        this.notify('error', 'No se puedo actualizar el Registro');
      }
    });
  }

  /* Common functions */
  private notify(type: any, message: string) {
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

  goBack() {
    this.location.back();
  }

  // Helper method to get display name
  getDisplayName(): String {
    if (this.userRole === 'Contribuyente') {
      return this.userContribuyente.nombre;
    } else {
      return this.userData?.fullName || this.userData?.nombre + ' ' + this.userData?.apPaterno + ' ' + this.userData?.apMaterno;
    }
  }

  // Helper method to get email
  getEmail(): string {
    if (this.userRole === 'Contribuyente') {
      return this.userContribuyente.email;
    } else {
      return this.userData?.correoElectronico || this.userData?.email;
    }
  }
}