import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs'; // <-- ESTO ES VITAL PARA LA ACTUALIZACIÓN AUTOMÁTICA

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
  public productos: Producto[] = [];

  // 🟢 AQUÍ ESTÁ LA VARIABLE QUE FALTABA: El "canal de noticias"
  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  constructor(private firestore: Firestore) {
    this.obtenerProductos();
  }

  // LEER: Se conecta a la nube y avisa cuando hay datos
  obtenerProductos() {
    const productosRef = collection(this.firestore, 'productos');
    collectionData(productosRef, { idField: 'id' }).subscribe((res: any) => {
      this.productos = res;
      // 🟢 Avisamos a toda la app que llegaron los productos
      this.productosSubject.next(res);
    });
  }

  // GUARDAR
  async agregarProducto(producto: Producto) {
    const productosRef = collection(this.firestore, 'productos');
    return addDoc(productosRef, producto);
  }

  // EDITAR
  async actualizarProducto(id: string, nuevoPrecio: number, nuevoDist: string) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    return updateDoc(productoDocRef, { 
      precio: nuevoPrecio, 
      distribuidor: nuevoDist 
    });
  }

  // ELIMINAR
  async eliminarProducto(id: string) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    return deleteDoc(productoDocRef);
  }
}