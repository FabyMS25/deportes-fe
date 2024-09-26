import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsCompoment } from './payments.component';

describe('PaymentsCompoment', () => {
  let component: PaymentsCompoment;
  let fixture: ComponentFixture<PaymentsCompoment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsCompoment]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PaymentsCompoment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
