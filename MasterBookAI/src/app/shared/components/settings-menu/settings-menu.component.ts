import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonIcon, IonPopover, IonContent, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, hardwareChipOutline, wifiOutline } from 'ionicons/icons';

@Component({
  selector: 'app-settings-menu',
  template: `
    <ion-button id="settings-trigger" fill="clear">
      <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
    </ion-button>
    <ion-popover trigger="settings-trigger" triggerAction="click" dismissOnSelect="true">
      <ng-template>
        <ion-content>
          <ion-list lines="none">
            <ion-item button (click)="navigateTo('/settings')">
              <ion-icon name="wifi-outline" slot="start" color="primary"></ion-icon>
              <ion-label>Connections</ion-label>
            </ion-item>
            <ion-item button (click)="navigateTo('/models')">
              <ion-icon name="hardware-chip-outline" slot="start" color="secondary"></ion-icon>
              <ion-label>Models</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ng-template>
    </ion-popover>
  `,
  styles: [`
    ion-list { padding: 4px 0; background: var(--mb-bg-card); }
    ion-item { --background: transparent; --color: var(--mb-text-primary); font-size: 14px; }
    ion-item:hover { --background: var(--mb-bg-card-hover); }
  `],
  imports: [IonButton, IonIcon, IonPopover, IonContent, IonList, IonItem, IonLabel]
})
export class SettingsMenuComponent {
  constructor(private router: Router) {
    addIcons({ settingsOutline, hardwareChipOutline, wifiOutline });
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
