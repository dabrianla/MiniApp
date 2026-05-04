import { Injectable } from '@angular/core';

export interface Producto {
  id: string;
  codigoBarras: string;
  nombre: string;
  marca: string;
  medida: string;
  stock: number | null; // Puede ser null porque no es obligatorio
  precio: number;
  distribuidor: string;
  imagen: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  public productos: Producto[] = [];

  constructor() {
    this.cargarAlmacenamiento();
  }

  cargarAlmacenamiento() {
    const datosGuardados = localStorage.getItem('miInventario');
    if (datosGuardados) {
      this.productos = JSON.parse(datosGuardados); // Convertimos el texto de vuelta a Lista
    }
  }

  guardarAlmacenamiento() {
    localStorage.setItem('miInventario', JSON.stringify(this.productos));
  }

  // 3. AGREGAR PRODUCTO (Y guardar automáticamente)
  agregarProducto(producto: Producto) {
    this.productos.push(producto);
    this.guardarAlmacenamiento(); // <--- ¡La magia está aquí!
  }
  
}