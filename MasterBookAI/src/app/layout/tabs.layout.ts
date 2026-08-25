import { Component } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline, home, bookOutline, book, peopleOutline, people,
  libraryOutline, library, imagesOutline, images, settingsOutline, settings,
  bulbOutline, bulb, hardwareChipOutline, hardwareChip
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/home">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="scenarios" href="/scenarios">
          <ion-icon name="book-outline"></ion-icon>
          <ion-label>Worlds</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="gallery" href="/gallery">
          <ion-icon name="images-outline"></ion-icon>
          <ion-label>Gallery</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="memories" href="/memories">
          <ion-icon name="bulb-outline"></ion-icon>
          <ion-label>Memories</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="models" href="/models">
          <ion-icon name="hardware-chip-outline"></ion-icon>
          <ion-label>Models</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings" href="/settings">
          <ion-icon name="settings-outline"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: var(--mb-bg-primary);
      border-top: 1px solid var(--mb-border);
      padding-bottom: env(safe-area-inset-bottom);
    }

    ion-tab-button {
      --color: var(--mb-text-muted);
      --color-selected: var(--mb-primary);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.2px;
    }

    ion-tab-button::part(native) {
      transition: color 200ms ease;
    }

    ion-tab-button[aria-selected="true"] ion-icon {
      filter: drop-shadow(0 0 6px rgba(167, 139, 250, 0.4));
    }
  `],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsLayout {
  constructor() {
    addIcons({
      homeOutline, home, bookOutline, book, peopleOutline, people,
      libraryOutline, library, imagesOutline, images, settingsOutline, settings,
      bulbOutline, bulb, hardwareChipOutline, hardwareChip
    });
  }
}
