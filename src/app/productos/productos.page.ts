import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';

export interface Producto {
  id: string;
  nombre: string;
  marca: string;
  medida: string;
  stock: number;
  precio: number;
  imagen: string;
}

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonicModule]
})
export class ProductosPage implements OnInit {

  productos: Producto[] = [
    {
      id: '1',
      nombre: 'Aceite de Girasol',
      marca: 'acuenta',
      medida: '1L',
      stock: 15,
      precio: 1900,
      imagen: 'assets/img/producto1.jpg'
    },
    {
      id: '2',
      nombre: 'Arroz',
      marca: 'tucapel',
      medida: '1kg',
      stock: 7,
      precio: 1200,
      imagen: 'assets/img/producto2.jpg'
    }
  ];

  productosFiltrados: Producto[] = [];

  constructor() { }

  ngOnInit() {
    // Al iniciar, mostramos todos los productos
    this.productosFiltrados = [...this.productos];
  }

  buscarProducto(event: any) {
    const textoBusqueda = event.target.value.toLowerCase();

    // Si el texto está vacío, mostramos todo
    if (textoBusqueda.trim() === '') {
      this.productosFiltrados = [...this.productos];
      return;
    }

    // Filtramos por nombre
    this.productosFiltrados = this.productos.filter(producto => {
      return producto.nombre.toLowerCase().includes(textoBusqueda);
    });
  }
}


