import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output, TemplateRef, ViewChild, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder,FormArray, FormGroup, UntypedFormBuilder,UntypedFormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { LeafletComponent } from 'src/app/shared/map/leaflet.component';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { Districts } from 'src/app/core/constants/Places';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { TipoEstructura } from 'src/app/core/constants/Features';
import { EstadoActual } from 'src/app/core/constants/Estados';

@Component({
  selector: 'app-modal-facility',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    TranslateModule    
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-facility.component.html',
  styleUrl: './modal-facility.component.scss'
})
export class ModalFacilitiesComponent {
  @Input() accion!: string;
  @Input() row!: ComplejoDeportivo;
  @Output() emitList = new EventEmitter();

  tipoEstructuraList = Object.values(TipoEstructura);
  estadoComplejoList = Object.values(EstadoActual);
  distictList = Districts;

  submitted = false;
  complejoForm!: UntypedFormGroup;
  
  @ViewChild('deleteModel') deleteModel!: ElementRef;  
  
  constructor(
    private modalService: NgbModal,
    private complejosService: FacilitiesService,
    private formBuilder: UntypedFormBuilder,
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.formDataSet();
  }

  private initForm() {
    this.complejoForm = this.formBuilder.group({
      uuid: [''],
      nombre: ['', [Validators.required]],
      telefonoPrincipal: [''],
      tipoEstructura: ['', [Validators.required]],
      estadoActual: [EstadoActual.ACTIVO],
      tieneIluminacion: [false],
      tieneVestuarios: [false],
      tieneGraderias: [false],
      distrito: ['', [Validators.required]],
      ubicacion: ['', [Validators.required]],
      latitud: ['', [Validators.required]],
      longitud: ['', [Validators.required]],
      observaciones: ['']
    });
  }

  get form() {
    return this.complejoForm.controls;
  }

  private formDataSet() {
    if (this.row && this.accion !== '') {
      this.complejoForm.patchValue({
        uuid: this.row.uuid,
        nombre: this.row.nombre,
        telefonoPrincipal: this.row.telefonoPrincipal,
        tipoEstructura: this.row.tipoEstructura,
        estadoActual: this.row.estadoActual || EstadoActual.ACTIVO,
        tieneIluminacion: this.row.tieneIluminacion || false,
        tieneVestuarios: this.row.tieneVestuarios || false,
        tieneGraderias: this.row.tieneGraderias || false,
        distrito: this.row.distrito,
        ubicacion: this.row.ubicacion,
        latitud: this.row.latitud,
        longitud: this.row.longitud,
        observaciones: this.row.observaciones
      });
    }
  }

  public openMapa() {
    const modalRef = this.modalService.open(LeafletComponent, {
        backdrop: 'static',
        size: 'lg',
        keyboard: false
    });
    modalRef.componentInstance.title = 'Buscar en Mapa';
    modalRef.componentInstance.form = true;
    if(this.row){
      modalRef.componentInstance.latitud = this.row.latitud;
      modalRef.componentInstance.longitud = this.row.longitud;
      modalRef.componentInstance.direccion = this.row.ubicacion;
    }
    modalRef.componentInstance.latLngEmitter.subscribe((data: any) => {
      const latitud = data.lat;
      const longitud = data.lng;
      const direccion = data.dir;
      this.complejoForm.get('ubicacion')?.patchValue(direccion);
      this.complejoForm.get('latitud')?.patchValue(latitud);
      this.complejoForm.get('longitud')?.patchValue(longitud);
    });
  }

  saveData() {
    this.submitted = true;
    if (this.complejoForm.valid) {
      this.complejoForm.enable();
      const datos: ComplejoDeportivo = {
        nombre: this.complejoForm.value.nombre,
        telefonoPrincipal: this.complejoForm.value.telefonoPrincipal,
        tipoEstructura: this.complejoForm.value.tipoEstructura,
        estadoActual: this.complejoForm.value.estadoActual,
        tieneIluminacion: this.complejoForm.value.tieneIluminacion,
        tieneVestuarios: this.complejoForm.value.tieneVestuarios,
        tieneGraderias: this.complejoForm.value.tieneGraderias,
        distrito: this.complejoForm.value.distrito,
        ubicacion: this.complejoForm.value.ubicacion,
        latitud: this.complejoForm.value.latitud,
        longitud: this.complejoForm.value.longitud,
        observaciones: this.complejoForm.value.observaciones
      };
      if (this.complejoForm.get('uuid')?.value) {
        datos.uuid = this.complejoForm.value.uuid;
        this.updateData(datos);
      } else {
        datos.fechaCreacion = new Date();
        this.addData(datos);
      }
    } else {
      this.notify('Formulario Inválido!', 'error');
    }
  }
  
  private addData(datos: ComplejoDeportivo) {
    this.complejosService.save(datos).subscribe({
      next: (data: any) => {
        this.submitted = false;
        this.modalService.dismissAll();
        this.complejoForm.reset();
        this.emitList.emit();       
        this.notify('Complejo Deportivo registrado exitosamente!', 'success');
      },
      error: (error) => {
        this.notify('Error: ' + error.message, 'error');
      }
    });
  }

  private updateData(datos: ComplejoDeportivo) {
    this.complejosService.update(datos).subscribe({
      next: (data: any) => {
        this.submitted = false;
        this.modalService.dismissAll();
        this.complejoForm.reset();
        this.emitList.emit();
        this.notify('Complejo Deportivo actualizado exitosamente!', 'success');
      },
      error: (error) => {
        this.submitted = false;
        this.modalService.dismissAll();
        this.complejoForm.reset();
        this.notify('No se pudo actualizar el complejo!', 'error');
      }
    });
  }

  /**
  * Delete model
  */
  deleteData(uuid: string) {
    this.complejosService.delete(uuid).subscribe({
      next: (message: string) => {
        this.submitted = false;
        this.notify(message || 'Complejo eliminado exitosamente', 'success');
        this.modalService.dismissAll();
        this.emitList.emit();
        this.closeModal();
      },
      error: err => {
        this.submitted = false;
        this.notify(err.message || 'No se pudo eliminar el registro!', 'error');
      }
    });
  }

  public closeModal() {
    this.accion = '';
    this.complejoForm.enable();
    this.modalService.dismissAll();
    this.complejoForm.reset();
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
