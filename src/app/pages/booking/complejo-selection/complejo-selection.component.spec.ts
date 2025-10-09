import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplejoSelectionComponent } from './complejo-selection.component';

describe('ComplejoSelectionComponent', () => {
  let component: ComplejoSelectionComponent;
  let fixture: ComponentFixture<ComplejoSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplejoSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ComplejoSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
