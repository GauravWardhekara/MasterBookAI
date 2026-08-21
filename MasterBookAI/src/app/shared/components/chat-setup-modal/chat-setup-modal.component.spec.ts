import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChatSetupModalComponent } from './chat-setup-modal.component';

describe('ChatSetupModalComponent', () => {
  let component: ChatSetupModalComponent;
  let fixture: ComponentFixture<ChatSetupModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ChatSetupModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatSetupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
