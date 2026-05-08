// El polyfill `global = window` (requerido por amazon-cognito-identity-js)
// está registrado en angular.json → "polyfills" para garantizar que se
// ejecute en polyfills-*.js antes que main.js.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
