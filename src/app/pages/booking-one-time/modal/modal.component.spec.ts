import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingOneTimeModalComponent } from './modal.component';

describe('BookingOneTimeModalComponent', () => {
  let component: BookingOneTimeModalComponent;
  let fixture: ComponentFixture<BookingOneTimeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingOneTimeModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BookingOneTimeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
