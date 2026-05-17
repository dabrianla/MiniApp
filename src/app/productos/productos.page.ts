import { Component, ChangeDetectorRef, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonMenuButton, IonSearchbar,
  IonList, IonItem, IonThumbnail, IonLabel,
  IonFab, IonFabButton, IonIcon,
  IonSelect, IonSelectOption,
  IonButton, AlertController,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonModal, IonCard, IonCardContent, IonInput,
  LoadingController, IonToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, barcodeOutline, createOutline, trashOutline, saveOutline, closeOutline, cameraOutline } from 'ionicons/icons';
import { InventarioService, Producto } from '../services/inventario';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AuthService } from '../services/auth';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera'; // <-- IMPORTANTE

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonMenuButton, IonSearchbar,
    IonList, IonItem, IonThumbnail, IonLabel,
    IonFab, IonFabButton, IonIcon,
    IonSelect, IonSelectOption,
    IonButton, IonItemSliding, IonItemOptions, IonItemOption,
    IonModal, IonCard, IonCardContent, IonInput, IonToggle
  ]
})
export class ProductosPage implements OnInit {
  productosFiltrados: Producto[] = [];
  public authService = inject(AuthService);
  private ngZone = inject(NgZone);
  private loadingController = inject(LoadingController);
  
  textoBusqueda: string = '';
  filtroMarca: string = 'Todas';
  filtroDistribuidor: string = 'Todos';
  filtroCategoria: string = 'Todas';
  categoriasUnicas: string[] = [];
  marcasUnicas: string[] = [];
  distribuidoresUnicos: string[] = [];

  escaneando: boolean = false;

  // --- VARIABLES PARA EL EDITOR ---
  modalAbierto: boolean = false;
  productoEditando: any = {};
  precioFormateado: string = '';

  // --- VARIABLES PARA EL DETALLE ---
  detalleModalAbierto: boolean = false;
  productoDetalle: any = {};

  constructor(
    public inventarioService: InventarioService, 
    private cdr: ChangeDetectorRef, 
    private alertController: AlertController
  ) {
    addIcons({ add, barcodeOutline, createOutline, trashOutline, saveOutline, closeOutline, cameraOutline });
  }

  ngOnInit() {
    this.inventarioService.productos$.subscribe(() => {
      this.cargarFiltrosYProductos();
    });
  }

  ionViewWillEnter() { this.aplicarFiltros(); }

  ionViewWillLeave() { if (this.escaneando) this.detenerEscaneo(); }

  // ==========================================
  // NUEVA LÓGICA DE FILTROS EN CASCADA
  // ==========================================

  cargarFiltrosYProductos() {
    const todos = this.inventarioService.productos;
    // Las categorías y distribuidores siempre se cargan completos
    this.categoriasUnicas = [...new Set(todos.map(p => p.categoria).filter(c => c) as string[])];
    this.distribuidoresUnicos = [...new Set(todos.map(p => p.distribuidor).filter(d => d) as string[])];
    
    // Las marcas ahora dependen de la categoría seleccionada
    this.actualizarMarcasDisponibles(); 
    this.aplicarFiltros();
  }

  // 1. Cuando cambias la categoría, actualizamos la lista de marcas
  cambiarFiltroCategoria(event: any) { 
    this.filtroCategoria = event.detail.value; 
    this.actualizarMarcasDisponibles(); // <--- Llamamos a la cascada
    this.aplicarFiltros(); 
  }

  // 2. La función que hace la magia de extraer solo las marcas correspondientes
  actualizarMarcasDisponibles() {
    let productosParaMarcas = this.inventarioService.productos;

    if (this.filtroCategoria !== 'Todas') {
      productosParaMarcas = productosParaMarcas.filter(p => p.categoria === this.filtroCategoria);
    }

    // Extraemos las marcas únicas de los productos ya filtrados
    this.marcasUnicas = [...new Set(productosParaMarcas.map(p => p.marca).filter(m => m) as string[])];

    // Si la marca que el usuario tenía seleccionada antes ya no existe en esta nueva categoría,
    // la devolvemos a "Todas" para que la lista no quede vacía por error.
    if (this.filtroMarca !== 'Todas' && !this.marcasUnicas.includes(this.filtroMarca)) {
      this.filtroMarca = 'Todas';
    }
  }

  cambiarFiltroMarca(event: any) { this.filtroMarca = event.detail.value; this.aplicarFiltros(); }
  cambiarFiltroDistribuidor(event: any) { this.filtroDistribuidor = event.detail.value; this.aplicarFiltros(); }
  buscarProducto(event: any) { this.textoBusqueda = event.target.value.toLowerCase(); this.aplicarFiltros(); }

