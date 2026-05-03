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
export class ProductosPage implements OnInit {
  
  // Lista original de productos
  productos: Producto[] = [
    {
      id: '789123456',
      nombre: 'Aceite de Girasol',
      medida: '1 Litro',
      stock: 15,
      precio: 2500,
      imagen: 'https://ionicframework.com/docs/img/demos/thumbnail.svg'
    },
    {
      id: '789654321',
      nombre: 'Arroz Grano Largo',
      medida: '1 kg',
      stock: 8,
      precio: 1200,
      imagen: 'https://ionicframework.com/docs/img/demos/thumbnail.svg'
    },
    {
      id: '789987654',
      nombre: 'Bebida Cola',
      medida: '2.5 Litros',
      stock: 30,
      precio: 1800,
      imagen: 'https://ionicframework.com/docs/img/demos/thumbnail.svg'
    }
  ];

  productosFiltrados: Producto[] = [];

  constructor(public inventarioService: InventarioService) {
    addIcons({ add });
   }

  ngOnInit() {
    this.productosFiltrados = this.inventarioService.productos;
  }

  buscarProducto(event: any) {
    const textoBusqueda = event.target.value.toLowerCase();
    if (textoBusqueda.trim() === '') {
      this.productosFiltrados = [...this.productos];
      return;
    }
    this.productosFiltrados = this.productos.filter(producto => {
      return producto.nombre.toLowerCase().includes(textoBusqueda);
    });
  }
}