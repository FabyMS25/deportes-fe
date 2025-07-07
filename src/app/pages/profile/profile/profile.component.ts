import { Component, ViewChild } from '@angular/core';
import {DecimalPipe} from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import {CityAcronym}  from 'src/app/core/constants/Places';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { PassResetComponent } from '../password-reset/pass-reset.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  providers: [ DecimalPipe]
})

export class ProfileComponent {

  CityAcronym=CityAcronym;
  userType:string='';
  userData: any;
  persona:any = null;
  funcionario!:any;//DesignacionFuncionario;
  avatar="default-profile1.png";
  // userRol =UserRol;

  constructor(
    private authService:AuthenticationService, 
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
      const token = window.sessionStorage.getItem('auth-token');
      const userString = window.sessionStorage.getItem('currentUser');
      this.userData =userString ? JSON.parse(userString) : null;
      this.avatar=this.authService.getAvatar();
      if(token==='isContribuyente'){
        this.persona =this.userData;
        this.userType='Contribuyente';
      }else{
        this.userType='Administrador';
        this.persona =this.userData.designacion.personaDto;
        const funcionarioString = localStorage.getItem('assignaments');
        this.funcionario =funcionarioString ? JSON.parse(funcionarioString) : null;
        if(this.funcionario)this.userType='Encargado'; 
      }
  }

  // openModal(content:any) {
  //   this.modalService.open(content, { centered: true });
  // }
  public openModal() {
    const modalRef = this.modalService.open(PassResetComponent, {
        backdrop: 'static',
    });
    modalRef.componentInstance.userData = this.userData;
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
  getCityDescription(ciExpedido: any): string {
    const cityById = CityAcronym.find(c => c.id === ciExpedido);  
    if (cityById) {
      return cityById.value;
    }
    // const cityByDescription = CityAcronym.find(c => c.description === ciExpedido);
    // if (cityByDescription) {
    //   return cityByDescription.description;
    // }  
    return ciExpedido;
  }
   
}
