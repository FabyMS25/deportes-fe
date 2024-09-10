import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reserva } from 'src/app/core/models/reserva.models';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import Swal from 'sweetalert2';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {

  @Input() accion!: string;
  @Input() row!: Reserva;
  @Input() cancha: any = '';
  @Input() contribuyente: any = '';
  @Output() emitList = new EventEmitter();

  contentForm!: UntypedFormGroup;
  submitted = false;

  canchasList=[];
  contribuyentesList=[];

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private reservasService: ReservaService,
    private canchasService:CamposDeportivoService,
    private contribuyentesService: ContribuyentesService
  ) {}

   
  ngOnInit(): void {
    this.getFields();
    this.getTaxpayers();
    if(this.row){
      this.cancha= this.row.canchasDto.uuid;
      this.contribuyente = this.row.contribuyenteDto.uuid
    }
    /**
     * Form Validation
     */
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      // codigo: ['', [Validators.required]],
      fechaReserva: ['', [Validators.required]],
      horaEntrada: ['', [Validators.required]],
      horaSalida: ['', [Validators.required]],
      totalPago: [0, [Validators.required]],
      pagossDto: [null],
      // status: ['', [Validators.required]]
      uuidCancha: [{ value: this.cancha, disabled: !!this.cancha }, [Validators.required]],
      canchasDto: new FormControl(),
      uuidContribuyente: [{ value: this.contribuyente, disabled: !!this.contribuyente }, [Validators.required]],
      contribuyenteDto: new FormControl(),
    });
    if(this.accion==='show'){
      setTimeout(() => {
        document.getElementById('form-event')?.classList.add('view-event');
        (document.getElementById('btn-save-event') as HTMLElement).setAttribute("hidden", "true");
        (document.getElementById('btn-cancel-event') as HTMLElement).setAttribute("hidden", "true");
      }, 100);

    }else{
      (document.getElementById('btn-delete-event') as HTMLElement).setAttribute("hidden", "true");

    }
    this.formDataSet();
  }
  
  /**
   * Form data get
   */
  get form() {
    return this.contentForm.controls;
  }
  private formDataSet() {
    if (this.accion != '') {
      setTimeout(() => {
        var modaltitle = document.querySelector('.modal-title') as HTMLAreaElement;
        modaltitle.innerHTML = "Reserva en: "+ this.row.canchasDto?.complejoDto?.nombre ||'';
      }, 100);
        this.contentForm.patchValue({
            uuid:this.row.uuid,
            // codigo: this.row.codigo,
            fechaReserva: this.row.fechaReserva,
            horaEntrada:this.row.horaEntrada,
            horaSalida: this.row.horaSalida,
            totalPago: this.row.totalPago,
            contribuyenteDto: this.row.contribuyenteDto,
            canchasDto:this.row.canchasDto,
            pagosDto: this.row.pagosDto,
            uuidCancha: this.row.canchasDto.uuid,
            uuidContribuyente: this.row.contribuyenteDto.uuid,
        });
    }
  }

  showeditEvent() {
    if (document.querySelector('#edit-event-btn')?.innerHTML == 'Cancelar') {
      document.getElementById('form-event')?.classList.add('view-event');
      var editbtn = document.querySelector('#edit-event-btn') as HTMLAreaElement;
      editbtn.innerHTML = 'Editar';
      (document.getElementById('btn-save-event') as HTMLElement).setAttribute("hidden", "true");
    } else {
      document.getElementById('form-event')?.classList.remove('view-event');
      (document.getElementById('btn-save-event') as HTMLElement).removeAttribute("hidden");
      (document.getElementById('btn-cancel-event') as HTMLElement).removeAttribute("hidden");

      var modalbtn = document.querySelector('#btn-save-event') as HTMLAreaElement;
      modalbtn.innerHTML = "Actualizar"
      var editbtn = document.querySelector('#edit-event-btn') as HTMLAreaElement;
      editbtn.innerHTML = 'Cancelar'
    }
  }
  /**
  * Save
  */
  saveData() {
    this.submitted = true;
    if (this.contentForm.valid) {
      this.contentForm.enable()
      let datos: any = {
        // codigo: this.contentForm.value.codigo,
        fechaReserva: this.contentForm.value.fechaReserva,
        horaEntrada:this.contentForm.value.horaEntrada,
        horaSalida: this.contentForm.value.horaSalida,
        totalPago: this.contentForm.value.totalPago,
        contribuyenteDto:  { uuid: this.contentForm.value.uuidContribuyente },
        canchasDto: { uuid: this.contentForm.value.uuidCancha },
        pagosDto: this.contentForm.value.pagosDto,
      };
      if (this.contentForm.get('uuid')?.value) {
          datos.uuid=this.contentForm.value.uuid,
          this.updateData(datos);
      } else {
          this.addData(datos);
      }
    }else {
        this.notify('Formulario Invalido!', 'error');
    }

    setTimeout(() => {
      // this.contentForm.reset();
    }, 2000);
    // this.submitted = true
  }
    
addData(datos:Reserva){
  this.reservasService.save(datos).subscribe({
    next:(data:Reserva)=>{
      this.position();
      this.submitted=false;
      this.notify('Datos Registrados exitosamente!','success'); 
      this.closeModal();
      this.emitList.emit();       
    },
    error: (error) => {
      this.notify('No se pudo Guardar los datos! '+error, 'error');
    }
  })
}
updateData(datosUnit:Reserva) {
    this.reservasService.update(datosUnit).subscribe({
        next: (data: Reserva) => {
          this.Editposition();
          this.submitted = false;
          this.closeModal();
          this.emitList.emit();
          this.notify('Datos Actualizados exitosamente!', 'success');
        },
        error: (error) => {
          this.notify('No se pudo Actualizar los datos! '+error, 'error');
        }
    })
}


  /**
   * Delete event
   */
  deleteEventData() {
    this.modalService.dismissAll();
  }

  public closeModal() {
    this.accion = '';
    this.contentForm.enable();
    this.modalService.dismissAll();
    this.contentForm.reset();
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
