import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/tabs.layout').then(m => m.TabsLayout),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.page').then(m => m.HomePage),
      },
      {
        path: 'worlds',
        loadComponent: () => import('./features/scenarios/scenario-list/scenario-list.page').then(m => m.ScenarioListPage),
      },
      {
        path: 'worlds/new',
        loadComponent: () => import('./features/worlds/world-dashboard/world-dashboard.component').then(m => m.WorldDashboardComponent),
      },
      {
        path: 'worlds/:id/edit',
        loadComponent: () => import('./features/worlds/world-dashboard/world-dashboard.component').then(m => m.WorldDashboardComponent),
      },
      {
        path: 'worlds/:id/basics',
        loadComponent: () => import('./features/worlds/world-basics/world-basics.component').then(m => m.WorldBasicsComponent),
      },
      {
        path: 'worlds/:id/story',
        loadComponent: () => import('./features/worlds/world-story/world-story.component').then(m => m.WorldStoryComponent),
      },
      {
        path: 'scenarios',
        loadComponent: () => import('./features/scenarios/scenario-list/scenario-list.page').then(m => m.ScenarioListPage),
      },
      {
        path: 'scenarios/new',
        loadComponent: () => import('./features/scenarios/scenario-editor/scenario-editor.page').then(m => m.ScenarioEditorPage),
      },
      {
        path: 'scenarios/:id/edit',
        loadComponent: () => import('./features/scenarios/scenario-editor/scenario-editor.page').then(m => m.ScenarioEditorPage),
      },
      {
        path: 'characters',
        loadComponent: () => import('./features/characters/character-list/character-list.page').then(m => m.CharacterListPage),
      },
      {
        path: 'characters/new',
        loadComponent: () => import('./features/characters/character-editor/character-editor.page').then(m => m.CharacterEditorPage),
      },
      {
        path: 'characters/:id/edit',
        loadComponent: () => import('./features/characters/character-editor/character-editor.page').then(m => m.CharacterEditorPage),
      },
      {
        path: 'lorebooks',
        loadComponent: () => import('./features/lorebooks/lorebook-list/lorebook-list.page').then(m => m.LorebookListPage),
      },
      {
        path: 'lorebooks/new',
        loadComponent: () => import('./features/lorebooks/lorebook-editor/lorebook-editor.page').then(m => m.LorebookEditorPage),
      },
      {
        path: 'lorebooks/:id/edit',
        loadComponent: () => import('./features/lorebooks/lorebook-editor/lorebook-editor.page').then(m => m.LorebookEditorPage),
      },
      {
        path: 'chats',
        loadComponent: () => import('./features/gallery/gallery.page').then(m => m.GalleryPage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage),
  },
  {
    path: 'models',
    loadComponent: () => import('./features/model-hub/model-hub.page').then(m => m.ModelHubPage),
  },
  {
    path: 'chat/:sessionId',
    loadComponent: () => import('./features/chat/chat.page').then(m => m.ChatPage),
  },
  {
    path: 'story/:sessionId',
    loadComponent: () => import('./features/story-mode/story-mode.page').then(m => m.StoryModePage),
  },
  {
    path: 'worlds/:id',
    loadComponent: () => import('./features/scenarios/scenario-detail/scenario-detail.page').then(m => m.ScenarioDetailPage),
  },
  {
    path: 'scenarios/:id',
    loadComponent: () => import('./features/scenarios/scenario-detail/scenario-detail.page').then(m => m.ScenarioDetailPage),
  }
];
