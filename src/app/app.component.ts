import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink, Platform } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  mailOutline, mailSharp, cubeOutline, cubeSharp, paperPlaneOutline, paperPlaneSharp, 
  heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, 
  warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, lockClosedOutline, 
  lockClosedSharp, logOutOutline, logOutSharp, addCircleOutline, cartOutline, listOutline, cartSharp
} from 'ionicons/icons';
import { AuthService } from './services/auth';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera } from '@capacitor/camera';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, 
    IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, 
    IonRouterLink, IonRouterOutlet, CommonModule
  ],
})
export class AppComponent {
  
  // Inyectamos el servicio de usuarios
  public authService = inject(AuthService);
  public platform = inject(Platform);
  
  // 🟢 AQUÍ AGREGAMOS LA NUEVA PÁGINA "Ingreso de Stock"
  public appPages = [
    { title: 'Catalogo de productos', url: '/productos', icon: 'cube' },
    { title: 'Punto de venta', url: '/punto-venta', icon: 'cart' },
    { title: 'Ingreso de Stock', url: '/ingreso-stock', icon: 'archive' }, 
    { title: 'Alertas y Novedades', url: '/notificaciones', icon: 'warning' },
  ];
  
  constructor() {
    // Registro de los íconos de Ionic
    addIcons({ 
      mailOutline, mailSharp, cubeOutline, cubeSharp, paperPlaneOutline, paperPlaneSharp, 
      heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, 
      warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, lockClosedOutline, 
      lockClosedSharp, logOutOutline, logOutSharp, addCircleOutline, cartOutline, listOutline, cartSharp
    });

    // 🟢 ESTO FALTABA: Ejecutamos la función para que pida la cámara al abrir la app
    this.iniciarApp();
  }

  async iniciarApp() {
    // Esperamos a que el sistema operativo del celular esté listo
    await this.platform.ready();

    // Solicitamos los permisos
    this.solicitarPermisosCamara();
  }

  async solicitarPermisosCamara() {
    try {
      // 1. Pide permiso para el escáner de códigos de barras
      const statusEscaner = await BarcodeScanner.checkPermission({ force: true });
      
      // 2. Pide permiso para la cámara de fotos
      await Camera.requestPermissions();

      if (statusEscaner.granted) {
        console.log('Permisos de cámara concedidos correctamente al iniciar.');
      } else {
        console.warn('El usuario denegó los permisos de la cámara.');
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
    }
  }

  cerrarSesion() {
    this.authService.logout();
  }
}