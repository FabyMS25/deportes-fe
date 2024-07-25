import { Component, EventEmitter, Input, Output } from '@angular/core';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { HorariosService } from 'src/app/core/services/api/horarios.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { Horario } from 'src/app/core/models/horario.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-modal-schedule',
  // standalone: true,
  // imports: [CommonModule],
  templateUrl: './modal-schedule.component.html',
  styleUrl: './modal-schedule.component.scss'
})
export class ModalScheduleComponent {
  @Input() accion!: string;
  @Input() row!: campoDeportivo;
  @Output() listaItems = new EventEmitter();

  placeholder='Seleccione una opción'
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

  submitted = false;
  masterSelected!: boolean;
  checkedList: any;

  // fieldsForm!: FormArray;
  multiDefaultOption='';
  // Api Data
  allcompany: any;
  searchResults: any;
  searchTerm: any;
  canchasList:any[]=[];
  complejosList:any[]=[];

  constructor(private modalService: NgbModal,
    private horariosService: HorariosService,
    private formBuilder: UntypedFormBuilder,
  ) { }

  form!: FormGroup;
  fieldsForm!: FormArray;
  
  ngOnInit() {
    this.fieldsForm = this.formBuilder.array(
      this.dias.map(dia => this.formBuilder.group({
        uuid:[''],
        dia: [dia],
        abierto: [false],
        horaInicio: [''],
        horaFin: [''],
        canchasDto:[this.row]
      }))
    );
  
    this.form = this.formBuilder.group({
      fieldsForm: this.fieldsForm
    });
  }

  
  saveData() {
    const formArray = this.form.get('fieldsForm') as FormArray;
    const saveObservables :any[]= [];
  
    formArray.controls.forEach((abstractControl: AbstractControl) => {
      const control = abstractControl as FormGroup;
      if (control.value.abierto) {
        const datos = {
          // uuid: control.value.uuid,
          dia: control.value.dia,
          abierto: control.value.abierto,
          horaInicio: control.value.horaInicio,
          horaFin: control.value.horaFin,
          canchasDto: this.row
        };
  
        saveObservables.push(this.horariosService.save(datos));
      }
    });
  
    forkJoin(saveObservables).subscribe({
      next: (results) => {
        this.notify('Todos los horarios han sido guardados exitosamente', 'success');
        this.modalService.dismissAll();
      },
      error: (error) => {
        this.notify('Error al guardar los horarios: ' + error, 'error');
      }
    });
  }
  public closeModal() {
    this.accion = '';
    this.fieldsForm.enable();
    this.modalService.dismissAll();
    this.fieldsForm.reset();
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
