import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonItem, IonInput, IonButton, IonNote 
} from '@ionic/angular/standalone';
import { InventarioService, Producto } from '../services/inventario.service';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonBackButton, IonItem, IonInput, IonButton, IonNote
  ]
})
export class AgregarProductoPage {
  
  // Objeto temporal ligado al formulario
  nuevoProducto: any = {
    nombre: '',
    medida: '',
    precio: null,
    stock: null,
    imagen: 'https://ionicframework.com/docs/img/demos/thumbnail.svg' // imagen por defecto
  };

  mensajeError: string = '';

  constructor(
    private inventarioService: InventarioService,
    private router: Router
  ) {}

  guardarProducto() {
    // Validaciones obligatorias
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.medida || !this.nuevoProducto.precio) {
      this.mensajeError = 'Nombre, gramaje/litro y precio son obligatorios.';
      return;
    }

    // Creamos el producto final
    const productoAguardar: Producto = {
      id: Date.now().toString(), // Generamos un ID único temporal
      nombre: this.nuevoProducto.nombre,
      medida: this.nuevoProducto.medida,
      precio: this.nuevoProducto.precio,
      stock: this.nuevoProducto.stock || 0, // Si no pone stock, asume 0
      imagen: this.nuevoProducto.imagen
    };

    // Guardamos y volvemos a la lista
    this.inventarioService.agregarProducto(productoAguardar);
    this.router.navigate(['/productos']);
  }

  // Función temporal para la imagen
  cargarImagen(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Por ahora solo guardamos el nombre del archivo como prueba
      this.nuevoProducto.imagen = URL.createObjectURL(file);
    }
  }
}