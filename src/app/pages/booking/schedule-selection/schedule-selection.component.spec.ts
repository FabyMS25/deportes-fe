import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduleSelectionComponent } from './schedule-selection.component';

describe('ScheduleSelectionComponent', () => {
  let component: ScheduleSelectionComponent;
  let fixture: ComponentFixture<ScheduleSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScheduleSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
