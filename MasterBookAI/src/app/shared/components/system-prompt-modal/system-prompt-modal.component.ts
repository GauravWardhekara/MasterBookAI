import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, checkmarkOutline, chevronForwardOutline } from 'ionicons/icons';

export interface SystemPromptItem {
  id: string;
  name: string;
  content: string;
}

@Component({
  selector: 'app-system-prompt-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon
  ],
  template: `
    <ion-header class="ion-no-border sp-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()" class="back-btn">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="sp-title">System Prompt</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="sp-content ion-padding">
      <div class="sp-container">
        
        <div class="prompt-list">
          <div *ngFor="let prompt of prompts" 
               class="prompt-card" 
               [class.active]="selectedPromptId === prompt.id"
               (click)="selectPrompt(prompt)">
            
            <div class="prompt-main">
              <div class="prompt-name">{{ prompt.name }}</div>
              <div class="prompt-text">{{ prompt.content }}</div>
            </div>
            
            <div class="prompt-actions">
              <ion-icon name="checkmark-outline" class="check-icon" *ngIf="selectedPromptId === prompt.id"></ion-icon>
              <ion-icon name="chevron-forward-outline" class="arrow-icon"></ion-icon>
            </div>
          </div>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .sp-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .back-btn { --color: #a1a1aa; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); margin-left: 8px; }
    .sp-title { font-size: 17px; font-weight: 600; text-align: center; margin-right: 48px; }

    .sp-content { --background: #1c1c1e; }
    .sp-container { max-width: 600px; margin: 0 auto; padding-bottom: 30px; }

    .prompt-list { display: flex; flex-direction: column; gap: 12px; }

    .prompt-card {
      background: #27272a; border-radius: 12px; padding: 16px;
      display: flex; justify-content: space-between; align-items: stretch;
      cursor: pointer; border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .prompt-card.active {
      border-color: #d9f99d; /* Pale yellow/green border */
    }

    .prompt-main { flex: 1; padding-right: 16px; }
    .prompt-name { font-size: 15px; font-weight: 600; color: white; margin-bottom: 8px; }
    .prompt-text { font-size: 14px; color: #a1a1aa; line-height: 1.5; }

    .prompt-actions {
      display: flex; align-items: center; gap: 12px;
    }
    .check-icon { color: #d9f99d; font-size: 20px; }
    .arrow-icon { color: #a1a1aa; font-size: 20px; }
  `]
})
export class SystemPromptModalComponent implements OnInit {
  @Input() selectedPromptId: string = '';
  @Input() prompts: SystemPromptItem[] = [];

  constructor(private modalCtrl: ModalController) {
    addIcons({ chevronBackOutline, checkmarkOutline, chevronForwardOutline });
  }

  ngOnInit() {
    // Default mocks if none provided
    if (this.prompts.length === 0) {
      this.prompts = [
        {
          id: 'roleplay',
          name: 'Roleplay',
          content: "You are an omniscient, detached narrator. You will narrate in the third-person. You will focus narrating on whoever {{user}} is currently interacting with or what characters are doing. You exist only to provide narration for chats by giving detailed descriptive prose and vivid results for character actions. Review the chat conversation and use physical descriptions, context clues, author's notes, and the scenario to create an accurate representation of the environment and situation. Pay close attention to detail and adapt to various situations. You only speak of other characters/NPCs in the third person, never interact directly, and never speak of yourself as you are a detached observer. Avoid repetition, overuse of phrases, and same-line verbatim. Be creative and give {{user}} an engaging roleplay with various outcomes and possibilities. When {{user}} is not interacting with characters directly, describe characters actions starting with text \\\"Meanwhile {{char}} \\\". NEVER speak, think, or act for {{user}}."
        },
        {
          id: 'spicy',
          name: 'Spicy Roleplay',
          content: 'Write {{char}} next response. Any act of role play scenarios will be described in details.'
        },
        {
          id: 'default',
          name: 'Default',
          content: 'Write {{char}} next response.'
        }
      ];
    }
  }

  selectPrompt(prompt: SystemPromptItem) {
    this.selectedPromptId = prompt.id;
    // We can dismiss immediately or wait for the user to press back.
    // The screenshot has a ">" implying it might open a text editor for the prompt, 
    // but typically selecting it is enough. We'll just dismiss and return it.
    setTimeout(() => {
      this.modalCtrl.dismiss({ prompt });
    }, 150);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
