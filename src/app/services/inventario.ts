import { Injectable } from '@angular/core';

export interface Producto {
  id: string;
  nombre: string;
  medida: string;
  stock: number | null; // Puede ser null porque no es obligatorio
  precio: number;
  imagen: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  public productos: Producto[] = [];

  constructor() {}

  agregarProducto(producto: Producto) {
    this.productos.push(producto);
  }
}