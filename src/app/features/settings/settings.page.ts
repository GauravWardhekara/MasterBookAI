import { Component, inject, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel, IonToggle,
  ToastController,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-settings',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div style="max-width:800px;margin:0 auto;padding:16px;">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Data Management</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="full">
              <ion-item>
                <ion-icon name="download-outline" slot="start" color="primary"></ion-icon>
                <ion-label>
                  <h3>Export All Data</h3>
                  <p>Download a JSON backup of all your data</p>
                </ion-label>
                <ion-button slot="end" fill="outline" (click)="exportData()">Export</ion-button>
              </ion-item>
              <ion-item>
                <ion-icon name="cloud-upload-outline" slot="start" color="secondary"></ion-icon>
                <ion-label>
                  <h3>Import Data</h3>
                  <p>Restore from a JSON backup file</p>
                </ion-label>
                <ion-button slot="end" fill="outline" (click)="importData()">Import</ion-button>
              </ion-item>
              <ion-item>
                <ion-icon name="trash-outline" slot="start" color="danger"></ion-icon>
                <ion-label>
                  <h3>Clear All Data</h3>
                  <p>Delete everything (cannot be undone)</p>
                </ion-label>
                <ion-button slot="end" fill="outline" color="danger" (click)="clearAllData()">Clear</ion-button>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>About MasterBookAI</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p><strong>Version:</strong> 1.0.0</p>
            <p style="margin-top:8px;">MasterBookAI is a cross-platform AI companion application for immersive storytelling and intelligent conversation.</p>
            <p style="margin-top:8px;color:var(--ion-color-medium);">Built with Ionic, Angular, and Capacitor.</p>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel, IonToggle,
  ],
})
export class SettingsPage {
  private storage = inject(StorageService);
  private toastCtrl = inject(ToastController);

  async exportData() {
    const data = await this.storage.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `masterbookai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const toast = await this.toastCtrl.create({
      message: 'Data exported successfully',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        await this.storage.importAllData(text);
        const toast = await this.toastCtrl.create({
          message: 'Data imported successfully',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      } catch (err: any) {
        const toast = await this.toastCtrl.create({
          message: `Import failed: ${err.message}`,
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      }
    };
    input.click();
  }

  async clearAllData() {
    if (!confirm('Are you sure? This will delete ALL data permanently.')) return;
    // Dexie deletion would go here - for now just reload
    const toast = await this.toastCtrl.create({
      message: 'Please clear browser data manually to remove all stored information',
      duration: 4000,
      color: 'warning',
    });
    await toast.present();
  }
}
