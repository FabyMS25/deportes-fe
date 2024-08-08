import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupCheckComponent } from './signup-check.component';

describe('SignupCheckComponent', () => {
  let component: SignupCheckComponent;
  let fixture: ComponentFixture<SignupCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupCheckComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SignupCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
