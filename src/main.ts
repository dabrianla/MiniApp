import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)), provideFirebaseApp(() => initializeApp({ projectId: "miniapp-inventario", appId: "1:633727289203:web:01c607e63eeef7b8412706", storageBucket: "miniapp-inventario.firebasestorage.app", apiKey: "AIzaSyCmfN1TZ5m10zxYiX5TyqTM7E3rfRoeihw", authDomain: "miniapp-inventario.firebaseapp.com", messagingSenderId: "633727289203", projectNumber: "633727289203", version: "2" })), provideFirestore(() => getFirestore()),
  ],
});
