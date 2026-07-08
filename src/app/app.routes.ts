import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/chat.page').then((m) => m.ChatPage),
  },
  {
    path: 'chat/:id',
    loadComponent: () => import('./features/chat/chat.page').then((m) => m.ChatPage),
  },
  {
    path: 'characters',
    loadComponent: () => import('./features/characters/characters.page').then((m) => m.CharactersPage),
  },
  {
    path: 'characters/:id',
    loadComponent: () => import('./features/characters/character-detail.page').then((m) => m.CharacterDetailPage),
  },
  {
    path: 'scenarios',
    loadComponent: () => import('./features/scenarios/scenarios.page').then((m) => m.ScenariosPage),
  },
  {
    path: 'scenarios/:id',
    loadComponent: () => import('./features/scenarios/scenario-detail.page').then((m) => m.ScenarioDetailPage),
  },
  {
    path: 'connections',
    loadComponent: () => import('./features/connections/connections.page').then((m) => m.ConnectionsPage),
  },
  {
    path: 'memory',
    loadComponent: () => import('./features/memory/memory.page').then((m) => m.MemoryPage),
  },
  {
    path: 'image-gen',
    loadComponent: () => import('./features/image-gen/image-gen.page').then((m) => m.ImageGenPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
