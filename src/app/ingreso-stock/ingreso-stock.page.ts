import { Component, OnInit, inject, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonMenuButton, IonSearchbar, IonList,
  IonItem, IonLabel, IonAvatar, IonCard, IonCardContent,
  IonInput, IonButton, IonIcon, ToastController,
  IonNote, IonRow, IonCol, IonListHeader,
  LoadingController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, cubeOutline, barcodeOutline, closeCircleOutline, cameraOutline, trashOutline, alertCircleOutline, cashOutline } from 'ionicons/icons';
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { InventarioService, Producto } from '../services/inventario';
import { AiFacturasService, ProductoFactura } from '../services/ai';

export interface ProductoIA extends ProductoFactura {
  productoDB: Producto | null;
  enlazado: boolean;
}

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
    IonInput, IonButton, IonIcon,
    IonNote, IonRow, IonCol, IonListHeader
  ]
})
export class IngresoStockPage implements OnInit, OnDestroy {
  productosDetectados: ProductoIA[] = [];
  
  private inventarioService = inject(InventarioService);
  private toastCtrl = inject(ToastController);
  private ngZone = inject(NgZone);

  private aiService = inject(AiFacturasService);
  private loadingCtrl = inject(LoadingController);

  public escaneando: boolean = false;

  textoBusqueda: string = '';
  productosEncontrados: Producto[] = [];
  productoSeleccionado: Producto | null = null;

  cantidadIngreso: number | null = null;
  fechaVencimientoLote: string = '';

  scannerActivo: boolean = false;

  constructor() {
    // 🟢 Agregamos los íconos de alerta y dinero para la nueva interfaz
    addIcons({ barcodeOutline, cameraOutline, trashOutline, cubeOutline, checkmarkCircleOutline, closeCircleOutline, alertCircleOutline, cashOutline });
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.detenerEscaner();
  }

  // --- BUSCADOR MANUAL Y ESCÁNER BLINDADO (Se mantiene igual) ---
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

  async escanearCodigo() {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (!status.granted) {
        this.mostrarToast('Permiso de cámara denegado', 'danger');
        return;
      }
      await BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.scannerActivo = true;

      const opciones = {
        targetedFormats: [ SupportedFormat.EAN_13, SupportedFormat.EAN_8, SupportedFormat.UPC_A, SupportedFormat.UPC_E ]
      };

      const result = await BarcodeScanner.startScan(opciones);
      this.detenerEscaner();

      if (result.hasContent) {
        const codigoLeido = result.content.trim();
        if (codigoLeido.length < 8) {
           this.mostrarToast('⚠️ Reflejo detectado. Intenta acercar la cámara de nuevo.', 'warning');
           return;
        }
        this.ngZone.run(() => { this.buscarPorCodigo(codigoLeido); });
      }
    } catch (e) {
      this.detenerEscaner();
    }
  }

  detenerEscaner() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
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

  // --- LÓGICA DE INTERFAZ MANUAL (Se mantiene igual) ---
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


  // ==========================================
  // --- IA: NUEVA LÓGICA DE FACTURAS ---
  // ==========================================

  async escanearFactura() {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (!photo.base64String) return;

      const loading = await this.loadingCtrl.create({
        message: 'Analizando factura con IA...',
        spinner: 'crescent'
      });
      await loading.present();

      // 1. Llamamos a la IA (ya no le pasamos el inventario)
      const resultadosIA = await this.aiService.analizarFactura(photo.base64String);
      
      // 2. Cruzamos los datos nosotros mismos aquí en el teléfono
      const inventario = this.inventarioService.productos;
      
      this.productosDetectados = resultadosIA.map(item => {
        // Intentamos buscar coincidencia por Código primero, luego por Nombre exacto
        let coincidencia = inventario.find(p => p.codigoBarras === item.codigoProveedor);
        
        if (!coincidencia) {
           coincidencia = inventario.find(p => p.nombre.toLowerCase() === item.descripcionOriginal.toLowerCase());
        }

        // Le añadimos variables extra al objeto para que el HTML sepa cómo pintarlo
        return {
          ...item,
          productoDB: coincidencia || null,
          enlazado: !!coincidencia // true si lo encontró, false si es nuevo
        } as ProductoIA;
      });

      await loading.dismiss();
    } catch (error) {
      this.loadingCtrl.dismiss();
      console.error(error);
      this.mostrarToast('Hubo un problema al leer la factura. Intenta que la foto sea más clara.', 'danger');
    }
  }

  quitarProducto(index: number) {
    this.productosDetectados.splice(index, 1);
  }

  // Verifica si hay productos marcados como "no enlazados"
  hayProductosSinVincular(): boolean {
    if (!this.productosDetectados) return false;
    return this.productosDetectados.some(item => !item.enlazado);
  }

  // Escáner especial para asociar productos que la IA no encontró
  async vincularProductoNuevo(index: number) {
    try {
      await BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.scannerActivo = true;

      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        const codigoEscaneado = result.content;
        
        // Buscamos si este código físico realmente existe en tu base de datos
        const productoReal = this.inventarioService.productos.find(p => p.codigoBarras === codigoEscaneado);
        
        this.ngZone.run(() => {
          if (productoReal) {
            // ¡Éxito! Lo vinculamos
            this.productosDetectados[index].productoDB = productoReal;
            this.productosDetectados[index].enlazado = true;
            this.mostrarToast('¡Producto vinculado correctamente!', 'success');
          } else {
            // No existe en la DB. Debe ir al catálogo a crearlo primero.
            this.mostrarToast('Ese código no está en el catálogo. Por favor, créalo primero en la sección "Productos".', 'danger');
          }
        });
      }
    } catch (error) {
      console.error('Error al vincular:', error);
    } finally {
      this.detenerEscaner();
    }
  }

  // Función final: Recorre la lista verificada y guarda el stock
  async guardarStockIA() {
    const loading = await this.loadingCtrl.create({ message: 'Guardando stock...' });
    await loading.present();

    try {
      for (let item of this.productosDetectados) {
        if (item.enlazado && item.productoDB) {
          // Llama a tu función estrella de Firebase
          await this.inventarioService.registrarIngresoStock(
            item.productoDB,
            item.cantidadFactura,
            '' // Aquí podrías pasar la fecha de vencimiento si la IA la encontró en detallesExtra
          );
        }
      }

      await loading.dismiss();
      this.productosDetectados = []; // Limpiamos la pantalla
      this.mostrarToast('¡Inventario actualizado con éxito!', 'success');
      
    } catch (error) {
      await loading.dismiss();
      console.error(error);
      this.mostrarToast('Error al guardar el stock masivo', 'danger');
    }
  }
}