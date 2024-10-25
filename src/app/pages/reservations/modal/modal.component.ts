import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reserva } from 'src/app/core/models/reserva.models';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import Swal from 'sweetalert2';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { CityAcronym } from 'src/app/core/constants/Places';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {

  @Input() accion!: string;
  @Input() row!: Reserva;
  // @Input() cancha: any = '';
  // @Input() contribuyente: any = '';
  @Input() canActivate!: any[] 
  @Output() emitList = new EventEmitter();

  CityAcronym = CityAcronym;

  reservationForm!: FormGroup;
  submitted = false;

  canchasList=[];
  contribuyentesList=[];
  
  // @ViewChild('consultModel') consultModel: any; 

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private reservasService: ReservaService,
    private canchasService:CamposDeportivoService,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService,
    private pagoService: PagoService,
  ) {}

   
  ngOnInit(): void {    
      this.getFields();
      this.getTaxpayers();
      this.initForm();
  }
 
  private initForm(){
    console.log(this.row)
    this.reservationForm = this.formBuilder.group({
      fechaReserva: [this.row.fechaReserva, Validators.required],
      horaEntrada: [this.row.horaEntrada, [Validators.required]],
      horaSalida: [this.row.horaSalida, [Validators.required]],
    });
  }

  get form() {
    return this.reservationForm.controls;
  }
 
  /**
  * Save
  */
  saveData() {
    this.submitted = true;
    if (this.reservationForm.valid) {
      let datos: any = {
        ...this.row,
        ...this.reservationForm.value,
      };
      
      if (this.reservationForm.get('uuid')?.value) {
          datos.uuid=this.reservationForm.value.uuid,
          this.updateData(datos);
      } 
      
    }else {
        this.notify('Formulario Invalido!', 'error');
    }
  }    

  showLoading: boolean = false;
  selectedItems: any[] = [];
  consultResults: any[] = [];
  async consultModal(content: any, data: any) {
    if (this.selectedItems.length === 0) {
      this.selectedItems.push(this.row); 
    }    
    this.consultResults = [];
    for (const item of this.selectedItems) {
      this.showLoading = true;      
      try {
        this.showLoading = true;
        const result = await this.consultData(item); 
        this.consultResults.push(result);
      } catch (error) {
        console.error("Error during consultation:", error);
      } finally {
        this.showLoading = false;
        this.modalService.open(content, { centered: true });
        
        this.selectedItems = [];
        // this.getReservations();
        this.emitList.emit();
          // this.modalService.dismissAll('close click');
      }
    }
  }
  /**
   * Delete event
   */  
  deleteModal(content: any, data: any) {
    this.accion = content
    this.motivo ='';
  }
  /* API REQUESTS */
  private getFields(){
    this.canchasService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.canchasList = data.payload;
        }else{
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      }
    });
  }
  private getTaxpayers(){
    this.contribuyentesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.contribuyentesList = data.payload;
        }else{
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      }
    });
  }

  updateReserva(data: Reserva): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservasService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          }else{
            reject(resp.payload);
          }
          resolve(resp);
        },
        error: (error) => {
          console.error("Error updating reserva:", error);
          reject(error);
        }
      });
    });
  }

  updateData(datosUnit:Reserva) {
      this.reservasService.update(datosUnit).subscribe({
          next: (data: Reserva) => {
            this.Editposition();
            this.submitted = false;
            this.onCloseModal();
            this.emitList.emit();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.notify('No se pudo Actualizar los datos! '+error, 'error');
          }
      })
  }

/* RUAT REQUESTS */
motivo: string = '';
observation: string = '';
annularData(formValues: any) {
  let text: string = '';
  const requestData = {
    numeroTasa: this.row.numeroTasa,
    motivo: formValues.motivo,
    observacion: formValues.observation
  };

  if (formValues) {
    this.showLoading = true;

    this.ruatService.cancelTasa(requestData).subscribe({
      next: (resp: any) => {
        this.showLoading = false;

        if (resp['status'] === 'OK') {
          text = resp.payload['mensaje'];
          this.row.estadoReserva = 'Anulado'
          this.reservasService.update(this.row).subscribe()
        } else {
          text = resp.payload;
        }
        let timerInterval: any;
        Swal.fire({
          title: 'Anulado!',
          text: text,
          icon: 'success',
          confirmButtonColor: '#299cdb',
          timer: 5000,
          timerProgressBar: true,
          willClose: () => {
            clearInterval(timerInterval);
          },
        });
        this.emitList.emit();
        this.modalService.dismissAll('close click');
      },
      error: (error) => {
        // Hide the loading spinner or indicator
        this.showLoading = false;

        console.error('Error:', error);
        text = 'Error al realizar la consulta';
        Swal.fire({
          title: 'Error!',
          text: text,
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      },
    });
  } else {
    text = 'No se pudo obtener el dato seleccionado';
    Swal.fire({
      title: 'Error!',
      text: text,
      icon: 'error',
      confirmButtonColor: '#d33',
    });
  }
}

async consultData(item: any): Promise<any> {
  if (!item) {
    return { item, text: 'No se pudo obtener el dato seleccionado', type: 'warning' };
  }  
  try {
    const nroTasa = item.numeroTasa;
    const resp: any = await this.ruatService.consultaPagoTasa(nroTasa).toPromise();

    if (resp['status'] !== 'OK') {
      return { item, text: "La Tasa y Otro Ingreso no tiene pagos", type: 'warning' };
    }
    if (!resp.payload.continuarFlujo) {
      return { item, text: resp.payload.observacion, type: 'warning' };
    }

    let text = resp.payload.observacion;  
    if (item.estadoReserva === 'Pendiente') {
      let pago = resp.payload.pagoTasa;
      const [day, month, year] = pago.fechaPago.split('/');
      pago.fechaPago = `${year}-${month}-${day}`;
      pago.reservasDto = item;  
      try {
        const pagoResp: any = await this.pagoService.save(pago).toPromise();
        if (pagoResp.status === 'OK') {
          item.estadoReserva = 'Pagado';
          item = await this.updateReserva(item);
          return { item, text, type:'success' };
        }
      } catch (error) {
        console.error('Error saving pago:', error);
        return { item, text: 'Error al guardar el pago', type: 'error' };
      }
    }
    return { item, text, type:'info' };
  } catch (error) {
    console.error('Error:', error);
    return { item, text: 'Error al realizar la consulta', type: 'error' };
  }
}

  /* commun functions */ 
  public onCloseModal() {
    this.accion = '';    
    if (this.reservationForm) {
      this.reservationForm.enable();
      this.reservationForm.reset();
    }  
    this.modalService.dismissAll();
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
  getCityDescription(cityId: string): string {
    const city = this.CityAcronym.find(c => c.id === cityId);
    return city ? city.description : 'Unknown';
  }
  /***
  * Model Position Set
  */
  position() {
    Swal.fire({
      position: 'center',
      icon: 'success',
      title: 'Event has been saved',
      showConfirmButton: false,
      timer: 1000,
    });
  }

  /***
   * Model Edit Position Set
   */
  Editposition() {
    Swal.fire({
      position: 'center',
      icon: 'success',
      title: 'Event has been Updated',
      showConfirmButton: false,
      timer: 1000,
    });
  }
}
