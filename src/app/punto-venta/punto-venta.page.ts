import { Component, NgZone, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, IonFooter,
  IonSearchbar, AlertController, LoadingController, ToastController, 
  IonThumbnail, IonMenuButton, IonModal, IonSegment, IonSegmentButton, IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  barcodeOutline, trashOutline, addCircleOutline, removeCircleOutline, cartOutline, 
  checkmarkCircleOutline, searchOutline, closeCircleOutline, closeOutline, backspaceOutline, 
  scaleOutline, cashOutline, cardOutline, walletOutline, phonePortraitOutline, homeOutline, 
  cameraOutline, storefrontOutline, lockClosedOutline, personOutline, flameOutline
} from 'ionicons/icons'; 
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';
import { InventarioService, Producto, ConfigCigarro } from '../services/inventario';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-punto-venta',
  templateUrl: './punto-venta.page.html',
  styleUrls: ['./punto-venta.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, DecimalPipe,
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonBackButton, IonButton, IonIcon, IonList, IonItem, IonLabel, 
    IonNote, IonFooter, IonSearchbar, IonThumbnail, IonMenuButton, IonModal, 
    IonSegment, IonSegmentButton, IonInput
  ]
})
export class PuntoVentaPage implements OnInit {
  carrito: { producto: Producto, cantidad: number }[] = [];
  escaneando: boolean = false;
  total: number = 0;
  textoBusqueda: string = '';

  // Preview de producto (presión larga)
  productoPreview: Producto | null = null;
  previewActivo: boolean = false;
  private pressTimeout: any;
  private fuePresionLarga: boolean = false;

  // Buscador
  productosFiltrados: Producto[] = [];

  // Modal de cobro
  modalCobroAbierto: boolean = false;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo';
  montoRecibido: number | null = null;
  fotoTransferencia: string = '';

  // Montos rápidos para efectivo
  montosRapidos: number[] = [1000, 2000, 5000, 10000, 20000, 50000];

  // Control de caja
  cajaAbierta: boolean = false;
  nombreCajero: string = '';
  fondoDeCaja: number | null = null;
  turnoActual: any = null;

