import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingRecurrentModalComponent } from './modal-booking-recurrent.component';

describe('BookingRecurrentModalComponent', () => {
  let component: BookingRecurrentModalComponent;
  let fixture: ComponentFixture<BookingRecurrentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingRecurrentModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BookingRecurrentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
