import { Component, OnInit, inject, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonButtons, IonMenuButton, IonSearchbar, IonList,
  IonItem, IonLabel, IonAvatar, IonCard, IonCardContent,
  IonInput, IonButton, IonIcon, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, cubeOutline, barcodeOutline, closeCircleOutline } from 'ionicons/icons';
// 🟢 1. Agregamos SupportedFormat aquí
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';

import { InventarioService, Producto } from '../services/inventario';

@Component({
  selector: 'app-ingreso-stock',
  templateUrl: './ingreso-stock.page.html',
  styleUrls: ['./ingreso-stock.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonMenuButton, IonSearchbar, IonList,
    IonItem, IonLabel, IonAvatar, IonCard, IonCardContent,
    IonInput, IonButton, IonIcon
  ]
})
export class IngresoStockPage implements OnInit, OnDestroy {
  
  private inventarioService = inject(InventarioService);
  private toastCtrl = inject(ToastController);
  private ngZone = inject(NgZone);

  textoBusqueda: string = '';
  productosEncontrados: Producto[] = [];
  productoSeleccionado: Producto | null = null;

  cantidadIngreso: number | null = null;
  fechaVencimientoLote: string = '';

  scannerActivo: boolean = false;

  constructor() {
    addIcons({ checkmarkCircleOutline, cubeOutline, barcodeOutline, closeCircleOutline });
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.detenerEscaner(); 
  }

  // --- BUSCADOR MANUAL ---
  buscarProducto(event: any) {
    const texto = event.target.value?.toLowerCase() || '';
    if (texto.trim() === '') {
      this.productosEncontrados = [];
      return;
    }

    const todos = this.inventarioService.productos;
    this.productosEncontrados = todos.filter(p => 
      p.nombre.toLowerCase().includes(texto) || 
      p.codigoBarras.includes(texto)
    );
  }

  // --- ESCÁNER DE CÓDIGO DE BARRAS BLINDADO ---
async escanearCodigo() {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (!status.granted) {
        this.mostrarToast('Permiso de cámara denegado', 'danger');
        return;
      }

      await BarcodeScanner.hideBackground();
      // 🟢 Usamos 'qrscanner' en lugar de 'scanner-active' para que coincida con tus estilos globales de las otras páginas
      document.body.classList.add('qrscanner'); 
      this.scannerActivo = true;

      const opciones = {
        targetedFormats: [
          SupportedFormat.EAN_13, 
          SupportedFormat.EAN_8, 
          SupportedFormat.UPC_A, 
          SupportedFormat.UPC_E
        ]
      };

      const result = await BarcodeScanner.startScan(opciones);
      this.detenerEscaner(); // Aseguramos de que se detenga al detectar algo

      if (result.hasContent) {
        const codigoLeido = result.content.trim();

        if (codigoLeido.length < 8) {
           this.mostrarToast('⚠️ Reflejo detectado. Intenta acercar la cámara de nuevo.', 'warning');
           return;
        }

        this.ngZone.run(() => {
          this.buscarPorCodigo(codigoLeido);
        });
      }
    } catch (e) {
      this.detenerEscaner();
    }
  }

  detenerEscaner() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner'); // 🟢 Removemos la misma clase
    this.scannerActivo = false;
  }

  buscarPorCodigo(codigo: string) {
    const todos = this.inventarioService.productos;
    const encontrado = todos.find(p => p.codigoBarras === codigo);
    
    if (encontrado) {
      this.seleccionarProducto(encontrado);
    } else {
      this.mostrarToast('Producto no encontrado en la base de datos', 'warning');
    }
  }

  // --- LÓGICA DE INTERFAZ ---
  seleccionarProducto(producto: Producto) {
    this.productoSeleccionado = producto;
    this.productosEncontrados = [];
    this.textoBusqueda = ''; 
    this.cantidadIngreso = null;
    this.fechaVencimientoLote = '';
  }

  cancelarIngreso() {
    this.productoSeleccionado = null;
  }

  async guardarIngreso() {
    if (!this.productoSeleccionado || !this.cantidadIngreso) {
      this.mostrarToast('Por favor, ingresa al menos la cantidad.', 'warning');
      return;
    }

    try {
      await this.inventarioService.registrarIngresoStock(
        this.productoSeleccionado, 
        this.cantidadIngreso, 
        this.fechaVencimientoLote
      );
      
      this.mostrarToast(`¡Se sumaron ${this.cantidadIngreso} unidades!`, 'success');
      this.productoSeleccionado = null; 
    } catch (error) {
      this.mostrarToast('Error al guardar el lote.', 'danger');
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}