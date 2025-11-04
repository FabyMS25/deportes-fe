import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingSchoolsComponent } from './booking-schools.component';

describe('BookingSchoolsComponent', () => {
  let component: BookingSchoolsComponent;
  let fixture: ComponentFixture<BookingSchoolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingSchoolsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BookingSchoolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
