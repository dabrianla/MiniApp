import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core'; // <-- Añadí OnInit aquí
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, barcodeOutline, createOutline, trashOutline } from 'ionicons/icons';
import { InventarioService, Producto } from '../services/inventario';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AuthService } from '../services/auth';

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
    IonButton, IonItemSliding, IonItemOptions, IonItemOption
  ]
})
export class ProductosPage implements OnInit { // <-- Agregué "implements OnInit"
  productosFiltrados: Producto[] = [];
  public authService = inject(AuthService);
  textoBusqueda: string = '';
  filtroMarca: string = 'Todas';
  filtroDistribuidor: string = 'Todos';
  filtroCategoria: string = 'Todas';
  categoriasUnicas: string[] = [];
  marcasUnicas: string[] = [];
  distribuidoresUnicos: string[] = [];

  escaneando: boolean = false;

  constructor(
    public inventarioService: InventarioService, 
    private cdr: ChangeDetectorRef, 
    private alertController: AlertController
  ) {
    addIcons({ add, barcodeOutline, createOutline, trashOutline });
  }

  // 🟢 NUEVO: Esto "escucha" a Firebase y actualiza la lista sola y rápido
  ngOnInit() {
    this.inventarioService.productos$.subscribe((productosNuevos) => {
      if (productosNuevos.length > 0) {
        this.cargarFiltrosYProductos();
      }
    });
  }

  ionViewWillEnter() {
    this.aplicarFiltros();
  }

  ionViewWillLeave() {
    if (this.escaneando) {
      this.detenerEscaneo();
    }
  }

  // 🟢 LA FUNCIÓN QUE SE HABÍA BORRADO
  async abrirDetalle(producto: any) {
    const alert = await this.alertController.create({
      header: producto.nombre,
      subHeader: `Precio: $${producto.precio}`,
      message: `
        <strong>Stock:</strong> ${producto.stock || 0} <br><br>
        <strong>Código:</strong> ${producto.codigoBarras || 'N/A'} <br>
        <strong>Categoría:</strong> ${producto.categoria || 'Todas'} <br>
        <strong>Marca:</strong> ${producto.marca || 'N/A'} <br>
        <strong>Proveedor:</strong> ${producto.distribuidor || 'N/A'}
      `,
      buttons: ['Cerrar']
    });
    await alert.present();
  }

  cargarFiltrosYProductos() {
    const todos = this.inventarioService.productos;
    this.categoriasUnicas = [...new Set(todos.map(p => p.categoria).filter(c => c) as string[])];
    this.marcasUnicas = [...new Set(todos.map(p => p.marca).filter(m => m) as string[])];
    this.distribuidoresUnicos = [...new Set(todos.map(p => p.distribuidor).filter(d => d) as string[])];
    this.aplicarFiltros();
  }

  cambiarFiltroCategoria(event: any) {
    this.filtroCategoria = event.detail.value;
    this.aplicarFiltros();
  }

  buscarProducto(event: any) {
    this.textoBusqueda = event.target.value.toLowerCase();
    this.aplicarFiltros();
  }

  cambiarFiltroMarca(event: any) {
    this.filtroMarca = event.detail.value;
    this.aplicarFiltros();
  }

  cambiarFiltroDistribuidor(event: any) {
    this.filtroDistribuidor = event.detail.value;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let resultado = this.inventarioService.productos;

    if (this.filtroCategoria !== 'Todas') {
      resultado = resultado.filter(p => p.categoria === this.filtroCategoria);
    }
    if (this.filtroMarca !== 'Todas') {
      resultado = resultado.filter(p => p.marca === this.filtroMarca);
    }
    if (this.filtroDistribuidor !== 'Todos') {
      resultado = resultado.filter(p => p.distribuidor === this.filtroDistribuidor);
    }
    
    if (this.textoBusqueda && this.textoBusqueda.trim() !== '') {
      const termino = this.textoBusqueda.trim().toLowerCase(); 
      resultado = resultado.filter(producto => {
        const nombre = producto.nombre ? String(producto.nombre).toLowerCase() : '';
        const codigo = producto.codigoBarras ? String(producto.codigoBarras).toLowerCase() : '';
        return nombre.includes(termino) || codigo.includes(termino);
      });
    }

    this.productosFiltrados = resultado;
    this.cdr.detectChanges(); // Aseguramos que Angular refresque la vista
  }

  // --- LÓGICA DE LA CÁMARA ---
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
    } catch (error) {
      console.error('Error usando el escáner', error);
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

  async confirmarEliminacion(id: string) {
    const alert = await this.alertController.create({
      header: '¿Eliminar producto?',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.inventarioService.eliminarProducto(id);
          }
        }
      ]
    });
    await alert.present();
  }

  async abrirEditor(producto: Producto) {
    const alert = await this.alertController.create({
      header: 'Editar Producto',
      inputs: [
        {
          name: 'precio',
          type: 'number',
          placeholder: 'Precio actual: ' + producto.precio,
          value: producto.precio
        },
        {
          name: 'distribuidor',
          type: 'text',
          placeholder: 'Proveedor',
          value: producto.distribuidor
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            this.inventarioService.actualizarProducto(producto.id, data.precio, data.distribuidor);
          }
        }
      ]
    });
    await alert.present();
  }
}