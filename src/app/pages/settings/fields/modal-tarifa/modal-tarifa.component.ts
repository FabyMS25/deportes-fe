import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { BehaviorSubject, catchError, combineLatest, forkJoin, map, Observable, of, startWith, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { TarifaService } from 'src/app/core/services/api/tarifa.service';
import { Categoria } from 'src/app/core/models/categoria.model';
import { TarifaCategoriesService } from 'src/app/core/services/api/tarifa-categorias.service';
import { TipoCobro } from 'src/app/core/data/TipoCobro';
import { Tarifa } from 'src/app/core/models/tarifa.model';

@Component({
  selector: 'app-modal-tarifa',
  templateUrl: './modal-tarifa.component.html',
  styleUrl: './modal-tarifa.component.scss'
})
export class ModalTarifaComponent {
  @Input() accion!: string;
  @Input() row!: campoDeportivo;
  @Output() listaItems = new EventEmitter();
  @Input() categoryList:Categoria[]=[];
  tipoList= TipoCobro

  submitted = false;

  form!: FormGroup;
  fieldsForm!: FormArray;

  
  @ViewChild('deleteConfirmation', { static: true }) deleteConfirmation!: TemplateRef<any>;

  private selectedTipoSubject = new BehaviorSubject<string | null>(null);
  private selectedTipo$ = this.selectedTipoSubject.asObservable();
  filteredCategories$!: Observable<any[]>;

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private tarifaService: TarifaService,
    private tarifaCategoryService: TarifaCategoriesService
  ) { }

  ngOnInit() {    
    this.fieldsForm = this.formBuilder.array([]);
    this.form = this.formBuilder.group({
      fieldsForm: this.fieldsForm
    });

    this.initFilteredCategories();
    this.formDataSet();
  }
  
  initFilteredCategories() {
    this.filteredCategories$ = combineLatest([
      this.selectedTipo$,
      this.form.valueChanges.pipe(startWith(null))
    ]).pipe(
      map(([selectedTipo, _]) => {
        if (!selectedTipo) return this.categoryList ;
        return this.categoryList.filter(category => category.tipo === selectedTipo);
      })
    );
  }

  private formDataSet() {
    if (this.row.tarifasDtoList && this.row.tarifasDtoList.length > 0) {
      this.row.tarifasDtoList.forEach((tarifa: any) => {
        this.fieldsForm.push(this.createTarifaFormGroup(tarifa));
      });
    } else {
      this.fieldsForm.push(this.createTarifaFormGroup());
    }
  }

  createTarifaFormGroup(tarifa: any = {}): FormGroup { 
    const tipo = tarifa.categoriaDtoList?.length > 0 ? tarifa.categoriaDtoList[0].categoriaDto.tipo : '';
    return this.formBuilder.group({
      uuid: [tarifa.uuid || ''],
      costo: [tarifa.costo || '', Validators.required],
      desde: [tarifa.desde || ''],
      hasta: [tarifa.hasta || ''],
      descripcion: [tarifa.descripcion || ''],
      tipo: [tipo, Validators.required],
      categorias: [tarifa.categoriaDtoList?.map((cat:any) => cat.categoriaDto) || [], [Validators.required, this.categoriasTipoValidator]],
      categoriaDtoList: [tarifa.categoriaDtoList || []],
    });
  }

  categoriasTipoValidator(control: AbstractControl): ValidationErrors | null {
    const categorias = control.value;
    const tipo = control.parent?.get('tipo')?.value;
    if (!categorias || !tipo) {
      return null;
    }
    const allCategoriesMatchTipo = categorias.every(
      (category: any) => category.tipo === tipo
    );
    return allCategoriesMatchTipo ? null : { invalidTipo: true };
  }

  addTariffForm() {
    this.fieldsForm.push(this.createTarifaFormGroup());
  }
  removeTariff(index: number) {
    const tarifaGroup = this.fieldsForm.at(index);
    const uuid = tarifaGroup.get('uuid')?.value;
  
    if (uuid) {
      const modalRef = this.modalService.open(this.deleteConfirmation);
      modalRef.result.then(
        (result) => {
          if (result === 'delete') {
            this.deleteTarifa(uuid).subscribe({
              next: (result) => {
                if (result) {
                  this.fieldsForm.removeAt(index);
                }
              },
              error: (err) => {
                console.error('Error while deleting tarifa', err);
              }
            });
          }
        },
        (reason) => {
          console.log('Delete operation canceled', reason);
        }
      );
    } else {
      this.fieldsForm.removeAt(index);
    }
  } 

  onTipoChange(index: number) {
    const tarifa = this.fieldsForm.at(index);
    const selectedTipo = tarifa.get('tipo')?.value;
    this.selectedTipoSubject.next(selectedTipo);
    tarifa.get('categorias')?.setValue([]);
  }
  onCategoriesChange(index: number) {
    const tarifa = this.fieldsForm.at(index);
    tarifa.get('categorias')?.updateValueAndValidity();
  }
  
  saveData() {
    const formArray = this.form.get('fieldsForm') as FormArray;
    const saveObservables :any[]= [];
    formArray.controls.forEach((control: AbstractControl) => {
      const tarifaData:Tarifa = {
        costo: control.value.costo,
        desde: control.value.desde,
        hasta: control.value.hasta,
        descripcion: control.value.descripcion,
        canchasDto: this.row,
        categoriaDtoList: this.mergeCategories(control.value.categoriaDtoList, control.value.categorias)
      };      
      if (control.value.uuid) {
        tarifaData.uuid = control.value.uuid;
        saveObservables.push(this.updateTariff(tarifaData));
      } else {
        saveObservables.push(this.addTariff(tarifaData));
      }
    });
    forkJoin(saveObservables).subscribe({
      next: (result) => {
        if (result !==null) {
          this.notify('Tarifas, y categorias exitosamente creados', 'success');
          this.fieldsForm.reset();
          this.listaItems.emit();
          this.modalService.dismissAll();
        }
      },
      error: (error) => {
        this.notify('Error en proceso de Guardar: ' + error, 'error');
      }
    });
  }
  
  mergeCategories(categoriaTarifaDtoList: any[], categorias: any[]): any[] {
    const mergedList: any[] = [];
    const existingCategoriaTarifaMap = new Map(
      categoriaTarifaDtoList.map(item => [item.categoriaDto.uuid, item])
    );
    existingCategoriaTarifaMap.forEach(element => {
      if(!categorias.find((categoria:any) => categoria.uuid === element.categoriaDto.uuid)){
        console.log("delete", element.uuid)
        this.tarifaCategoryService.delete(element.uuid).subscribe()
      }
    });
    categorias.forEach(categoria => {
      const existingItem = existingCategoriaTarifaMap.get(categoria.uuid);  
      if (!existingItem) {
        mergedList.push({
          uuid: '',
          estado: false,
          categoriaDto: categoria,
          // tarifaDto: null 
        });
      }
    });  
    return mergedList;
  }

/* API requests  */
private addTariff(datos: Tarifa): Observable<any> {
  return this.tarifaService.save(datos).pipe(
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
private updateTariff(datos: Tarifa): Observable<any> {
  return this.tarifaService.update(datos).pipe(
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
private deleteTarifa(uuid: string): Observable<boolean> {
  return this.tarifaService.delete(uuid).pipe(
    tap((data: any) => {
      if (data.status === 'OK') {
        this.notify('Tarifa eliminada exitosamente', 'success');
      } else {
        Swal.fire({ text: 'No se pudo eliminar la Tarifa', confirmButtonColor: '#299cdb' });
      }
    }),
    catchError((error) => {
      Swal.fire({ text: 'No se pudo eliminar la Tarifa', confirmButtonColor: '#299cdb' });
      return of(false);
    }),
    map((data: any) => data.status === 'OK')
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
