import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Reserva } from 'src/app/core/models/reserva.models';

@Component({
  selector: 'app-timetables',
  templateUrl: './timetables.component.html',
  styleUrl: './timetables.component.scss'
})

export class TimeTablesComponent {

  @Input() horariosAtencion: any[]=[];
  @Input() tariff: any;
  @Input() reservationsList: any[] = [];
  @Input() reservationDate:Date = new Date();
  // @Output() selectedDay = new EventEmitter<Date>();
  @Output() reserveEvent = new EventEmitter<{date:any, start: string, end: string }>();

  weekDays: { name: string, date: Date }[] = [];
  activeDayName: string = '';
  currentWeekStart!: Date;
  currentWeekEnd!: Date;  
  allSlots: { [key: string]: { morningSlots: { time: string, isAvailable: boolean,isReserved: boolean }[], afternoonSlots: { time: string, isAvailable: boolean,isReserved: boolean }[] } } = {};

  ngOnInit() {
    console.log(this.reservationsList)
    // this.goToToday();
    // this.activeDayName = format(this.reservationDate, 'EEE', { locale: es }).toLowerCase();
    this.allSlots={}
    this.setWeekRange(this.reservationDate);
    this.setSelectedDay(this.reservationDate);
  }
  
  goToToday() {
    this.allSlots={}
    const today = new Date();
    this.setWeekRange(today);
    this.setSelectedDay(today);
  }
  moveWeek(direction: number) {
    this.allSlots={}
    const newStartDate = direction > 0 
      ? addDays(this.currentWeekStart, 7) 
      : subDays(this.currentWeekStart, 7);
    this.setWeekRange(newStartDate);
  }
  private setWeekRange(date: Date) {
    this.currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    this.currentWeekEnd = endOfWeek(date, { weekStartsOn: 1 });
  
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const currentDate = addDays(this.currentWeekStart, i);
      return {
        name: format(currentDate, 'EEE', { locale: es }).toLowerCase(),
        date: currentDate
      };
    });
  
    // this.activeDayName = format(date, 'EEE', { locale: es }).toLowerCase();
    
  }

  setSelectedDay(date: Date) {
    // if (this.InvoiceForm) {
    //   this.InvoiceForm.patchValue({
    //     fechaReserva: date
    //   });
    // }
    this.reservationDate = date
      this.activeDayName = format(date, 'EEE', { locale: es }).toLowerCase();
  }
  // setReserve(start: string, end:string) {
  //   this.reserve.emit({start, end});
    // if (this.InvoiceForm) {
    //   this.InvoiceForm.patchValue({
    //     horaEntrada: start,
    //     horaSalida: end,
    //   });
    // }
  // }
  // setSelectedDay(date: Date) {
  //   this.selectedDay.emit(date);
  //   this.activeDayName = format(date, 'EEE', { locale: es }).toLowerCase();
  // }
  
  setReserve(date:any,start: string, end: string) {
    this.reserveEvent.emit({ date ,start, end });
  }
  
  
  getTimeSlotsForDay(date: Date) {
    const dayString = date ? new Date(date).toLocaleString('es-ES', { weekday: 'long' }).toLowerCase() : '';    
    if (!this.allSlots[dayString]) {
      this.setSelectedDay(date);
      // this.reservationDate = date

      const morningSlots = this.getTimeSlots(date,dayString, 'morning');
      const afternoonSlots = this.getTimeSlots(date,dayString, 'afternoon');      
      this.allSlots[dayString] = { morningSlots, afternoonSlots };
    }  
    return this.allSlots[dayString];
  }

  timetables!:any[];
  private getTimeSlots(date:Date,day: string, period: string): { time: string, isAvailable: boolean, isReserved:boolean}[] {
    // const horariosAtencion: any[] = this.dataField.horarioDtoList;
    this.timetables = this.horariosAtencion.filter(horario => (horario.dia.toLowerCase() === day.toLowerCase() && horario.abierto));    
    if (this.timetables.length === 0) {
      return [];
    }  
    const slots: { time: string, isAvailable: boolean , isReserved:boolean}[] = []; 
    for (const horario of this.timetables) {
      const startTime = horario.horaInicio > this.tariff.desde ? this.tariff.desde : horario.horaInicio;
      const endTime = horario.horaFin > this.tariff.hasta ? this.tariff.hasta : horario.horaFin;  
      for (let hour = this.getTime(startTime); hour < this.getTime(endTime); hour++) {
        const slotTime  = `${this.pad(hour)}:00 - ${this.pad(hour + 1)}:00`;  
        const slotStartDate = new Date(date);
        slotStartDate.setHours(hour, 0, 0, 0);      
        let isAvailable = slotStartDate >= (new Date());
        let isReserved = false;
        if(isAvailable){
          let [slotStart, slotEnd] = slotTime.split(' - ');
          slotStart = `${slotStart}:00`;
          slotEnd = `${slotEnd}:00`;
          isReserved = !this.isReserved(slotStart,slotEnd);
        }
        slots.push({ time: slotTime , isAvailable: isAvailable, isReserved:isReserved});     
      }      
    }  
    if (period === 'morning') {
      return slots.filter(slot => this.getTime(slot.time.split(':')[0]) < 12);
    } else if (period === 'afternoon') {
      return slots.filter(slot => this.getTime(slot.time.split(':')[0]) >= 12);
    }  
    return slots;
  }
  
  private isReserved(slotStart: any , slotEnd:any): boolean {
    const fechaReserva = this.reservationDate//this.InvoiceForm.get('fechaReserva')?.value;
    console.log("selected",fechaReserva.getDate())
    return !this.reservationsList.some((reservation: any) => {
      const reservationStart = reservation.horaEntrada;
      const reservationEnd = reservation.horaSalida;
      const reservationDate = new Date(reservation.fechaReserva);
      console.log("reserved ",reservationDate.getDate())
      if (reservationDate.getDate() === fechaReserva.getDate()) {  
        console.log("enter")
        return (slotStart < reservationEnd && slotEnd > reservationStart); 
        // return (
        //   (slotStart >= reservationStart && slotStart < reservationEnd) &&
        //   (slotEnd > reservationStart && slotEnd <= reservationEnd) 
        // );
      }      
    return false; 
    });
  }  

  private getTime(time: string): number {
    return parseInt(time.split(':')[0], 10);
  }
  private pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }
}
