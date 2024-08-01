import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {read, utils} from 'xlsx';
import { map, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { SharedModule } from 'src/app/shared/shared.module';

import { EncargadoService } from 'src/app/core/services/api/encargado.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';

@Component({
  selector: 'app-modal-import',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    NgbModule,
    SharedModule,
  ],
  templateUrl: './modal-import.component.html',
  styleUrl: './modal-import.component.scss'
})

export class ModalImportComponent {
  @Input() itemsList!: any[];
  @Input() titles!:any[];
  @Output() listaItems = new EventEmitter();

  xlsxData: any[]=[];
  selectedItems: any[] = [];
  loading: boolean = false;
  listaTemporal: any[] = [];
  
  constructor(
      private activeModal: NgbActiveModal,
      private service: EncargadoService,
      private complejoService: ComplejosService
  ) {}

  ngOnInit(): void {}

  cerrarModal() {
      this.activeModal.close();
  }

  cargarDatosDesdeExcel(event: any) {
    const file = event.target.files[0];
    if(file){
        const reader = new FileReader();
        reader.readAsBinaryString(file);
        
        reader.onload = (e: any) => {
            let workBook = read(reader.result, {type: 'binary'});
            let sheetNames = workBook.SheetNames;
            this.xlsxData = utils.sheet_to_json(
                workBook.Sheets[sheetNames[0]]
            );
            this.listaTemporal = utils.sheet_to_json(
                workBook.Sheets[sheetNames[0]]
            );
            if (this.xlsxData.length <= 0) {
                this.loading = false;
                Swal.fire({ text: 'Registro ya existeEl archivo no tiene datos para importar', confirmButtonColor: '#299cdb' });
            }
        };
    }
  }
   
  getSeleccionados(items: any[]) {
      this.selectedItems = items;
  }

  public buscarItem(event: any) {
    const val = event.target.value.toLowerCase();
    const temp = this.listaTemporal.filter((l) => {
        return (
            l.Nombre.toLowerCase().indexOf(val) !== -1 ||
            !val
        );
    });
    this.xlsxData = temp;
  }

  public async createRegisterfromXlsx(xlsxData: any) {
    this.loading = true;
    const createPromises: Promise<void>[] = [];
      for (let i = 0; i < xlsxData.length; i++) {
        let record: any = {
            userUuid: '' + xlsxData[i].userUuid,
            nombre: '' + xlsxData[i].Nombre,
            telefono: '' + xlsxData[i].Telefono,
            horaEntrada: '' + xlsxData[i]['Hora Entrada'],
            horaSalida: '' + xlsxData[i]['Hora Salida'],
            complejoDto: null
        };
        const createPromise = this.searchData(xlsxData[i].Complejo)
          .pipe(
            map(complejoDto => {
              record.complejoDto = complejoDto;
              return record;
            }),
          )
          .toPromise()
          .then(async (recordWithComplejo) => {
            if (recordWithComplejo && !this.recordExists(recordWithComplejo)) {
              await this.createRecord(recordWithComplejo);
            } else if (recordWithComplejo) {
              Swal.fire({ text: 'Registro ya existe', confirmButtonColor: '#299cdb' });
            }
          });      
        createPromises.push(createPromise);
      }
      await Promise.all(createPromises);
      this.loading = false;
      this.activeModal.close();
      this.listaItems.emit();
  }
  
    private searchData(nombre: string): Observable<any> {
      return this.complejoService.getAll().pipe(
        map((response: any) => {
          if (response['status'] === 'OK') {
            const list: any[] = response['payload'];
            const foundItem = list.find(item => item.nombre === nombre);
            if (!foundItem) {
              throw new Error('Complejo not found');
            }
            return foundItem;
          } else {
            throw new Error('Invalid response from server');
          }
        })
      );
    }
  
  private recordExists(registro: any): boolean {
    return this.itemsList.some(item => item.userUuid === registro.userUuid);
  }

  private async createRecord(datos: any) {
    try {
      const data = await this.service.save(datos).toPromise();
      Swal.fire({ text: 'Registro Creado con éxito', confirmButtonColor: '#299cdb' });
    } catch (error) {
      Swal.fire({ text: 'Error al crear el registro', icon: 'error', confirmButtonColor: '#299cdb' });
    }
  }
}
