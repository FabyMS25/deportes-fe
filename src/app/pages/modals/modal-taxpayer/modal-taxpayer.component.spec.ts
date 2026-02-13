import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalTaxpayerComponent } from './modal-taxpayer.component';

describe('ModalTaxpayerComponent', () => {
  let component: ModalTaxpayerComponent;
  let fixture: ComponentFixture<ModalTaxpayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalTaxpayerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModalTaxpayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
