import { Component, EventEmitter, Input, Output } from '@angular/core';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { forkJoin, Observable, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { TarifaService } from 'src/app/core/services/api/tarifa.service';
import { Categoria } from 'src/app/core/models/categoria.model';
import { TarifaCategoriesService } from 'src/app/core/services/api/tarifa-categorias.service';

@Component({
  selector: 'app-modal-tarifa',
  // standalone: true,
  // imports: [CommonModule],
  templateUrl: './modal-tarifa.component.html',
  styleUrl: './modal-tarifa.component.scss'
})
export class ModalTarifaComponent {
  @Input() accion!: string;
  @Input() row!: campoDeportivo;
  @Output() listaItems = new EventEmitter();
  @Input() categoryList:Categoria[]=[];

  submitted = false;

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private tarifaService: TarifaService,
    private categoriesService: TarifaCategoriesService
  ) { }

  form!: FormGroup;
  fieldsForm!: FormArray;
  

  ngOnInit() {
    this.fieldsForm = this.formBuilder.array([
      this.createTarifaFormGroup()
    ]);

    this.form = this.formBuilder.group({
      fieldsForm: this.fieldsForm
    });
  }

  createTarifaFormGroup(): FormGroup {
    return this.formBuilder.group({
      costo: [0, Validators.required],
      desde: [""],
      hasta: [""],
      allDay: [true],
      descripcion: [""],
      canchasDto:this.row,
      categorias: [[], Validators.required],
    });
  }

  addTarifa() {
    this.fieldsForm.push(this.createTarifaFormGroup());
  }
 
  removeTarifa(index: number) {
    this.fieldsForm.removeAt(index);
  }


saveData() {
  const formArray = this.form.get('fieldsForm') as FormArray;
  const saveObservables: Observable<any>[] = [];

  formArray.controls.forEach((abstractControl: AbstractControl) => {
    const control = abstractControl as FormGroup;
    if (control.valid) {
      const tarifaData = {
        costo: control.value.costo,
        desde: control.value.desde,
        hasta: control.value.hasta,
        descripcion: control.value.descripcion,
        categorias: control.value.categorias,
        canchasDto: this.row  
      };

      const saveTarifaAndCategories = this.tarifaService.save(tarifaData).pipe(
        switchMap((savedTarifa: any) => {
          console.log("tarifa ",savedTarifa)
          const categorySaveObservables = control.value.categorias.map((categoria: any) => {
            const tarifaCategoriaData = {
              tarifaDto: {uuid:savedTarifa.payload.uuid},
              categoriaDto:{uuid: categoria.uuid}  // Assuming each categoria object has a uuid property
            };
            return this.categoriesService.save(tarifaCategoriaData);
          });
          return forkJoin(categorySaveObservables);
        })
      );

      saveObservables.push(saveTarifaAndCategories);
    }
  });

  if (saveObservables.length > 0) {
    forkJoin(saveObservables).subscribe({
      next: (results) => {
        this.notify('Todas las tarifas y sus categorías han sido guardadas exitosamente', 'success');
        this.modalService.dismissAll();
      },
      error: (error) => {
        this.notify('Error al guardar las tarifas o categorías: ' + error, 'error');
      }
    });
  } else {
    this.notify('No hay tarifas válidas para guardar', 'warning');
  }
}
saveDataNoCategory() {
  const formArray = this.form.get('fieldsForm') as FormArray;
  const saveObservables: any[] = [];

  formArray.controls.forEach((abstractControl: AbstractControl) => {
    const control = abstractControl as FormGroup;
    if (control.valid) { 
      const datos = {
        costo: control.value.costo,
        desde: control.value.desde,
        hasta: control.value.hasta,
        descripcion: control.value.descripcion,
        categorias: control.value.categorias,
        canchasDto: this.row  
      };
      console.log(datos);
      saveObservables.push(this.tarifaService.save(datos));
    }
  });

  if (saveObservables.length > 0) {
    forkJoin(saveObservables).subscribe({
      next: (results) => {
        this.notify('Todas las tarifas han sido guardadas exitosamente', 'success');
        // You might want to close the modal or reset the form here
      },
      error: (error) => {
        this.notify('Error al guardar las tarifas: ' + error, 'error');
      }
    });
  } else {
    this.notify('No hay tarifas válidas para guardar', 'warning');
  }
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
