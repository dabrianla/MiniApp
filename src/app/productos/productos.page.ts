import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonMenuButton, IonSearchbar,
  IonList, IonItem, IonThumbnail, IonLabel,
  IonFab, IonFabButton, IonIcon,
  IonSelect, IonSelectOption,
  IonButton // <-- NUEVO: Importamos el botón
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, barcodeOutline } from 'ionicons/icons'; // <-- NUEVO: Ícono de código de barras
import { InventarioService, Producto } from '../services/inventario';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'; // <-- NUEVO: El escáner

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
    IonButton // <-- NUEVO: Lo agregamos aquí
  ]
})
export class ProductosPage {
  productosFiltrados: Producto[] = [];
  
  textoBusqueda: string = '';
  filtroMarca: string = 'Todas';
  filtroDistribuidor: string = 'Todos';

  marcasUnicas: string[] = [];
  distribuidoresUnicos: string[] = [];

  escaneando: boolean = false; // <-- NUEVO: Controla la cámara

  constructor(public inventarioService: InventarioService) {
    addIcons({ add, barcodeOutline }); // <-- Registramos el nuevo ícono
  }

  ionViewWillEnter() {
    this.cargarFiltrosYProductos();
  }

  // Si salimos de la página y la cámara está prendida, la apagamos
  ionViewWillLeave() {
    if (this.escaneando) {
      this.detenerEscaneo();
    }
  }

  cargarFiltrosYProductos() {
    const todos = this.inventarioService.productos;
    this.marcasUnicas = [...new Set(todos.map(p => p.marca).filter(m => m) as string[])];
    this.distribuidoresUnicos = [...new Set(todos.map(p => p.distribuidor).filter(d => d) as string[])];
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

    if (this.filtroMarca !== 'Todas') {
      resultado = resultado.filter(p => p.marca === this.filtroMarca);
    }
    if (this.filtroDistribuidor !== 'Todos') {
      resultado = resultado.filter(p => p.distribuidor === this.filtroDistribuidor);
    }
    if (this.textoBusqueda.trim() !== '') {
      resultado = resultado.filter(producto => {
        const nombre = producto.nombre.toLowerCase();
        const codigo = producto.codigoBarras ? producto.codigoBarras.toLowerCase() : '';
        return nombre.includes(this.textoBusqueda) || codigo.includes(this.textoBusqueda);
      });
    }

    this.productosFiltrados = resultado;
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
        // Ponemos el código escaneado en el buscador y filtramos al instante
        this.textoBusqueda = result.content; 
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
}