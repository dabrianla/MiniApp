import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonButtons, IonMenuButton, IonIcon, IonButton,
  IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonBadge, IonNote, IonModal, 
  IonSelect, IonSelectOption, IonSearchbar // 🟢 Añadido Searchbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, timeOutline, alertCircleOutline, cubeOutline, barcodeOutline, searchOutline } from 'ionicons/icons'; // 🟢 Añadidos iconos cámara
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'; // 🟢 Añadido plugin

import { InventarioService, Producto, EventoHistorial, ConfigNotificaciones, COLORES_POR_DEFECTO } from '../services/inventario';
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
    IonList, IonItem, IonBadge, IonNote, IonModal, IonSelect, IonSelectOption,
    IonSearchbar // 🟢 Lo registramos
  ]
})
export class NotificacionesPage implements OnInit, OnDestroy {
  
  @ViewChild('contentChat', { static: false }) contentChat!: IonContent;

  public inventarioService = inject(InventarioService);
  public authService = inject(AuthService);
  public router = inject(Router);

  private subscripciones: Subscription[] = [];

  esAdmin: boolean = false; 
  vistaActual: string = 'admin'; // Forzado a admin por defecto para ver las listas
  filtroAdmin: string = 'vencimientos';

  // 🟢 VARIABLES DE BÚSQUEDA Y ESCÁNER
  textoBusqueda: string = '';
  escaneando: boolean = false;

  productosPorVencer: Producto[] = [];
  productosPorStock: Producto[] = []; 
  historialAgrupado: { fechaTitulo: string, eventos: EventoHistorial[] }[] = [];

  // CONFIGURACIÓN DEL ADMIN
  modalConfigAbierto: boolean = false;
  configActual!: ConfigNotificaciones;
  
  tiposAlerta = [
    { key: 'vencimiento', label: 'Vencimientos' },
    { key: 'oferta', label: 'Ofertas Nuevas' },
    { key: 'oferta-fin', label: 'Fin de Ofertas' },
    { key: 'stock', label: 'Stock Bajo' },
    { key: 'precio', label: 'Cambios de Precio' },
    { key: 'nuevo', label: 'Productos Nuevos' },
    { key: 'eliminado', label: 'Productos Eliminados' },
    { key: 'sistema', label: 'Avisos de Sistema' }
  ];

  constructor() {
    // 🟢 Agregamos barcodeOutline y searchOutline a los iconos disponibles
    addIcons({ settingsOutline, timeOutline, alertCircleOutline, cubeOutline, barcodeOutline, searchOutline });
  }

  ngOnInit() {
    if (this.authService.userData && this.authService.userData.rol === 'admin') {
      this.esAdmin = true;
      this.vistaActual = 'admin'; 
    }

    this.inventarioService.obtenerConfiguracionNotificaciones();

    this.subscripciones.push(this.inventarioService.productos$.subscribe(() => {
      this.procesarDatosAdmin();
    }));
    
    this.subscripciones.push(this.inventarioService.historial$.subscribe(historial => {
      this.agruparHistorialPorFecha(historial);
      if (this.vistaActual === 'chat') {
        this.hacerScrollAbajo();
        this.inventarioService.marcarHistorialComoVisto();
      }
    }));

    this.subscripciones.push(this.inventarioService.configNotificaciones$.subscribe(config => {
      this.configActual = JSON.parse(JSON.stringify(config));
    }));

    this.procesarDatosAdmin();
  }

  ngOnDestroy() {
    this.subscripciones.forEach(sub => sub.unsubscribe());
  }

  // Si cerramos la pestaña a la mitad de un escaneo, lo matamos.
  ionViewWillLeave() {
    if (this.escaneando) this.detenerEscaneo();
  }

  // =====================================
  // 🟢 LÓGICA DE BÚSQUEDA Y ESCÁNER
  // =====================================

  buscarProducto(event: any) {
    this.textoBusqueda = event.target.value.toLowerCase();
    this.procesarDatosAdmin();
  }

  limpiarBusqueda() {
    this.textoBusqueda = '';
    this.procesarDatosAdmin();
  }

