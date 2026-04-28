import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingPeriodoModalComponent } from './modal-booking-school.component';

describe('BookingPeriodoModalComponent', () => {
  let component: BookingPeriodoModalComponent;
  let fixture: ComponentFixture<BookingPeriodoModalComponendt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPeriodoModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BookingPeriodoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
