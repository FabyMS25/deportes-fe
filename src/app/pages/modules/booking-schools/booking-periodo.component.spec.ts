import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingPeriodoComponent } from './booking-periodo.component';

describe('BookingPeriodoComponent', () => {
  let component: BookingPeriodoComponent;
  let fixture: ComponentFixture<BookingPeriodoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPeriodoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BookingPeriodoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
