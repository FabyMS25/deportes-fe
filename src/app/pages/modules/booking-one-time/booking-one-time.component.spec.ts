import { ComponentFixture, TestBed } from '@angular/core/testing';

import {BookingOneTimeComponent } from './booking-one-time.component';

describe('BookingOneTimeComponent', () => {
  let component:BookingOneTimeComponent;
  let fixture: ComponentFixture<BookingOneTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingOneTimeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingOneTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
