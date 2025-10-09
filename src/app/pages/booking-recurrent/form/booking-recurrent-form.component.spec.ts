import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingRecurrentFormRecurrentComponent } from './booking-recurrent-form.component';

describe('BookingRecurrentFormRecurrentComponent', () => {
  let component: BookingRecurrentFormRecurrentComponent;
  let fixture: ComponentFixture<BookingRecurrentFormRecurrentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingRecurrentFormRecurrentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BookingRecurrentFormRecurrentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
