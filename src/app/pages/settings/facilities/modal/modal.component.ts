import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LeafletComponent } from 'src/app/shared/map/leaflet.component';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { Districts } from 'src/app/core/constants/Places';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { EstadoActual, TipoEstructura } from 'src/app/core/constants/Features';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalFacilitiesComponent {
  @Input() accion!: string;
  @Input() row!: ComplejoDeportivo;
  @Output() emitList = new EventEmitter();

  tipoEstructuraList = Object.values(TipoEstructura);
  estadoComplejoList = Object.values(EstadoActual);
  distictList = Districts;

  tieneIluminacion: boolean = false;
  tieneVestuarios: boolean = false;
  tieneGraderias: boolean = false;

  submitted = false;
  complejoForm!: UntypedFormGroup;

  masterSelected!: boolean;
  
  constructor(
    private modalService: NgbModal,
    private complejosService: ComplejosService,
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
        size: 'lg'
    });
    modalRef.componentInstance.title = 'Buscar en Mapa';
    modalRef.componentInstance.form = true;
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
      console.log(this)
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
      console.log(datos)
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
        if (data['status'] === 'OK') {
          this.submitted = false;
          this.modalService.dismissAll();
          this.complejoForm.reset();
          this.emitList.emit();       
          this.notify('Complejo Deportivo registrado exitosamente!', 'success');
        } else {
          this.notify(data.payload, 'error');
        }
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
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      // Implement delete logic here
    } else {
      // Implement bulk delete logic here
    }
    this.deleteId = '';
    this.masterSelected = false;
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