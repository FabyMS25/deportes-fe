import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemConfigurationsComponent } from './system-configurations.component';

describe('SystemConfigurationsComponent', () => {
  let component: SystemConfigurationsComponent;
  let fixture: ComponentFixture<SystemConfigurationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemConfigurationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SystemConfigurationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
