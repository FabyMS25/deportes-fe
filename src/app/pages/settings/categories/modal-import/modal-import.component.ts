import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {read, utils} from 'xlsx';
import Swal from 'sweetalert2';
import { SharedModule } from 'src/app/shared/shared.module';

import { CategoriasService } from 'src/app/core/services/api/categorias.service';

@Component({
  selector: 'app-categorias-import',
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
      private service: CategoriasService
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
            l.nombre.toLowerCase().indexOf(val) !== -1 ||
            !val
        );
    });
    this.xlsxData = temp;
  }

  public async createRegisterfromXlsx(xlsxData: any) {
      this.loading = true;
      for (let i = 0; i < xlsxData.length; i++) {
          let record: any = {
              codigo: '' + xlsxData[i].codigo,
              nombre: '' + xlsxData[i].nombre,
              tipo: '' + xlsxData[i].tipo,
          };
          if (!this.rexordExist(record)) {
              await this.createRecord(record);
          } else {
              Swal.fire({ text: 'Registro ya existe', confirmButtonColor: '#299cdb' });
          }
      }
      this.loading = false;
      this.activeModal.close();
      this.listaItems.emit();
  }

  private rexordExist(registro: any): boolean {
    return this.itemsList.some(item => item.nombre === registro.nombre);
  }

  private async createRecord(datos: any) {
    try {
      const data = await this.service.save(datos).toPromise();
      Swal.fire({ text: 'Registro Creado con éxito', confirmButtonColor: '#299cdb' });
    } catch (error) {
    //   console.error('No se pudo Guardar los datos!', error);
      Swal.fire({ text: 'Error al crear el registro', icon: 'error', confirmButtonColor: '#299cdb' });
    }
  }
}
