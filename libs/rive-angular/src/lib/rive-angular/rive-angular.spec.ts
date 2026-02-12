import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiveAngular } from './rive-angular';

describe('RiveAngular', () => {
  let component: RiveAngular;
  let fixture: ComponentFixture<RiveAngular>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiveAngular],
    }).compileComponents();

    fixture = TestBed.createComponent(RiveAngular);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
