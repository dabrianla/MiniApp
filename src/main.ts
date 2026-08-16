import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getAuth, provideAuth } from '@angular/fire/auth'; // <-- NUEVO: Importamos el módulo de Auth
import { getApp } from '@angular/fire/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from '@angular/fire/firestore';
// importamos para poder usar HttpClient en el servicio de IA
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)), 
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp({ 
      projectId: "miniapp-inventario", 
      appId: "1:633727289203:web:01c607e63eeef7b8412706", 
      storageBucket: "miniapp-inventario.firebasestorage.app", 
      apiKey: "AIzaSyCmfN1TZ5m10zxYiX5TyqTM7E3rfRoeihw", 
      authDomain: "miniapp-inventario.firebaseapp.com", 
      messagingSenderId: "633727289203" 
    })), 
    provideFirestore(() => {
    const app = getApp();
    // Inicializamos Firestore con la caché local activada
    const firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
      })
    });
  return firestore;
  }),
    provideAuth(() => getAuth()), // <-- NUEVO: Encendemos la autenticación
    provideStorage(() => getStorage())
  ],
});