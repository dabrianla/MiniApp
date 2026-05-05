import { Injectable } from '@angular/core';

export interface Producto {
  id: string;
  codigoBarras: string;
  nombre: string;
  marca?: string;
  medida: string;
  stock: number | null; // Puede ser null porque no es obligatorio
  precio: number;
  distribuidor?: string;
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

  // ELIMINAR
  eliminarProducto(id: string) {
    this.productos = this.productos.filter(p => p.id !== id);
    this.guardarAlmacenamiento();
  }

  // ACTUALIZAR (Solo precio y distribuidor)
  actualizarProducto(id: string, nuevoPrecio: number, nuevoDistribuidor: string) {
    const index = this.productos.findIndex(p => p.id === id);
    if (index !== -1) {
      this.productos[index].precio = nuevoPrecio;
      this.productos[index].distribuidor = nuevoDistribuidor;
      this.guardarAlmacenamiento();
    }
  }
  
}