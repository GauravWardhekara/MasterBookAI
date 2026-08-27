import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WorldDashboardComponent } from './world-dashboard.component';

describe('WorldDashboardComponent', () => {
  let component: WorldDashboardComponent;
  let fixture: ComponentFixture<WorldDashboardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [WorldDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorldDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
