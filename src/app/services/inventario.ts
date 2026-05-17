import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs'; // <-- ESTO ES VITAL PARA LA ACTUALIZACIÓN AUTOMÁTICA
import { Storage, ref, uploadString, getDownloadURL, deleteObject } from '@angular/fire/storage';

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
  oferta?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  public productos: Producto[] = [];

  // 🟢 AQUÍ ESTÁ LA VARIABLE QUE FALTABA: El "canal de noticias"
  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  constructor(private firestore: Firestore, private storage: Storage) {
    this.obtenerProductos();
  }

  async subirImagen(base64String: string, nombreArchivo: string): Promise<string> {
    try {
      // Creamos una referencia en la carpeta 'productos'
      const storageRef = ref(this.storage, `productos/${nombreArchivo}_${Date.now()}`);
      
      // Subimos la imagen en formato DataURL
      await uploadString(storageRef, base64String, 'data_url');
      
      // Obtenemos la URL pública para guardarla en la base de datos
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw error;
    }
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
  async agregarProducto(producto: any) {
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
  async eliminarProducto(producto: any) {
    // Primero: Intentamos borrar la foto de la nube
    if (producto.imagen && producto.imagen.includes('firebasestorage')) {
      try {
        const imagenRef = ref(this.storage, producto.imagen);
        await deleteObject(imagenRef);
      } catch (error) {
        console.error("Error limpiando la foto:", error);
      }
    }

    // Segundo: Borramos el documento de la base de datos
    const productoDocRef = doc(this.firestore, `productos/${producto.id}`);
    return deleteDoc(productoDocRef);
  }

  async actualizarProductoCompleto(id: string, datosActualizados: any) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    // Separamos el 'id' del resto de los datos para no enviarlo doble
    const { id: _, ...datos } = datosActualizados; 
    return updateDoc(productoDocRef, datos);
  }

}