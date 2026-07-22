import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { DatabaseService } from './core/services/database.service';

@Component({
  selector: 'app-root',
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private db: DatabaseService) {}

  async ngOnInit(): Promise<void> {
    await this.db.initializeDefaults();
  }
}
