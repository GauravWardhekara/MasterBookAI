import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WorldBasicsComponent } from './world-basics.component';

describe('WorldBasicsComponent', () => {
  let component: WorldBasicsComponent;
  let fixture: ComponentFixture<WorldBasicsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [WorldBasicsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorldBasicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
