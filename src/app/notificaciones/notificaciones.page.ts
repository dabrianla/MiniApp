import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonButtons, IonMenuButton, IonIcon, IonButton,
  IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonBadge, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
// 🟢 Agregamos el ícono "cubeOutline" para el stock
import { settingsOutline, timeOutline, alertCircleOutline, cubeOutline } from 'ionicons/icons';

import { InventarioService, Producto } from '../services/inventario';
import { AuthService } from '../services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonMenuButton, IonIcon, IonButton,
    IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonBadge, IonNote
  ]
})
export class NotificacionesPage implements OnInit, OnDestroy {
  
  public inventarioService = inject(InventarioService);
  public authService = inject(AuthService);
  public router = inject(Router);

  private subscripcionInventario!: Subscription;

  esAdmin: boolean = true; 
  vistaActual: string = 'admin'; 
  filtroAdmin: string = 'vencimientos'; // 🟢 Controla si vemos Vencimientos o Stock

  productosPorVencer: Producto[] = [];
  productosPorStock: Producto[] = [];   // 🟢 Nueva lista para el stock
  alertas: any[] = []; 

  constructor() {
    addIcons({ settingsOutline, timeOutline, alertCircleOutline, cubeOutline });
  }

  ngOnInit() {
    this.subscripcionInventario = this.inventarioService.productos$.subscribe(() => {
      this.procesarDatos();
    });
    this.procesarDatos();
  }

  ngOnDestroy() {
    if (this.subscripcionInventario) {
      this.subscripcionInventario.unsubscribe();
    }
  }

  procesarDatos() {
    const todosLosProductos = this.inventarioService.productos;
    
    // --- 1A. PANEL ADMIN: VENCIMIENTOS ---
    const productosConVencimiento = todosLosProductos.filter(p => p.fechaVencimiento);
    this.productosPorVencer = productosConVencimiento.sort((a, b) => {
      const fechaA = this.obtenerFecha(a.fechaVencimiento).getTime();
      const fechaB = this.obtenerFecha(b.fechaVencimiento).getTime();
      return fechaA - fechaB;
    });

    // --- 1B. PANEL ADMIN: STOCK ---
    // Filtramos solo los que llevan control de stock y los ordenamos de menor a mayor
    this.productosPorStock = todosLosProductos
      .filter(p => p.stock !== null && p.stock !== undefined)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0));

    // --- 2. VISTA EMPLEADO: CHAT ---
    this.generarChatEmpleado(todosLosProductos);
  }

  generarChatEmpleado(productos: Producto[]) {
    this.alertas = []; 
    productos.forEach(prod => {
      if (prod.fechaVencimiento) {
        const dias = this.calcularDias(prod.fechaVencimiento);
        if (dias <= 7 && dias > 0) {
          this.alertas.push({ tipo: 'vencimiento', mensaje: `El producto "${prod.nombre}" está por vencer en ${dias} días.`, fecha: 'Sistema', producto: prod });
        } else if (dias <= 0) {
          this.alertas.push({ tipo: 'vencimiento', mensaje: `¡El producto "${prod.nombre}" vence hoy o ya está vencido!`, fecha: 'Urgente', producto: prod });
        }
      }
      if (prod.oferta) {
        this.alertas.push({ tipo: 'oferta', mensaje: `Producto en Oferta: "${prod.nombre}" a $${this.formatearPrecio(prod.precio)}.`, fecha: 'Promoción', producto: prod });
      }
      if (prod.stockMinimo !== null && prod.stockMinimo !== undefined && prod.stock !== null) {
        if (prod.stock <= prod.stockMinimo) {
          this.alertas.push({ tipo: 'stock', mensaje: `Stock bajo detectado: Solo quedan ${prod.stock} unidades de "${prod.nombre}".`, fecha: 'Inventario', producto: prod });
        }
      }
    });
  }

  irAlProducto(alerta: any) {
    if (alerta.producto) {
      const termino = alerta.producto.codigoBarras || alerta.producto.nombre;
      this.router.navigate(['/productos'], { queryParams: { buscar: termino } });
    }
  }

  obtenerFecha(fechaVal: any): Date {
    if (!fechaVal) return new Date(0);
    if (typeof fechaVal.toDate === 'function') return fechaVal.toDate();
    return new Date(fechaVal);
  }

  calcularDias(fechaVal: any): number {
    if (!fechaVal) return 999;
    const fechaVencimiento = this.obtenerFecha(fechaVal);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVencimiento.setHours(0, 0, 0, 0);
    const diferencia = fechaVencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  getColorBadge(dias: number): string {
    if (dias < 0) return 'dark';     
    if (dias <= 3) return 'danger';  
    if (dias <= 7) return 'warning'; 
    return 'success';                
  }

  // 🟢 Determina el color para el ícono y badge de Stock
  getColorStock(stock: number | null, minStock: number | null | undefined): string {
    if (stock === null) return 'medium';
    if (stock <= 0) return 'danger'; // Rojo si está agotado
    if (minStock !== null && minStock !== undefined && stock <= minStock) return 'warning'; // Amarillo si está bajo el mínimo
    return 'success'; // Verde si está bien de stock
  }

  formatearPrecio(precio: number): string {
    if (!precio) return '0';
    return precio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  abrirConfiguracion() {
    console.log("Abriendo configuración...");
  }
}