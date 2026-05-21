import { Component, ViewChild } from '@angular/core';
import {DecimalPipe} from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';

import {CityAcronym}  from 'src/app/core/constants/Places';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { PassResetComponent } from '../password-reset/pass-reset.component';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { UserCivilStatus, UserDocType } from 'src/app/core/constants/UserData';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  providers: [ DecimalPipe]
})

export class ProfileComponent {

  CityAcronym=CityAcronym;
  userRole!: 'Contribuyente' | 'Admin' | 'Encargado';
  userAvatar = "default-profile1.png";
  userData!:any;
  userEmployee!: EncargadoComplejo;
  userContribuyente!: Contribuyente

  constructor(
    private authService:AuthenticationService, 
    private modalService: NgbModal,
    private router: Router
  ) {}

  ngOnInit(): void {
    const dataSaved = this.authService.currentUser();
      this.userAvatar=this.authService.getAvatar();
      this.userRole= this.authService.getUserRole();
      if(this.userRole==='Contribuyente'){
        this.userContribuyente = dataSaved;
      }else if(this.userRole === 'Encargado'){
        this.userEmployee = this.authService.staff();
        this.userData = dataSaved;
      }else{
        this.userData = dataSaved;
      }
  }

  public openModal() {
    const modalRef = this.modalService.open(PassResetComponent, {
        backdrop: 'static',
    });
    modalRef.componentInstance.userRole = this.userRole;
    modalRef.componentInstance.userData = this.userContribuyente || this.userData;
  }

  public goToSettings(): void {
    this.router.navigate(['/profile/profile-setting']);
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
  getCityDescription(expedido: any,getBy:string = 'id'): string {
    if(getBy ==='acronym'){
      const cityByDescription = CityAcronym.find(c => c.acronym === expedido);
      if (cityByDescription) {
        return cityByDescription.acronym;
      }  
    }else{
      const cityById = CityAcronym.find(c => c.id === expedido);  
      if (cityById) {
        return cityById.value;
      }
    }
    return expedido;
  }

  getFullName(user: any): string {
    return user?.nombreCompleto ||
      [user?.nombre, user?.primerApellido || user?.apPaterno, user?.segundoApellido || user?.apMaterno]
        .filter(Boolean)
        .join(' ') ||
      'No registrado';
  }

  getGenderText(value?: string): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'F' || normalized === 'FEMENINO') return 'Femenino';
    if (normalized === 'M' || normalized === 'MASCULINO') return 'Masculino';
    return 'No especificado';
  }

  getCivilStatusText(value?: string): string {
    return UserCivilStatus.find(status => status.type === value || status.description === value)?.description || value || 'No registrado';
  }

  getDocumentTypeText(value?: string): string {
    return UserDocType.find(type => type.type === value || type.description === value)?.description || value || 'Documento';
  }
   
}
