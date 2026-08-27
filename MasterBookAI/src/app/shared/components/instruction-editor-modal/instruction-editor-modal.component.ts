import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

export interface InstructionBlock {
  id: string;
  name: string;
  content: string;
  authorNotes: string;
}

@Component({
  selector: 'app-instruction-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Instruction</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="form-group">
        <label>Name</label>
        <p class="help-text">Label for this instruction block (for your reference)</p>
        <ion-input [(ngModel)]="block.name" class="mb-input"></ion-input>
      </div>
      <div class="form-group">
        <label>Content</label>
        <p class="help-text">Instruction text injected into the AI prompt when active. <a href="#">Supports macros ⓘ</a></p>
        <ion-textarea [(ngModel)]="block.content" rows="6" class="mb-input"></ion-textarea>
      </div>
      <div class="form-group">
        <label>Author Notes</label>
        <p class="help-text">Personal notes for your reference. Not used by the engine.</p>
        <ion-textarea [(ngModel)]="block.authorNotes" rows="4" class="mb-input"></ion-textarea>
      </div>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-button slot="start" fill="clear" color="danger" (click)="remove()">
          <ion-icon name="trash-outline" slot="start"></ion-icon>
          Remove instruction
        </ion-button>
        <ion-button slot="end" class="mb-btn-primary" (click)="save()">Done</ion-button>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .form-group { margin-bottom: 24px; }
    label { font-weight: 600; color: var(--mb-text-primary); font-size: 15px; }
    .help-text { font-size: 13px; color: var(--mb-text-muted); margin: 4px 0 8px; }
    .help-text a { color: var(--mb-primary); text-decoration: none; }
  `]
})
export class InstructionEditorModalComponent implements OnInit {
  @Input() inputBlock?: InstructionBlock;
  
  block: InstructionBlock = { id: '', name: '', content: '', authorNotes: '' };

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.inputBlock) {
      this.block = { ...this.inputBlock };
    } else {
      this.block.id = crypto.randomUUID();
    }
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  save() {
    this.modalCtrl.dismiss(this.block, 'save');
  }

  remove() {
    this.modalCtrl.dismiss(this.block, 'remove');
  }
}
