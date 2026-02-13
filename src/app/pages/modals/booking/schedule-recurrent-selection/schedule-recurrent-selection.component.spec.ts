import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduleRecurrentSelectionComponent } from './schedule-recurrent-selection.component';

describe('ScheduleRecurrentSelectionComponent', () => {
  let component: ScheduleRecurrentSelectionComponent;
  let fixture: ComponentFixture<ScheduleRecurrentSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleRecurrentSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScheduleRecurrentSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
