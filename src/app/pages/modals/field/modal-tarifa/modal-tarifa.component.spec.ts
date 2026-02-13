import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalTarifaComponent } from './modal-tarifa.component';

describe('ModalTarifaComponent', () => {
  let component: ModalTarifaComponent;
  let fixture: ComponentFixture<ModalTarifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalTarifaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModalTarifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
