import { Component, OnInit } from '@angular/core';

import { TokenStorageService } from '../../../core/services/token-storage.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';

import {CityAcronym}  from 'src/app/core/constants/Places';
import { UserService } from 'src/app/core/services/api-users/users.service';
import Swal from 'sweetalert2';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Observable, catchError, map, of } from 'rxjs';
import { PassResetComponent } from '../password-reset/pass-reset.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Location } from '@angular/common';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

/**
 * Profile Settings Component
 */
export class SettingsComponent implements OnInit {

  CityAcronym=CityAcronym;
  avatar="default-profile1.png";
  userType:string='';
  userData: any;
  funcionario!:any;

  submitted = false;
  personaForm = this.formBuilder.group({
    nombre: ['', [Validators.required]],
    apPaterno: ['', [Validators.required]],
    apMaterno: ['', [Validators.required]],
    sexo: ['M', [Validators.required]],
    nroCarnet: ['', [Validators.required]],
    expedido: ['',[Validators.required]],
    nroCelular: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
    correoElectronico: ['', [Validators.required, Validators.email]],
    direccion: ['']
  });

  constructor(
    private location: Location,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private authService:AuthenticationService,
    private employeeService:UserService,
    private userService: ContribuyentesService
   ) { }

  ngOnInit(): void {    
    const token = window.sessionStorage.getItem('auth-token');
    const userString = window.sessionStorage.getItem('currentUser');
    this.userData =userString ? JSON.parse(userString) : null;
    this.avatar=this.authService.getAvatar();
    if(token==='isContribuyente'){
      const persona =this.userData;
      this.userType='Contribuyente';
      this.loadPersonaData(persona);
    }else{
      this.userType='Administrador';
      const persona =this.userData.designacion.personaDto;
      const funcionarioString = localStorage.getItem('assignaments');
      this.funcionario =funcionarioString ? JSON.parse(funcionarioString) : null;
      if(this.funcionario)this.userType='Encargado'; 
      this.loadPersonaData(persona);
    }
  }
   
  private loadPersonaData(persona:any) {
    // When persona data is loaded, update form
    if (persona) {
      this.personaForm.patchValue({
        nombre: persona.nombre,
        apPaterno: persona.apPaterno,
        apMaterno: persona.apMaterno,
        sexo: persona.sexo,
        nroCarnet: persona.nroCarnet,
        expedido: this.getExpedidoDescription(persona.ciExpedido || persona.ciExpedito),
        nroCelular: persona.nroCelular || persona.celular,
        correoElectronico: persona.correoElectronico || persona.correo,
        direccion: persona.direccion
      });
    }
  }

   get form() {
    return this.personaForm.controls;
  }
  getExpedidoDescription(expedido: string): string {
    const city = this.CityAcronym.find(c => c.acromyn === expedido || c.id === expedido);
    return city ? city.description : '';
  }
  public openModal() {
    const modalRef = this.modalService.open(PassResetComponent, {
        backdrop: 'static',
    });
    modalRef.componentInstance.userData = this.userData;
  }
   getAcronymCity(city: string): string {
    let acronym = '';
    CityAcronym.forEach(element => {
      if (element['description'] === city) {
        acronym = element['acromyn'];
      }
    });
    return acronym;
   }

   /* API Services */
   updatePersona() {    
    // console.log(this.persona);
    // this.persona['ciExpedito'] = this.getAcronymCity(this.persona['ciExpedito']);
    // console.log(this.persona);
    // this.userService.updatePersona(this.persona).subscribe({
    //   next:(data) => {
    //       this.persona = data;
    //       this.notify('success','Registro actualizado con exito');
    //   },
    //   error: (error) => {
    //       this.notify('error','No se puedo actualizar el Registro');
    //   }
    // });
   }

   /* Common functions */
  private notify(type:any, message:string){
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
}
