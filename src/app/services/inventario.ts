import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Producto {
  id: string;
  codigoBarras: string;
  nombre: string;
  marca?: string;
  categoria: string;
  medida: string;
  stock: number | null;
  precio: number;
  distribuidor?: string;
  imagen: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  // Lista que usaremos en la app
  public productos: Producto[] = [];

  constructor(private firestore: Firestore) {
    this.obtenerProductos();
  }

  // LEER: Se conecta a la nube y se queda escuchando cambios
  obtenerProductos() {
    const productosRef = collection(this.firestore, 'productos');
    collectionData(productosRef, { idField: 'id' }).subscribe((res: any) => {
      this.productos = res;
    });
  }

  // GUARDAR: Envía el producto a Google
  async agregarProducto(producto: Producto) {
    const productosRef = collection(this.firestore, 'productos');
    return addDoc(productosRef, producto);
  }

  // EDITAR: Actualiza en la nube
  async actualizarProducto(id: string, nuevoPrecio: number, nuevoDist: string) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    return updateDoc(productoDocRef, { 
      precio: nuevoPrecio, 
      distribuidor: nuevoDist 
    });
  }

  // ELIMINAR: Borra de la nube
  async eliminarProducto(id: string) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    return deleteDoc(productoDocRef);
  }
}