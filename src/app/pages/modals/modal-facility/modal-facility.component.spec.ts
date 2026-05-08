import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalFacilitiesComponent } from './modal-facility.component';

describe('ModalFacilitiesComponent', () => {
  let component: ModalFacilitiesComponent;
  let fixture: ComponentFixture<ModalFacilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalFacilitiesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModalFacilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
