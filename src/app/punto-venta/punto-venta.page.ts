import { Component, NgZone, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, IonFooter,
  IonSearchbar, // 🟢 IMPORTAMOS LA BARRA DE BÚSQUEDA
  AlertController, LoadingController, ToastController, IonThumbnail, IonMenuButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barcodeOutline, trashOutline, addCircleOutline, removeCircleOutline, cartOutline, checkmarkCircleOutline, searchOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { InventarioService, Producto } from '../services/inventario';

@Component({
  selector: 'app-punto-venta',
  templateUrl: './punto-venta.page.html',
  styleUrls: ['./punto-venta.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonBackButton, IonButton, IonIcon, IonList, IonItem, IonLabel, 
    IonNote, IonFooter, IonSearchbar, IonThumbnail, IonMenuButton // 🟢 LO AGREGAMOS A LOS IMPORTS
  ]
})
export class PuntoVentaPage {
  carrito: { producto: Producto, cantidad: number }[] = [];
  escaneando: boolean = false;
  total: number = 0;

  // 🟢 VARIABLES PARA EL POPUP ESTILO INSTAGRAM
  productoPreview: Producto | null = null;
  previewActivo: boolean = false;
  private pressTimeout: any;
  private fuePresionLarga: boolean = false;

  // 🟢 VARIABLES PARA EL BUSCADOR
  terminoBusqueda: string = '';
  productosFiltrados: Producto[] = [];

  private inventarioService = inject(InventarioService);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private ngZone = inject(NgZone);

  constructor() {
    addIcons({ barcodeOutline, trashOutline, addCircleOutline, removeCircleOutline, cartOutline, checkmarkCircleOutline, searchOutline });
  }

  // --- BUSCADOR MANUAL ---
  buscarProducto(event: any) {
    const termino = event.target.value?.toLowerCase() || '';

    if (!termino) {
      this.productosFiltrados = [];
      return;
    }

    // Filtramos y ordenamos alfabéticamente
    this.productosFiltrados = this.inventarioService.productos
      .filter(p => p.nombre.toLowerCase().includes(termino))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)); // Orden alfabético
  }

  agregarDesdeBuscador(producto: Producto, event?: Event) {
    if (this.fuePresionLarga) {
      // Si fue una presión larga, ignoramos el click para no agregarlo.
      // Pero por seguridad, forzamos el desbloqueo aquí también.
      setTimeout(() => this.fuePresionLarga = false, 50);
      return; 
    }
    
    // Si fue un toque rápido normal, lo agregamos al carrito
    this.procesarIngresoAlCarrito(producto);
    this.terminoBusqueda = '';
    this.productosFiltrados = [];
  }

  // 🟢 EL ESCUDO DEFINITIVO: Escucha TODA la pantalla del celular
  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  @HostListener('window:touchcancel')
  liberarPantalla() {
    this.terminarPresion();
  }

  // --- POPUP ESTILO INSTAGRAM (PEEK) ---
 // --- POPUP ESTILO INSTAGRAM (PEEK) ---
  iniciarPresion(producto: Producto, event: Event) {
    this.fuePresionLarga = false;
    clearTimeout(this.pressTimeout);
    
    // Iniciamos el temporizador
    this.pressTimeout = setTimeout(() => {
      this.fuePresionLarga = true;
      this.ngZone.run(() => {
        this.productoPreview = producto;
        this.previewActivo = true;
      });
    }, 400); 
  }

  // 🟢 MEJORA: Esta función es el "matador" de popups rebeldes
  cancelarSiSeMueve(event: any) {
    // Si el usuario desliza, cancelamos todo inmediatamente
    clearTimeout(this.pressTimeout);
    
    if (this.previewActivo) {
       this.terminarPresion();
    }
    
    this.fuePresionLarga = false;
  }

  terminarPresion(event?: Event) {
    clearTimeout(this.pressTimeout); 
    
    // Si hay un evento, evitamos que propague clics basura
    if (event) {
        event.stopPropagation();
    }
    
    this.ngZone.run(() => {
      this.previewActivo = false;
      setTimeout(() => {
        this.productoPreview = null;
        this.fuePresionLarga = false; 
      }, 250); 
    });
  }

  prevenirMenu(event: Event) {
    event.preventDefault(); 
  }
  

 



  // --- ESCÁNER PARA VENDER ---
  async escanearParaVender() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.escaneando = true;

      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        this.ngZone.run(() => {
          this.agregarAlCarritoPorCodigo(result.content.trim());
        });
      }
    } catch (error) {
      console.error('Error al escanear', error);
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

  // --- LÓGICA DEL CARRITO ---
  async agregarAlCarritoPorCodigo(codigo: string) {
    const productoEncontrado = this.inventarioService.productos.find(p => p.codigoBarras === codigo);

    if (!productoEncontrado) {
      const alert = await this.alertController.create({
        header: 'No encontrado',
        message: 'Este producto no está en el inventario.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.procesarIngresoAlCarrito(productoEncontrado);
  }

  // Función unificada para agregar al carrito (ya sea por escáner o buscador)
  procesarIngresoAlCarrito(producto: Producto) {
    const itemEnCarrito = this.carrito.find(item => item.producto.id === producto.id);

    if (itemEnCarrito) {
      itemEnCarrito.cantidad++;
    } else {
      this.carrito.push({ producto: producto, cantidad: 1 });
    }
    
    this.calcularTotal();
  }

  cambiarCantidad(index: number, delta: number) {
    this.carrito[index].cantidad += delta;
    if (this.carrito[index].cantidad <= 0) {
      this.carrito.splice(index, 1);
    }
    this.calcularTotal();
  }

  calcularTotal() {
    this.total = this.carrito.reduce((acc, item) => acc + (item.producto.precio * item.cantidad), 0);
  }

  // --- CONFIRMAR VENTA ---
  async confirmarVenta() {
    if (this.carrito.length === 0) return;

    const alert = await this.alertController.create({
      header: 'Confirmar Venta',
      message: `¿Cobrar un total de $${this.total}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Sí, Cobrar', 
          handler: () => this.ejecutarVenta() 
        }
      ]
    });
    await alert.present();
  }

  async ejecutarVenta() {
    const loading = await this.loadingController.create({
      message: 'Procesando venta...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      await this.inventarioService.procesarVenta(this.carrito, this.total);
      
      this.carrito = []; 
      this.calcularTotal();
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: '¡Venta registrada y stock actualizado!',
        duration: 2500,
        color: 'success',
        icon: 'checkmark-circle-outline'
      });
      await toast.present();

    } catch (error) {
      await loading.dismiss();
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Hubo un problema al procesar la venta.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  ionViewWillLeave() {
    if (this.escaneando) this.detenerEscaneo();
  }
}