import { Component, NgZone, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, IonFooter,
  IonSearchbar, AlertController, LoadingController, ToastController, 
  IonThumbnail, IonMenuButton, IonModal, IonSegment, IonSegmentButton, IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barcodeOutline, trashOutline, addCircleOutline, removeCircleOutline, cartOutline, checkmarkCircleOutline, searchOutline, closeCircleOutline, backspaceOutline, scaleOutline, cashOutline, cardOutline, walletOutline, phonePortraitOutline,homeOutline, cameraOutline } from 'ionicons/icons'; 
// 🟢 1. AGREGAMOS EL "SupportedFormat"
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';
import { InventarioService, Producto } from '../services/inventario';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Router } from '@angular/router';

@Component({
  selector: 'app-punto-venta',
  templateUrl: './punto-venta.page.html',
  styleUrls: ['./punto-venta.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonBackButton, IonButton, IonIcon, IonList, IonItem, IonLabel, 
    IonNote, IonFooter, IonSearchbar, IonThumbnail, IonMenuButton, IonModal, IonSegment, IonSegmentButton, IonInput
  ]
})
export class PuntoVentaPage implements OnInit {
  carrito: { producto: Producto, cantidad: number }[] = [];
  escaneando: boolean = false;
  total: number = 0;
  textoBusqueda: string = '';

  // 🟢 VARIABLES DEL POPUP DE INSTAGRAM
  productoPreview: Producto | null = null;
  previewActivo: boolean = false;
  private pressTimeout: any;
  private fuePresionLarga: boolean = false;

  // 🟢 VARIABLES DEL BUSCADOR
  terminoBusqueda: string = '';
  productosFiltrados: Producto[] = [];

  // 🟢 VARIABLES DEL MODAL DE COBRO Y VUELTO (CORREGIDAS PARA EL HTML)
  modalCobroAbierto: boolean = false;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo'; // Se agregó 'transferencia'
  montoRecibido: number | null = null; // Cambiado de montoPagado a montoRecibido

  // 🟢 VARIABLES DE CONTROL DE CAJA
  cajaAbierta: boolean = false;
  nombreCajero: string = '';
  fondoDeCaja: number | null = null;
  turnoActual: any = null;

  // foto de transferencia
  fotoTransferencia: string = '';

  private inventarioService = inject(InventarioService);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private ngZone = inject(NgZone);
  private router = inject(Router);

  constructor() {
    addIcons({ barcodeOutline, trashOutline, addCircleOutline, removeCircleOutline, cartOutline, checkmarkCircleOutline, searchOutline, closeCircleOutline, backspaceOutline, scaleOutline, cashOutline, cardOutline, walletOutline, phonePortraitOutline, homeOutline, cameraOutline });
  }

  ngOnInit() {
    const turnoGuardado = localStorage.getItem('turno_minimarket');
    if (turnoGuardado) {
      this.turnoActual = JSON.parse(turnoGuardado);
      this.cajaAbierta = true;
      this.nombreCajero = this.turnoActual.cajero;
    }
  }

  volverAlMenu() {
    // Te redirige a la ruta principal. Si tu inicio es '/home', cámbialo aquí.
    this.router.navigate(['/']); 
  }

  abrirCaja() {
    if (this.nombreCajero.trim() === '' || this.fondoDeCaja === null || this.fondoDeCaja < 0) {
      return; 
    }

    this.turnoActual = {
      cajero: this.nombreCajero,
      fondoCaja: this.fondoDeCaja, 
      fechaInicio: new Date().toISOString(),
      ventas: [],
      totalEfectivo: 0,
      totalTarjeta: 0,
      totalGeneral: 0
    };

    localStorage.setItem('turno_minimarket', JSON.stringify(this.turnoActual));
    this.cajaAbierta = true;
  }

