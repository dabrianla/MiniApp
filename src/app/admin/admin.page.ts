import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon, IonBadge,
  IonItem, IonList, IonToggle, IonInput, IonSelect, IonSelectOption, IonRange,
  IonSpinner, IonText, IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, timeOutline, alertCircleOutline, saveOutline, listOutline, settingsOutline, statsChartOutline, constructOutline } from 'ionicons/icons';

export interface AlertaVendedor {
  id?: string;
  mensaje: string;
  productoNombre: string;
  productoId?: string;
  creadoPor: string;
  fecha: string;
  resuelta: boolean;
  fechaResolucion?: string;
}

export interface ConfigCigarro {
  productoId: string;
  nombreProducto: string;
  precioUnidad: number;
  cigarrosPorCajetilla: number;
  activo: boolean;
}

export interface ConfigNotificaciones {
  limiteMensajes: number;
  colores: Record<string, { fondo: string, borde: string }>;
  diasAlertaVencimiento?: number;
  alertasActivas?: Record<string, boolean>;
  stockMinimoPorDefecto?: number;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardHeader, IonCardTitle, 
    IonCardContent, IonButton, IonIcon, IonBadge, IonItem, IonList, IonToggle, 
    IonInput, IonSelect, IonSelectOption, IonRange, IonGrid, IonRow, IonCol, IonText, IonSpinner
  ]
})
export class AdminPage implements OnInit {
  seccionActual: string = 'avisos';
  filtroAlertas: string = 'pendientes';
  
  alertas: AlertaVendedor[] = [];
  alertasFiltradas: AlertaVendedor[] = [];
  
  cigarrosConfig: ConfigCigarro[] = [];
  
  configNotif: ConfigNotificaciones = {
    limiteMensajes: 50,
    colores: {
      vencimiento: { fondo: '#121212', borde: '#ffce00' }
    },
    diasAlertaVencimiento: 7,
    alertasActivas: {
      vencimiento: true,
      stock: true,
      precio: true,
      oferta: true,
      'oferta-fin': true,
      nuevo: true,
      eliminado: true,
      sistema: true
    },
    stockMinimoPorDefecto: 5
  };
  
  // Estadísticas Rápidas
  totalProductos: number = 0;
  productosStockBajo: number = 0;
  productosProxVencer: number = 0;
  alertasPendientes: number = 0;
  totalTurnos: number = 0;

  // Injection of services using generic standard types to avoid compilation errors if paths vary
  // In a real project you'd import the actual services: import { InventarioService } from '../services/inventario.service';
  private inventarioService = inject<any>('InventarioService' as any, { optional: true });
  private authService = inject<any>('AuthService' as any, { optional: true });

  constructor() {
    addIcons({ checkmarkCircle, timeOutline, alertCircleOutline, saveOutline, listOutline, settingsOutline, statsChartOutline, constructOutline });
  }

  ngOnInit() {
    if (this.inventarioService?.alertasVendedor$) {
      this.inventarioService.alertasVendedor$.subscribe((alertas: AlertaVendedor[]) => {
        this.alertas = alertas || [];
        this.aplicarFiltroAlertas();
        this.alertasPendientes = this.alertas.filter(a => !a.resuelta).length;
      });
    }

    if (this.inventarioService?.obtenerConfigCigarros) {
      Promise.resolve(this.inventarioService.obtenerConfigCigarros()).then((config: any) => {
        if (config) this.cigarrosConfig = config;
      });
    }

    if (this.inventarioService?.configNotificaciones$) {
      this.inventarioService.configNotificaciones$.subscribe((config: ConfigNotificaciones) => {
        if (config) {
          this.configNotif = { ...this.configNotif, ...config };
          if (!this.configNotif.alertasActivas) {
            this.configNotif.alertasActivas = {
                vencimiento: true, stock: true, precio: true, oferta: true,
                'oferta-fin': true, nuevo: true, eliminado: true, sistema: true
            };
          }
        }
      });
    }

    if (this.inventarioService?.productos$) {
      this.inventarioService.productos$.subscribe((productos: any[]) => {
        if (!productos) return;
        this.totalProductos = productos.length;
        
        const minStock = this.configNotif.stockMinimoPorDefecto || 5;
        this.productosStockBajo = productos.filter(p => p.stock < minStock).length;
        
        const in7Days = new Date();
        in7Days.setDate(in7Days.getDate() + (this.configNotif.diasAlertaVencimiento || 7));
        this.productosProxVencer = productos.filter(p => {
          if (!p.fechaVencimiento) return false;
          const vDate = new Date(p.fechaVencimiento);
          return vDate <= in7Days && vDate >= new Date();
        }).length;
        
        if (this.inventarioService.esCigarro) {
          const cigarros = productos.filter(p => this.inventarioService.esCigarro(p));
          cigarros.forEach(cig => {
            const exists = this.cigarrosConfig.find(c => c.productoId === cig.id);
            if (!exists) {
              this.cigarrosConfig.push({
                productoId: cig.id,
                nombreProducto: cig.nombre,
                precioUnidad: cig.precio ? cig.precio / 20 : 0,
                cigarrosPorCajetilla: 20,
                activo: false
              });
            }
          });
        }
      });
    }
    
    if (this.inventarioService?.turnosSubject) {
        this.inventarioService.turnosSubject.subscribe((turnos: any[]) => {
            this.totalTurnos = turnos?.length || 0;
        });
    }
  }

  aplicarFiltroAlertas() {
    if (this.filtroAlertas === 'pendientes') {
      this.alertasFiltradas = this.alertas.filter(a => !a.resuelta);
    } else {
      this.alertasFiltradas = this.alertas.filter(a => a.resuelta);
    }
  }

  marcarResuelto(alerta: AlertaVendedor) {
    if (this.inventarioService?.resolverAlerta && alerta.id) {
      this.inventarioService.resolverAlerta(alerta.id);
      // Optimistic UI update
      alerta.resuelta = true;
      alerta.fechaResolucion = new Date().toISOString();
      this.aplicarFiltroAlertas();
    }
  }

  guardarConfigCigarros() {
    if (this.inventarioService?.guardarConfigCigarros) {
      this.inventarioService.guardarConfigCigarros(this.cigarrosConfig);
    }
  }

  guardarConfigNotificaciones() {
    if (this.inventarioService?.guardarConfiguracionNotificaciones) {
      this.inventarioService.guardarConfiguracionNotificaciones(this.configNotif);
    }
  }

  getTiposAlertas(): string[] {
    return Object.keys(this.configNotif.alertasActivas || {});
  }
}