  aplicarFiltros() {
    let resultado = this.inventarioService.productos;
    if (this.filtroCategoria !== 'Todas') resultado = resultado.filter(p => p.categoria === this.filtroCategoria);
    if (this.filtroMarca !== 'Todas') resultado = resultado.filter(p => p.marca === this.filtroMarca);
    if (this.filtroDistribuidor !== 'Todos') resultado = resultado.filter(p => p.distribuidor === this.filtroDistribuidor);
    if (this.textoBusqueda && this.textoBusqueda.trim() !== '') {
      const termino = this.textoBusqueda.trim().toLowerCase(); 
      resultado = resultado.filter(producto => {
        const nombre = producto.nombre ? String(producto.nombre).toLowerCase() : '';
        const codigo = producto.codigoBarras ? String(producto.codigoBarras).toLowerCase() : '';
        return nombre.includes(termino) || codigo.includes(termino);
      });
    }
    // NUEVO: Ordenar para que las ofertas queden de los primeros en la lista
    resultado.sort((a, b) => {
      if (a.oferta && !b.oferta) return -1; // a va primero
      if (!a.oferta && b.oferta) return 1;  // b va primero
      return 0; // se quedan igual
    });

    this.productosFiltrados = resultado;
    this.cdr.detectChanges(); 
  }

  // ==========================================
  // RESTO DEL CÓDIGO (Escáner, Edición, etc)
  // ==========================================

  async escanearParaBuscar() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.escaneando = true;
      const result = await BarcodeScanner.startScan(); 
      if (result.hasContent) {
        this.textoBusqueda = result.content.trim(); 
        this.aplicarFiltros();
      }
    } catch (error) { console.error('Error', error); } finally { this.detenerEscaneo(); }
  }

  detenerEscaneo() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
    this.escaneando = false; 
  }

  async confirmarEliminacion(producto: any) {
    const alert = await this.alertController.create({
      header: '¿Eliminar producto?',
      message: `Estás a punto de borrar <strong>${producto.nombre}</strong>.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => { this.inventarioService.eliminarProducto(producto); } }
      ]
    });
    await alert.present();
  }

  // --- LÓGICA DE DETALLE ---
  abrirDetalle(producto: any) {
    this.productoDetalle = { ...producto };
    this.detalleModalAbierto = true;
  }
  cerrarDetalle() { this.detalleModalAbierto = false; this.productoDetalle = {}; }

  // --- LÓGICA DEL EDITOR CON CAMBIO DE FOTO ---

  abrirEditor(producto: Producto) {
    this.productoEditando = { ...producto };
    if (this.productoEditando.oferta === undefined) {
      this.productoEditando.oferta = false;
    } 
    this.precioFormateado = this.formatearNumero(this.productoEditando.precio);
    this.modalAbierto = true;
  }

  cerrarEditor() {
    this.modalAbierto = false;
    this.productoEditando = {};
  }

  async tomarFotoEdicion() {
    try {
      const foto = await Camera.getPhoto({
        quality: 50,
        width: 800,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear
      });

      this.ngZone.run(() => {
        this.productoEditando.imagen = foto.dataUrl;
      });
    } catch (error) {
      console.error('Error al cambiar foto', error);
    }
  }

  async guardarEdicion() {
    if (!this.productoEditando.nombre || !this.productoEditando.precio) return;

    const loading = await this.loadingController.create({
      message: 'Actualizando producto...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      if (this.productoEditando.imagen && this.productoEditando.imagen.startsWith('data:')) {
        const nuevaUrl = await this.inventarioService.subirImagen(
          this.productoEditando.imagen,
          this.productoEditando.nombre.replace(/\s+/g, '_')
        );
        this.productoEditando.imagen = nuevaUrl;
      }

      await this.inventarioService.actualizarProductoCompleto(this.productoEditando.id, this.productoEditando);
      await loading.dismiss();
      this.cerrarEditor();
    } catch (error) {
      await loading.dismiss();
      console.error("Error al editar:", error);
    }
  }

  formatearNumero(valor: any): string {
    if (!valor) return '';
    const numeroStr = valor.toString().replace(/\D/g, '');
    return numeroStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  formatearPrecioEnVivo(event: any) {
    const valorInput = event.target.value;
    const soloNumeros = valorInput.replace(/\D/g, '');
    if (soloNumeros) {
      this.precioFormateado = this.formatearNumero(soloNumeros);
      this.productoEditando.precio = parseInt(soloNumeros, 10);
    } else {
      this.precioFormateado = '';
      this.productoEditando.precio = null;
    }
    event.target.value = this.precioFormateado;
  }
}