  // Calculadora de verduras
  mostrarCalculadora: boolean = false;
  productoPesable: any = null;
  modoCalculadora: 'peso' | 'monto' = 'peso';
  inputCalculo: string = '';
  tecladoFilas: string[][] = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
  ];

  // Panel de cigarros
  panelCigarrosAbierto: boolean = false;
  productosCigarros: Producto[] = [];
  configCigarros: (ConfigCigarro & { cantidadTemp?: number })[] = [];

  private inventarioService = inject(InventarioService);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private ngZone = inject(NgZone);
  private router = inject(Router);

  // Exponer parseFloat para el template
  parseFloat = parseFloat;

  constructor() {
    addIcons({ 
      barcodeOutline, trashOutline, addCircleOutline, removeCircleOutline, cartOutline, 
      checkmarkCircleOutline, searchOutline, closeCircleOutline, closeOutline, backspaceOutline, 
      scaleOutline, cashOutline, cardOutline, walletOutline, phonePortraitOutline, homeOutline, 
      cameraOutline, storefrontOutline, lockClosedOutline, personOutline, flameOutline
    });
  }

  async ngOnInit() {
    const turnoGuardado = localStorage.getItem('turno_minimarket');
    if (turnoGuardado) {
      this.turnoActual = JSON.parse(turnoGuardado);
      this.cajaAbierta = true;
      this.nombreCajero = this.turnoActual.cajero;
    }

    // Cargar productos cigarros y config
    this.inventarioService.productos$.subscribe(prods => {
      this.productosCigarros = prods.filter(p => this.inventarioService.esCigarro(p));
    });

    const cfg = await this.inventarioService.obtenerConfigCigarros();
    this.configCigarros = (cfg.cigarros || []).map(c => ({ ...c, cantidadTemp: 0 }));
  }

  abrirCaja() {
    if (this.nombreCajero.trim() === '' || this.fondoDeCaja === null || this.fondoDeCaja < 0) return;

    this.turnoActual = {
      cajero: this.nombreCajero,
      fondoCaja: this.fondoDeCaja,
      fechaInicio: new Date().toISOString(),
      ventas: [],
      totalEfectivo: 0,
      totalTarjeta: 0,
      totalTransferencia: 0,
      totalCigarros: 0,
      totalGeneral: 0
    };

    localStorage.setItem('turno_minimarket', JSON.stringify(this.turnoActual));
    this.cajaAbierta = true;
  }

  async confirmarCierreCaja() {
    const efectivoEsperado = (this.turnoActual.fondoCaja || 0) + (this.turnoActual.totalEfectivo || 0);
    const totalTarjeta = this.turnoActual.totalTarjeta || 0;
    const totalTransferencia = this.turnoActual.totalTransferencia || 0;
    const totalGeneral = this.turnoActual.totalGeneral || 0;
    const cantVentas = this.turnoActual.ventas?.length || 0;

    const alert = await this.alertController.create({
      header: '📊 Resumen del Turno',
      cssClass: 'alert-cierre-caja',
      message: `
        <div style="text-align:left; font-size:0.95rem; line-height:1.8;">
          <b style="color:#ffce00">Cajero: ${this.nombreCajero}</b><br>
          <span style="color:#aaa">Ventas realizadas: ${cantVentas}</span><br><br>
          💵 Efectivo vendido: <b>$${totalGeneral - totalTarjeta - totalTransferencia}</b><br>
          💳 Tarjeta: <b>$${totalTarjeta}</b><br>
          📱 Transferencia: <b>$${totalTransferencia}</b><br>
          <hr style="border-color:rgba(255,255,255,0.1); margin:10px 0;">
          🧾 Total vendido: <b style="color:#2dd36f">$${totalGeneral}</b><br><br>
          💰 Fondo inicial: <b>$${this.turnoActual.fondoCaja}</b><br>
          <div style="background:rgba(45,211,111,0.15); border:1px solid #2dd36f; border-radius:8px; padding:10px; margin-top:10px; text-align:center;">
            <span style="color:#aaa; font-size:0.85rem;">Deberías tener en tu estuche:</span><br>
            <span style="color:#2dd36f; font-size:1.6rem; font-weight:900;">$${efectivoEsperado}</span>
          </div>
        </div>`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Cerrar Turno', 
          cssClass: 'btn-confirm-danger',
          handler: () => { this.ngZone.run(() => { this.ejecutarCierre(); }); } 
        }
      ]
    });
    await alert.present();
  }

  async ejecutarCierre() {
    const loading = await this.loadingController.create({ message: 'Guardando turno...', spinner: 'circles' });
    await loading.present();

    this.turnoActual.fechaFin = new Date().toISOString();
    await this.inventarioService.guardarTurnoCaja(this.turnoActual);
    
    localStorage.removeItem('turno_minimarket');
    this.cajaAbierta = false;
    this.nombreCajero = '';
    this.fondoDeCaja = null; 
    this.turnoActual = null;
    this.carrito = [];
    
    await loading.dismiss();
  }

  // ========== BUSCADOR ==========
  buscarProducto(event: any) {
    const termino = event.target.value?.toLowerCase() || '';
    if (!termino) {
      this.productosFiltrados = [];
      return;
    }
    this.productosFiltrados = this.inventarioService.productos
      .filter(p => p.nombre.toLowerCase().includes(termino) || (p.codigoBarras || '').includes(termino))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  agregarDesdeBuscador(producto: Producto, event?: Event) {
    if (this.fuePresionLarga) {
      setTimeout(() => this.fuePresionLarga = false, 50);
      return;
    }
    // Si es verdura/pesable, abrir calculadora directamente
    if (this.esVerduraOPesable(producto)) {
      this.abrirCalculadora(producto);
      return;
    }
    this.procesarIngresoAlCarrito(producto);
    this.textoBusqueda = '';
    this.productosFiltrados = [];
  }

  agregarDesdeListaProductos(producto: Producto) {
    this.procesarIngresoAlCarrito(producto);
  }

  esVerduraOPesable(prod: Producto): boolean {
    const cat = (prod.categoria || '').toLowerCase();
    return cat === 'verdulería' || cat === 'panadería' || cat === 'verdura' || cat === 'panaderia';
  }

  // ========== PRESIÓN LARGA ==========
  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  @HostListener('window:touchcancel')
  liberarPantalla() { this.terminarPresion(); }

  iniciarPresion(producto: Producto, event: Event) {
    this.fuePresionLarga = false;
    clearTimeout(this.pressTimeout);
    this.pressTimeout = setTimeout(() => {
      this.fuePresionLarga = true;
      this.ngZone.run(() => {
        this.productoPreview = producto;
        this.previewActivo = true;
      });
    }, 400); 
  }

  cancelarSiSeMueve(event: any) {
    clearTimeout(this.pressTimeout);
    if (this.previewActivo) this.terminarPresion();
    this.fuePresionLarga = false;
  }

  terminarPresion(event?: Event) {
    clearTimeout(this.pressTimeout);
    if (event) event.stopPropagation();
    this.ngZone.run(() => {
      this.previewActivo = false;
      setTimeout(() => {
        this.productoPreview = null;
        this.fuePresionLarga = false;
      }, 250);
    });
  }

  prevenirMenu(event: Event) { event.preventDefault(); }

  // ========== ESCÁNER ==========
  async escanearParaVender() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.escaneando = true;

      const opciones = {
        targetedFormats: [
          SupportedFormat.EAN_13, 
          SupportedFormat.EAN_8, 
          SupportedFormat.UPC_A, 
          SupportedFormat.UPC_E
        ]
      };

      const result = await BarcodeScanner.startScan(opciones);
      
      if (result.hasContent) {
        const codigoLeido = result.content.trim();
        if (codigoLeido.length < 8) {
          const toast = await this.toastController.create({
            message: '⚠️ Código borroso. Intenta escanear de nuevo.',
            duration: 2500,
            color: 'warning'
          });
          await toast.present();
          this.detenerEscaneo();
          return;
        }
        this.ngZone.run(() => { this.agregarAlCarritoPorCodigo(codigoLeido); });
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

  async agregarAlCarritoPorCodigo(codigo: string) {
    const productoEncontrado = this.inventarioService.productos.find(p => p.codigoBarras === codigo);
    if (!productoEncontrado) {
      const alert = await this.alertController.create({
        header: 'No encontrado',
        message: 'Este código no está en el inventario.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    if (this.esVerduraOPesable(productoEncontrado)) {
      this.ngZone.run(() => this.abrirCalculadora(productoEncontrado));
    } else {
      this.procesarIngresoAlCarrito(productoEncontrado);
    }
  }

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

  limpiarCarrito() {
    this.carrito = [];
    this.calcularTotal();
  }

  calcularTotal() {
    this.total = this.carrito.reduce((acc, item) => acc + (item.producto.precio * item.cantidad), 0);
  }

  // ========== CIGARROS ==========
  togglePanelCigarros() {
    this.panelCigarrosAbierto = !this.panelCigarrosAbierto;
  }

  cambiarCigarrosSueltos(conf: ConfigCigarro & { cantidadTemp?: number }, delta: number) {
    const actual = conf.cantidadTemp || 0;
    conf.cantidadTemp = Math.max(0, actual + delta);
  }

  agregarCigarrosSueltos(conf: ConfigCigarro & { cantidadTemp?: number }) {
    if (!conf.cantidadTemp || conf.cantidadTemp <= 0) return;
    const subtotal = conf.cantidadTemp * conf.precioUnidad;
    
    // Buscamos el producto base en el inventario
    const prodBase = this.inventarioService.productos.find(p => p.id === conf.productoId);
    
    // Creamos un producto virtual para el carrito
    const productoCig: any = {
      id: `suelto_${conf.productoId}_${Date.now()}`,
      nombre: `${conf.nombreProducto} (${conf.cantidadTemp} sueltos)`,
      precio: subtotal,
      imagen: prodBase?.imagen || '',
      categoria: 'Cigarrería',
      stock: null,
      codigoBarras: ''
    };
    
    this.carrito.push({ producto: productoCig, cantidad: 1 });
    conf.cantidadTemp = 0;
    this.calcularTotal();
    
    // Acumular en totalCigarros del turno
    if (this.turnoActual) {
      this.turnoActual.totalCigarros = (this.turnoActual.totalCigarros || 0) + subtotal;
    }
  }

  // ========== MODAL COBRO ==========
  abrirModalCobro() {
    if (this.carrito.length === 0) return;
    this.metodoPago = 'efectivo'; 
    this.montoRecibido = null;
    this.fotoTransferencia = '';
    this.modalCobroAbierto = true;
  }

  cerrarModalCobro() {
    this.modalCobroAbierto = false;
  }

  setMontoRapido(monto: number) {
    this.montoRecibido = monto;
  }

  get vuelto(): number {
    const pagado = this.montoRecibido || 0;
    return Math.max(0, pagado - this.total);
  }

  async ejecutarVenta() {
    if (this.metodoPago === 'efectivo' && (this.montoRecibido || 0) < this.total) {
      const toast = await this.toastController.create({
        message: 'El monto ingresado es menor al total.',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    if (this.metodoPago === 'transferencia' && !this.fotoTransferencia) {
      const toast = await this.toastController.create({
        message: 'Debes fotografiar el comprobante de transferencia.',
        duration: 2500,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Procesando venta...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      let urlComprobanteFinal = '';
      
      if (this.metodoPago === 'transferencia' && this.fotoTransferencia) {
        urlComprobanteFinal = await this.inventarioService.subirImagen(
          this.fotoTransferencia, 
          `comprobante_${new Date().getTime()}`
        );
      }

      const pagoFinal = this.metodoPago === 'efectivo' ? (this.montoRecibido || this.total) : this.total;
      const vueltoFinal = this.metodoPago === 'efectivo' ? this.vuelto : 0;

      await this.inventarioService.procesarDescuentoStock(this.carrito);

      const nuevaVenta = {
        fecha: new Date().toISOString(),
        items: this.carrito.map(item => ({ 
          nombre: item.producto.nombre, 
          cantidad: item.cantidad, 
          precio: item.producto.precio,
          subtotal: item.producto.precio * item.cantidad
        })),
        total: this.total,
        metodoPago: this.metodoPago,
        pagoCon: pagoFinal,
        vuelto: vueltoFinal,
        comprobante: urlComprobanteFinal
      };

      this.turnoActual.ventas.push(nuevaVenta);
      this.turnoActual.totalGeneral += this.total;
      
      if (this.metodoPago === 'efectivo') {
        this.turnoActual.totalEfectivo += this.total;
      } else if (this.metodoPago === 'tarjeta') {
        this.turnoActual.totalTarjeta += this.total;
      } else if (this.metodoPago === 'transferencia') {
        this.turnoActual.totalTransferencia = (this.turnoActual.totalTransferencia || 0) + this.total;
      }

      localStorage.setItem('turno_minimarket', JSON.stringify(this.turnoActual));
      
      if (this.metodoPago === 'transferencia' && this.fotoTransferencia) {
        const base64Data = this.fotoTransferencia.split(',')[1];
        const fileName = `comprobante_${new Date().getTime()}.jpeg`;
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });

        const detalleProductos = this.carrito.map(item => {
          const subtotal = item.producto.precio * item.cantidad; 
          return `▪ ${item.cantidad} ${item.producto.nombre}: $${subtotal}`;
        }).join('\n');

        await Share.share({
          title: 'Comprobante de Pago',
          text: `✅ Pago por Transferencia Confirmado\nTotal: $${this.total}\n\nDetalle:\n${detalleProductos}\n\n¡Gracias por su compra!`,
          url: savedFile.uri,
          dialogTitle: 'Enviar Comprobante'
        });
      }

      this.carrito = [];
      this.calcularTotal();
      this.fotoTransferencia = '';
      this.montoRecibido = null;
      this.metodoPago = 'efectivo';
      
      this.cerrarModalCobro();
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: '¡Venta completada con éxito! 🎉',
        duration: 3000,
        color: 'success',
        icon: 'checkmark-circle-outline'
      });
      await toast.present();

    } catch (error) {
      await loading.dismiss();
      console.error('Error procesando venta:', error);
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

  // ========== CALCULADORA DE PESO ==========
  abrirCalculadora(producto: any) {
    this.productoPesable = producto;
    this.inputCalculo = '';
    this.modoCalculadora = 'peso'; 
    this.mostrarCalculadora = true;
  }

  cerrarCalculadora() {
    this.mostrarCalculadora = false;
    this.productoPesable = null;
    this.textoBusqueda = '';
    this.productosFiltrados = [];
  }

  teclar(valor: string) {
    if (valor === '.' && this.inputCalculo.includes('.')) return;
    if (valor === '.' && this.inputCalculo === '') {
      this.inputCalculo = '0.';
      return;
    }
    if (this.inputCalculo.length > 8) return;
    this.inputCalculo += valor;
  }

  borrarCaracter() { this.inputCalculo = this.inputCalculo.slice(0, -1); }
  calcularMontoDesdePeso(): number { return (parseFloat(this.inputCalculo) || 0) * (this.productoPesable?.precio || 0); }
  calcularPesoDesdeMonto(): number { return (parseFloat(this.inputCalculo) || 0) / (this.productoPesable?.precio || 1); }

  confirmarCalculo() {
    if (!this.inputCalculo || parseFloat(this.inputCalculo) <= 0) return;
    let cantidadFinal = this.modoCalculadora === 'peso' 
      ? parseFloat(this.inputCalculo) 
      : this.calcularPesoDesdeMonto();
    this.ngZone.run(() => {
      this.agregarAlCarritoConFraccion(this.productoPesable, cantidadFinal);
      this.cerrarCalculadora();
    });
  }

  agregarAlCarritoConFraccion(producto: any, cantidadPesada: number) {
    const index = this.carrito.findIndex(item => item.producto.id === producto.id);
    if (index !== -1) {
      this.carrito[index].cantidad += cantidadPesada;
    } else {
      this.carrito.push({ producto: producto, cantidad: cantidadPesada });
    }
    this.calcularTotal(); 
  }

  async tomarFotoComprobante() {
    try {
      const foto = await Camera.getPhoto({
        quality: 60,
        width: 800,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear
      });
      this.ngZone.run(() => {
        this.fotoTransferencia = foto.dataUrl || '';
      });
    } catch (error) {
      console.error('Error al tomar foto', error);
    }
  }
}