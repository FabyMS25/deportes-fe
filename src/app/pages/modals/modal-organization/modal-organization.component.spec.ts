import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalOrganizationComponent } from './modal-organization.component';

describe('ModalOrganizationComponent', () => {
  let component: ModalOrganizationComponent;
  let fixture: ComponentFixture<ModalOrganizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalOrganizationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModalOrganizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
