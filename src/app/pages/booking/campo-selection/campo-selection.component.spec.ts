import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampoSelectionComponent } from './campo-selection.component';

describe('CampoSelectionComponent', () => {
  let component: CampoSelectionComponent;
  let fixture: ComponentFixture<CampoSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CampoSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
