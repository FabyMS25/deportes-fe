import { Component, ViewChild } from '@angular/core';
import {DecimalPipe} from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import {CityAcronym}  from 'src/app/core/constants/Places';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { PassResetComponent } from '../password-reset/pass-reset.component';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';

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
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    const dataSaved = this.authService.currentUser();
      this.userAvatar=this.authService.getAvatar();
      this.userRole= this.authService.getUserRole();
      if(this.userRole==='Contribuyente'){
        this.userContribuyente = dataSaved;
      }else if(this.userRole === 'Encargado'){
        const funcionarioString = localStorage.getItem('assignaments');
        this.userEmployee =  funcionarioString ? JSON.parse(funcionarioString) : null;
        this.userData = dataSaved.designacion.personaDto;
      }else{
        this.userData = dataSaved.designacion.personaDto;
      }
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
   
}
