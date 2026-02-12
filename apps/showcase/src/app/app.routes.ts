import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./feedback-stars/feedback-stars.component').then(
        (m) => m.FeedbackStarsComponent,
      ),
  },
];
