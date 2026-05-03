import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router'; // <-- AGREGAR ESTO
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonMenuButton, IonSearchbar,
  IonList, IonItem, IonThumbnail, IonLabel,
  IonFab, IonFabButton, IonIcon // <-- AGREGAR ESTOS TRES
} from '@ionic/angular/standalone';
import { InventarioService, Producto } from '../services/inventario';
import { add } from 'ionicons/icons'; // <-- AGREGAR ESTA IMPORTACIÓN ARRIBA
import { addIcons } from 'ionicons'; // <-- Y ESTA TAMBIÉN

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonMenuButton, IonSearchbar, 
    IonList, IonItem, IonThumbnail, IonLabel, IonFab, IonFabButton, IonIcon, RouterLink
  ]
})
export class ProductosPage {

  productosFiltrados: Producto[] = [];

  constructor(public inventarioService: InventarioService) {
    addIcons({ add });
   }

  ionViewWillEnter() {
    this.productosFiltrados = [...this.inventarioService.productos];
  }

  buscarProducto(event: any) {
    const textoBusqueda = event.target.value.toLowerCase();

    // Filtramos directamente desde la fuente de verdad (el servicio)
    if (textoBusqueda.trim() === '') {
      this.productosFiltrados = [...this.inventarioService.productos];
      return;
    }

    this.productosFiltrados = this.inventarioService.productos.filter(producto => {
      return producto.nombre.toLowerCase().includes(textoBusqueda);
    });
  }
}