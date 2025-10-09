import { ComponentFixture, TestBed } from '@angular/core/testing';

import {BookingRecurrentComponent } from './booking-recurrent.component';

describe('BookingRecurrentComponent', () => {
  let component:BookingRecurrentComponent;
  let fixture: ComponentFixture<BookingRecurrentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingRecurrentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingRecurrentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
