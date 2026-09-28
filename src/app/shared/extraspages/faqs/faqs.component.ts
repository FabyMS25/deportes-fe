import { TokenStorageService } from 'src/app/core/services/token-storage.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { obtenerValorNumericoConfiguracion } from 'src/app/core/utils/configuracion-sistema.util';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';

import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { GlobalComponent } from 'src/app/global-component';
import { FAQCategory, TREE_DATA } from './estructure';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-faqs',
  templateUrl: './faqs.component.html',
  styleUrls: ['./faqs.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    NgbModule,
    SharedModule,
  ],
})

export class FaqsComponent implements OnInit {
  treeControl = new NestedTreeControl<ComplexNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<ComplexNode>();

  deadlinesUnavailable = false;
  systemConfigs: { [key: string]: ConfiguracionSistema } = {};
  readonly deadlineTypes = [
    { label: 'Puntuales por hora o persona', key: ClaveConfiguracion.HORAS_VALIDACION_PAGO },
    { label: 'Puntuales por evento', key: ClaveConfiguracion.HORAS_VALIDACION_PAGO_EVENTOS },
    { label: 'Recurrentes', key: ClaveConfiguracion.HORAS_VALIDACION_PAGO_RECURRENTES }
  ];


  superAdmin= GlobalComponent.super_admin;
  faqCategory = FAQCategory

  
  constructor(private storage: TokenStorageService) {
    this.dataSource.data = TREE_DATA
  }

  ngOnInit(): void {
    this.systemConfigs = this.storage.getConfigs() || {};
    this.deadlinesUnavailable = Object.keys(this.systemConfigs).length === 0;
  }

  deadlineText(key: ClaveConfiguracion): string {
    const value = obtenerValorNumericoConfiguracion(this.systemConfigs, key);
    return value !== undefined && value > 0 ? `${Math.trunc(value)} horas`
      : 'Consulte la fecha límite indicada en su reserva.';
  }



  hasChild = (_: number, node: ComplexNode) => !!node.children && node.children.length > 0;

  sendEmail() {
    const email = this.superAdmin.email;
    const subject = 'Consulta sobre Preguntas Frecuentes';
    const body = 'Hola, tengo una consulta sobre...';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  
  sendWhatsApp() {
    const phoneNumber = this.superAdmin.whatsApp; 
    const message = 'Hola, tengo una consulta sobre las Preguntas Frecuentes.';
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  }

}
interface ComplexNode {
  name: string;
  children?: ComplexNode[];
}
