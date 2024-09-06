import { Component, EventEmitter, Input, Output } from '@angular/core';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder } from '@angular/forms';
import { HorariosService } from 'src/app/core/services/api/horarios.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { catchError, forkJoin, Observable, of, switchMap } from 'rxjs';
import { Horario } from 'src/app/core/models/horario.model';

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
    this.formDataSet();
  }
  
  private formDataSet(): void {
    if(this.row.horarioDtoList){
      this.row.horarioDtoList.forEach((horario) => {
        const index = this.dias.indexOf(horario.dia);
        if (index !== -1) {
          const control = this.fieldsForm.at(index) as FormGroup;
          control.patchValue({
            uuid: horario.uuid,
            dia: horario.dia,
            abierto: horario.abierto,
            horaInicio: horario.horaInicio,
            horaFin: horario.horaFin,
            canchasDto: this.row
          });
        }
      });
    }
  }
  
  saveData() {
    const formArray = this.form.get('fieldsForm') as FormArray;
    const saveObservables :any[]= [];
  
    formArray.controls.forEach((control: AbstractControl) => {
      // const control = abstractControl as FormGroup;
      if (control.value.abierto) {
        const horarioData: Horario = {
          // uuid: control.value.uuid,
          dia: control.value.dia,
          abierto: control.value.abierto,
          horaInicio: control.value.horaInicio,
          horaFin: control.value.horaFin,
          canchasDto: this.row
        };
          
        if (control.value.uuid) {
          horarioData.uuid = control.value.uuid;
          saveObservables.push(this.updateSchedule(horarioData));
        } else {
          saveObservables.push(this.addSchedule(horarioData));
        }
      }
    });
  
    forkJoin(saveObservables).subscribe({
      next: (results) => {
        this.notify('Todos los horarios han sido guardados exitosamente', 'success');
        this.fieldsForm.reset();
        this.listaItems.emit();
        this.modalService.dismissAll();
      },
      error: (error) => {
        this.notify('Error en proceso de Guardar: ' + error, 'error');
      }
    });
  }

  /* API requests */
private addSchedule(datos: Horario): Observable<any> {
  return this.horariosService.save(datos).pipe(
    switchMap((result: any) => {
      if(result.status === 'OK'){
        return of(result);
      }else{
        return of(null);
      }
    }),
    catchError((error) => {
      return of(null);
    })
  );
}
private updateSchedule(datos: Horario): Observable<any> {
  return this.horariosService.update(datos).pipe(
    switchMap((result: any) => {
      if(result.status === 'OK'){
        return of(result);
      }else{
        return of(null);
      }
    }),
    catchError((error) => {
      return of(null);
    })
  );
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
