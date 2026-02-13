import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClasificadoresRuatComponent } from './clasificadores-ruat.component';

describe('ClasificadoresRuatComponent', () => {
  let component: ClasificadoresRuatComponent;
  let fixture: ComponentFixture<ClasificadoresRuatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClasificadoresRuatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClasificadoresRuatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
