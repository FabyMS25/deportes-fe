import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalFieldsComponent } from './modal.component';



describe('ModalComponent', () => {
  let component: ModalFieldsComponent;
  let fixture: ComponentFixture<ModalFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalFieldsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModalFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
