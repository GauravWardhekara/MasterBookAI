import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';
// Rebuild trigger
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
  IonButton,
  IonButtons,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  chatbubbleOutline,
  peopleOutline,
  globeOutline,
  bookOutline,
  imageOutline,
  bulbOutline,
  settingsOutline,
  menuOutline,
  logoDiscord,
  sparklesOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonMenuToggle,
    RouterLink,
    NgFor,
  ],
})
export class AppComponent {
  private router = inject(Router);

  appPages = [
    { title: 'Dashboard', url: '/home', icon: 'home-outline' },
    { title: 'Chat', url: '/chat', icon: 'chatbubble-outline' },
    { title: 'Characters', url: '/characters', icon: 'people-outline' },
    { title: 'Scenarios', url: '/scenarios', icon: 'book-outline' },
    { title: 'Connections', url: '/connections', icon: 'globe-outline' },
    { title: 'Memory', url: '/memory', icon: 'bulb-outline' },
    { title: 'Image Gen', url: '/image-gen', icon: 'image-outline' },
    { title: 'Settings', url: '/settings', icon: 'settings-outline' },
  ];

  constructor() {
    addIcons({'homeOutline':homeOutline,'chatbubbleOutline':chatbubbleOutline,'peopleOutline':peopleOutline,'globeOutline':globeOutline,'bookOutline':bookOutline,'imageOutline':imageOutline,'bulbOutline':bulbOutline,'settingsOutline':settingsOutline,'menuOutline':menuOutline,'logoDiscord':logoDiscord,'sparklesOutline':sparklesOutline});
  }
}