  async escanearParaBuscar() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner'); // Asegúrate de tener esto en tu global.scss
      this.escaneando = true;
      const result = await BarcodeScanner.startScan(); 
      if (result.hasContent) {
        this.textoBusqueda = result.content.trim(); 
        this.procesarDatosAdmin(); // Actualizamos las listas con el filtro
      }
    } catch (error) { 
      console.error('Error de Escáner', error); 
    } finally { 
      this.detenerEscaneo(); 
    }
  }

  detenerEscaneo() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
    this.escaneando = false; 
  }

  // =====================================
  // LÓGICA PRINCIPAL DEL PANEL DE ADMIN
  // =====================================

  procesarDatosAdmin() {
    const todosLosProductos = this.inventarioService.productos;
    
    // 1. Preparamos las listas base
    let vencimientosTemp = todosLosProductos.filter(p => {
      if (p.stock === null || p.stock === undefined || p.stock <= 0) return false;
      if (!p.fechaVencimiento || p.fechaVencimiento === 'Sin vencimiento' || p.fechaVencimiento === '') return false;
      return true;
    });

    let stockTemp = todosLosProductos.filter(p => p.stock !== null && p.stock !== undefined);

    // 2. Si hay algo escrito en la búsqueda, filtramos ambas listas
    if (this.textoBusqueda && this.textoBusqueda.trim() !== '') {
      const termino = this.textoBusqueda.trim().toLowerCase();
      
      const filtro = (p: Producto) => {
        const nombreStr = p.nombre ? String(p.nombre).toLowerCase() : '';
        const codigoStr = p.codigoBarras ? String(p.codigoBarras).toLowerCase() : '';
        return nombreStr.includes(termino) || codigoStr.includes(termino);
      };

      vencimientosTemp = vencimientosTemp.filter(filtro);
      stockTemp = stockTemp.filter(filtro);
    }

    // 3. Ordenamos las listas finales resultantes
    this.productosPorVencer = vencimientosTemp.sort((a, b) => this.obtenerFecha(a.fechaVencimiento).getTime() - this.obtenerFecha(b.fechaVencimiento).getTime());
    this.productosPorStock = stockTemp.sort((a, b) => (a.stock || 0) - (b.stock || 0));
  }

  // =====================================
  // RESTO DE FUNCIONES (Diseño y Utilidad)
  // =====================================

  cambiarVista(event: any) {
    if (this.vistaActual === 'chat') {
      this.inventarioService.marcarHistorialComoVisto();
      this.hacerScrollAbajo();
    }
  }

  hacerScrollAbajo() {
    setTimeout(() => { if (this.contentChat) this.contentChat.scrollToBottom(300); }, 150); 
  }

  agruparHistorialPorFecha(historial: EventoHistorial[]) {
    const grupos: Record<string, EventoHistorial[]> = {};
    historial.forEach(evento => {
      const fechaObj = new Date(evento.fecha);
      const tituloDia = this.formatearTituloDia(fechaObj);
      if (!grupos[tituloDia]) grupos[tituloDia] = [];
      grupos[tituloDia].push(evento);
    });
    this.historialAgrupado = Object.keys(grupos).map(key => ({ fechaTitulo: key, eventos: grupos[key] }));
  }

  formatearTituloDia(fecha: Date): string {
    const hoy = new Date(); const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    if (fecha.toDateString() === hoy.toDateString()) return 'Hoy';
    if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatearHora(fechaIso: string): string {
    return new Date(fechaIso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  obtenerEstiloBurbuja(tipo: string) {
    const colores = (this.configActual && this.configActual.colores && this.configActual.colores[tipo]) 
                    ? this.configActual.colores[tipo] 
                    : COLORES_POR_DEFECTO[tipo as keyof typeof COLORES_POR_DEFECTO] || { fondo: '#eee', borde: '#ccc' };
    
    return {
      'background-color': colores.fondo,
      'border-left': `5px solid ${colores.borde}`
    };
  }

  irAlProductoHistorial(evento: EventoHistorial) {
    if (evento.productoId) {
      const producto = this.inventarioService.productos.find(p => p.id === evento.productoId);
      if(producto) this.router.navigate(['/productos'], { queryParams: { buscar: producto.codigoBarras || producto.nombre } });
    }
  }

  irAlProductoAdmin(prod: Producto) {
    this.router.navigate(['/productos'], { queryParams: { buscar: prod.codigoBarras || prod.nombre } });
  }

  obtenerFecha(fechaVal: any): Date {
    if (!fechaVal) return new Date(0);
    if (typeof fechaVal.toDate === 'function') return fechaVal.toDate();
    return new Date(fechaVal);
  }

  calcularDias(fechaVal: any): number {
    if (!fechaVal) return 999;
    const f = this.obtenerFecha(fechaVal); const hoy = new Date();
    hoy.setHours(0,0,0,0); f.setHours(0,0,0,0);
    return Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
  }

  getColorBadge(dias: number): string {
    if (dias < 0) return 'dark'; if (dias <= 3) return 'danger'; if (dias <= 7) return 'warning'; return 'success';                
  }

  getColorStock(s: number | null, m: number | null | undefined): string {
    if (s === null) return 'medium'; if (s <= 0) return 'danger'; if (m !== null && m !== undefined && s <= m) return 'warning'; return 'success'; 
  }

  abrirConfiguracion() {
    this.modalConfigAbierto = true;
  }

  cerrarConfiguracion() {
    this.modalConfigAbierto = false;
    this.configActual = JSON.parse(JSON.stringify(this.inventarioService.configNotificacionesSubject.value));
  }

  async guardarConfiguracion() {
    await this.inventarioService.guardarConfiguracionNotificaciones(this.configActual);
    this.modalConfigAbierto = false;
  }
}