 async confirmarCierreCaja() {
    const efectivoEsperado = this.turnoActual.fondoCaja + this.turnoActual.totalEfectivo;

    const alert = await this.alertController.create({
      header: 'Cerrar Turno',
      message: `Cajero: <b>${this.nombreCajero}</b><br><br>
                Fondo inicial: $${this.turnoActual.fondoCaja}<br>
                Ventas en efectivo: $${this.turnoActual.totalEfectivo}<br>
                <hr>
                Deberías tener en tu estuche:<br>
                <h2 style="color: #2dd36f; text-align: center; margin: 5px 0;">$${efectivoEsperado}</h2>`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Sí, Cerrar', 
          handler: () => { this.ngZone.run(() => { this.ejecutarCierre(); }); } 
        }
      ]
    });
    await alert.present();
  }

  async ejecutarCierre() {
    const loading = await this.loadingController.create({ message: 'Subiendo resumen del turno...', spinner: 'circles' });
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

  buscarProducto(event: any) {
    const termino = event.target.value?.toLowerCase() || '';
    if (!termino) {
      this.productosFiltrados = [];
      return;
    }
    this.productosFiltrados = this.inventarioService.productos
      .filter(p => p.nombre.toLowerCase().includes(termino))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)); 
  }

  agregarDesdeBuscador(producto: Producto, event?: Event) {
    if (this.fuePresionLarga) {
      setTimeout(() => this.fuePresionLarga = false, 50);
      return; 
    }
    this.procesarIngresoAlCarrito(producto);
    this.terminoBusqueda = '';
    this.textoBusqueda = '';
    this.productosFiltrados = [];
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  @HostListener('window:touchcancel')
  liberarPantalla() {
    this.terminarPresion();
  }

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

  // 🟢 2. ESCÁNER BLINDADO CONTRA REFLEJOS
// 🟢 2. ESCÁNER BLINDADO CONTRA REFLEJOS
  async escanearParaVender() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      
      // 🟢 AQUÍ ESTÁ EL CAMBIO: Usamos 'qrscanner' igual que en agregar-producto
      document.body.classList.add('qrscanner');
      this.escaneando = true;

      // Restringimos los formatos
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

        // VALIDACIÓN: Bloqueamos si leyó basura o reflejos
        if (codigoLeido.length < 8) {
          const toast = await this.toastController.create({
            message: '⚠️ Código borroso o reflejo. Intenta escanear de nuevo.',
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
    // 🟢 AQUÍ TAMBIÉN: Removemos 'qrscanner'
    document.body.classList.remove('qrscanner');
    this.escaneando = false;
  }

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
  
  abrirModalCobro() {
    if (this.carrito.length === 0) return;
    this.metodoPago = 'efectivo'; 
    this.montoRecibido = this.total; 
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
  // 1. VALIDACIONES
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
      message: 'Debes tomarle una foto al comprobante de transferencia.',
      duration: 2500,
      color: 'warning'
    });
    await toast.present();
    return;
  }

  // 2. INICIO DEL PROCESO
  const loading = await this.loadingController.create({
    message: 'Procesando venta y actualizando stock...',
    spinner: 'circles'
  });
  await loading.present();

  try {
    let urlComprobanteFinal = '';
    
    // 3. SUBIR FOTO A FIREBASE (Si es transferencia)
    if (this.metodoPago === 'transferencia' && this.fotoTransferencia) {
      // Usamos tu servicio para subir la imagen y obtener la URL para el historial
      urlComprobanteFinal = await this.inventarioService.subirImagen(
        this.fotoTransferencia, 
        `comprobante_${new Date().getTime()}`
      );
    }

    const pagoFinal = this.metodoPago === 'efectivo' ? (this.montoRecibido || this.total) : this.total;
    const vueltoFinal = this.metodoPago === 'efectivo' ? this.vuelto : 0;

    // Descontar stock en Firebase
    await this.inventarioService.procesarDescuentoStock(this.carrito);

    // 4. CREAR EL OBJETO DE LA VENTA
    const nuevaVenta = {
      fecha: new Date().toISOString(),
      items: this.carrito.map(item => ({ nombre: item.producto.nombre, cantidad: item.cantidad, precio: item.producto.precio })),
      total: this.total,
      metodoPago: this.metodoPago,
      pagoCon: pagoFinal,
      vuelto: vueltoFinal,
      comprobante: urlComprobanteFinal // Guardamos la URL de la foto en la base de datos
    };

    // 5. ACTUALIZAR LA CAJA LOGICA (Memoria del teléfono)
    this.turnoActual.ventas.push(nuevaVenta);
    this.turnoActual.totalGeneral += this.total;
    
    if (this.metodoPago === 'efectivo') {
      this.turnoActual.totalEfectivo += this.total;
    } else if (this.metodoPago === 'tarjeta') {
      this.turnoActual.totalTarjeta += this.total;
    } else if (this.metodoPago === 'transferencia') {
      // Inicializa totalTransferencia si no existía en turnos anteriores
      this.turnoActual.totalTransferencia = (this.turnoActual.totalTransferencia || 0) + this.total;
    }

    localStorage.setItem('turno_minimarket', JSON.stringify(this.turnoActual));
    
    // 6. LA MAGIA: COMPARTIR LA IMAGEN POR WHATSAPP (Solo transferencia)
    if (this.metodoPago === 'transferencia' && this.fotoTransferencia) {
      // Separamos la cabecera de la base64 para que el celular la entienda
      const base64Data = this.fotoTransferencia.split(',')[1];
      const fileName = `comprobante_${new Date().getTime()}.jpeg`;
      
      // Guardamos la foto temporalmente en la caché del celular
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // 🟢 ARMAMOS LA LISTA DETALLADA DEL CARRITO 🟢
      const detalleProductos = this.carrito.map(item => {
        const subtotal = item.producto.precio * item.cantidad; 
        return `▪ ${item.cantidad} ${item.producto.nombre}: $${subtotal}`;
      }).join('\n');

      const mensajeVenta = `✅ Pago por Transferencia Confirmado
Total: $${this.total}

Detalle de la compra:
${detalleProductos}

¡Gracias por su compra!`;

      // Abrimos el menú nativo para enviar la imagen real por WhatsApp
      await Share.share({
        title: 'Comprobante de Pago',
        text: mensajeVenta, // 🟢 AQUÍ MANDAMOS EL MENSAJE DETALLADO 🟢
        url: savedFile.uri, 
        dialogTitle: 'Enviar Comprobante'
      });
    }

    // 7. LIMPIEZA Y CIERRE FINAL
    this.carrito = []; 
    this.calcularTotal();
    this.fotoTransferencia = ''; // Limpiamos la cámara
    this.montoRecibido = null; // Limpiamos el input de efectivo
    this.metodoPago = 'efectivo'; // Volvemos a por defecto
    
    this.cerrarModalCobro(); // Ahora cerramos el modal, todo salió bien
    await loading.dismiss();

    const toast = await this.toastController.create({
      message: '¡Venta completada con éxito!',
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

  mostrarCalculadora: boolean = false;
  productoPesable: any = null;
  modoCalculadora: 'peso' | 'monto' = 'peso';
  inputCalculo: string = '';

  abrirCalculadora(producto: any) {
    this.productoPesable = producto;
    this.inputCalculo = '';
    this.modoCalculadora = 'peso'; 
    this.mostrarCalculadora = true;
  }

  cerrarCalculadora() {
    this.mostrarCalculadora = false;
    this.productoPesable = null;
  }

  teclear(valor: string) {
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
    let cantidadFinal = this.modoCalculadora === 'peso' ? parseFloat(this.inputCalculo) : this.calcularPesoDesdeMonto();
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
      resultType: CameraResultType.DataUrl, // La traemos en base64 para subirla a Firebase fácil
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