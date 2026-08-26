import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink, Platform, IonBadge } from '@ionic/angular/standalone'; // 🟢 Agregamos IonBadge
import { addIcons } from 'ionicons';
import { 
  mailOutline, mailSharp, cubeOutline, cubeSharp, paperPlaneOutline, paperPlaneSharp, 
  heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, 
  warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, lockClosedOutline, 
  lockClosedSharp, logOutOutline, logOutSharp, addCircleOutline, cartOutline, listOutline, cartSharp, walletOutline, walletSharp, settingsOutline, settingsSharp
} from 'ionicons/icons';

import { AuthService } from './services/auth';
import { InventarioService } from './services/inventario'; // 🟢 Importamos el servicio
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera } from '@capacitor/camera';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, 
    IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, 
    IonRouterLink, IonRouterOutlet, CommonModule, IonBadge // 🟢 Agregamos IonBadge
  ],
})
export class AppComponent {
  
  public authService = inject(AuthService);
  public inventarioService = inject(InventarioService); // 🟢 Inyectamos el servicio
  public platform = inject(Platform);
  
  public appPages = [
    { title: 'Catalogo de productos', url: '/productos', icon: 'cube' },
    { title: 'Punto de venta', url: '/punto-venta', icon: 'cart' },
    { title: 'Ingreso de Stock', url: '/ingreso-stock', icon: 'archive' }, 
    { title: 'Alertas y Novedades', url: '/notificaciones', icon: 'warning', id: 'alertas' },
    { title: 'Historial de ventas', url: '/historial-ventas', icon: 'wallet' },
  ];

  public adminPages = [
    { title: 'Panel de Administración', url: '/admin', icon: 'settings' },
  ];
  
  constructor() {
    addIcons({ 
      mailOutline, mailSharp, cubeOutline, cubeSharp, paperPlaneOutline, paperPlaneSharp, 
      heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, 
      warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, lockClosedOutline, 
      lockClosedSharp, logOutOutline, logOutSharp, addCircleOutline, cartOutline, listOutline, cartSharp, walletOutline, walletSharp, settingsOutline, settingsSharp
    });

    this.iniciarApp();
  }

  async iniciarApp() {
    await this.platform.ready();
    this.solicitarPermisosCamara();
  }

  async solicitarPermisosCamara() {
    try {
      const statusEscaner = await BarcodeScanner.checkPermission({ force: true });
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