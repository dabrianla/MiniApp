import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink, Platform } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  mailOutline, mailSharp, cubeOutline, cubeSharp, paperPlaneOutline, paperPlaneSharp, 
  heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, 
  warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, lockClosedOutline, 
  lockClosedSharp, logOutOutline, logOutSharp
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
      
      // 2. Pide permiso para la cámara de fotos (por si el de arriba no cubre ambos en algún dispositivo)
      await Camera.requestPermissions();

      if (statusEscaner.granted) {
        console.log('Permisos de cámara concedidos correctamente al iniciar.');
      } else {
        console.warn('El usuario denegó los permisos de la cámara.');
        // Aquí en el futuro podrías mostrar una alerta diciendo que la app necesita la cámara para funcionar.
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
    }
  }
  
  // Inyectamos el servicio de usuarios
  public authService = inject(AuthService);
  public platform = inject(Platform);
  
  // Lista de páginas del menú lateral (ajustado a tu app real)
  public appPages = [
    { title: 'Inventario de Productos', url: '/productos', icon: 'cube' },
    // Más adelante puedes descomentar y usar estas cuando las creemos:
    // { title: 'Ventas', url: '/ventas', icon: 'archive' },
    // { title: 'Notificaciones', url: '/alertas', icon: 'warning' },
  ];
  
  constructor() {
    // Registro de los íconos de Ionic
    addIcons({ 
      mailOutline, mailSharp, cubeOutline, cubeSharp, paperPlaneOutline, paperPlaneSharp, 
      heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, 
      warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, lockClosedOutline, 
      lockClosedSharp, logOutOutline, logOutSharp 
    });
  }

  // 2. Función indispensable para el botón rojo del HTML
  cerrarSesion() {
    this.authService.logout();
  }
}