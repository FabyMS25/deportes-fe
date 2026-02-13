import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemConfigurationModalComponent } from './modal-system-configuration.component';

describe('SystemConfigurationModalComponent', () => {
  let component: SystemConfigurationModalComponent;
  let fixture: ComponentFixture<SystemConfigurationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemConfigurationModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SystemConfigurationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
