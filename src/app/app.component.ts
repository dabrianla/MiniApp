import { Component, inject } from '@angular/core'; // <-- 1. Agregado 'inject' aquí
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  mailOutline, mailSharp, cubeOutline, cubeSharp, paperPlaneOutline, paperPlaneSharp, 
  heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, 
  warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, lockClosedOutline, 
  lockClosedSharp, logOutOutline, logOutSharp
} from 'ionicons/icons';
import { AuthService } from './services/auth';

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