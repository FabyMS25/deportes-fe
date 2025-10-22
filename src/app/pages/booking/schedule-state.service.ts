import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScheduleStateService {
  private currentWeekStartSubject = new BehaviorSubject<Date>(this.getCurrentWeekStart());
  private currentWeekEndSubject = new BehaviorSubject<Date>(this.getCurrentWeekEnd());
  
  currentWeekStart$ = this.currentWeekStartSubject.asObservable();
  currentWeekEnd$ = this.currentWeekEndSubject.asObservable();

  private getCurrentWeekStart(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    
    return weekStart;
  }

  private getCurrentWeekEnd(): Date {
    const weekStart = this.getCurrentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  moveWeek(direction: number): void {
    const currentStart = this.currentWeekStartSubject.value;
    const newStart = new Date(currentStart);
    newStart.setDate(currentStart.getDate() + (direction * 7));
    
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 6);
    
    this.currentWeekStartSubject.next(newStart);
    this.currentWeekEndSubject.next(newEnd);
  }

  goToToday(): void {
    this.currentWeekStartSubject.next(this.getCurrentWeekStart());
    this.currentWeekEndSubject.next(this.getCurrentWeekEnd());
  }
}