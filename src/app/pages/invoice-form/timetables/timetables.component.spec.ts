import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeTablesComponent } from './timetables.component';

describe('TimeTablesComponent', () => {
  let component: TimeTablesComponent;
  let fixture: ComponentFixture<TimeTablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeTablesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TimeTablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
