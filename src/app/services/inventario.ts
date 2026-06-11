import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Storage, ref, uploadString, getDownloadURL, deleteObject } from '@angular/fire/storage';

// 🟢 1. NUEVA INTERFAZ PARA LOS LOTES
export interface Lote {
  idUnico: string;        // Un ID generado para diferenciar cada caja/tanda
  cantidad: number;       // Cuántos llegaron en esta tanda
  fechaVencimiento: any;  // Cuándo vence esta tanda
  fechaIngreso: string;   // Cuándo se registró en el sistema
}

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
  fechaVencimiento?: any; // Mantenemos esta por compatibilidad visual
  stockMinimo?: number | null;
  lotes?: Lote[];         // 🟢 2. AGREGAMOS EL ARREGLO DE LOTES AL PRODUCTO
}

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  public productos: Producto[] = [];

  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  constructor(private firestore: Firestore, private storage: Storage) {
    this.obtenerProductos();
  }

  async subirImagen(base64String: string, nombreArchivo: string): Promise<string> {
    try {
      const storageRef = ref(this.storage, `productos/${nombreArchivo}_${Date.now()}`);
      await uploadString(storageRef, base64String, 'data_url');
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw error;
    }
  }

  obtenerProductos() {
    const productosRef = collection(this.firestore, 'productos');
    collectionData(productosRef, { idField: 'id' }).subscribe((res: any) => {
      this.productos = res;
      this.productosSubject.next(res);
    });
  }

  async agregarProducto(producto: any) {
    const productosRef = collection(this.firestore, 'productos');
    return addDoc(productosRef, producto);
  }

  async actualizarProducto(id: string, nuevoPrecio: number, nuevoDist: string) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    return updateDoc(productoDocRef, { 
      precio: nuevoPrecio, 
      distribuidor: nuevoDist 
    });
  }

  async eliminarProducto(producto: any) {
    if (producto.imagen && producto.imagen.includes('firebasestorage')) {
      try {
        const imagenRef = ref(this.storage, producto.imagen);
        await deleteObject(imagenRef);
      } catch (error) {}
    }
    const productoDocRef = doc(this.firestore, `productos/${producto.id}`);
    return deleteDoc(productoDocRef);
  }

  async actualizarProductoCompleto(id: string, datosActualizados: any) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    const { id: _, ...datos } = datosActualizados; 
    return updateDoc(productoDocRef, datos);
  }

  async procesarVenta(carrito: any[], totalCobrado: number) {
    try {
      for (const item of carrito) {
        if (item.producto.stock !== null) {
          // 1. Restamos el stock total general
          let cantidadAVender = item.cantidad;
          const nuevoStock = item.producto.stock - cantidadAVender;

          // 2. Lógica FIFO: Descontar de los lotes más próximos a vencer
          let lotesActualizados = item.producto.lotes ? [...item.producto.lotes] : [];
          
          // Ordenamos los lotes: los que vencen primero van al inicio. 
          // Los 'Sin vencimiento' se van al final de la fila.
          lotesActualizados.sort((a, b) => {
            if (a.fechaVencimiento === 'Sin vencimiento' && b.fechaVencimiento !== 'Sin vencimiento') return 1;
            if (b.fechaVencimiento === 'Sin vencimiento' && a.fechaVencimiento !== 'Sin vencimiento') return -1;
            if (a.fechaVencimiento === 'Sin vencimiento' && b.fechaVencimiento === 'Sin vencimiento') return 0;
            return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
          });

          // 3. Recorremos los lotes restando la cantidad vendida
          for (let i = 0; i < lotesActualizados.length; i++) {
            if (cantidadAVender <= 0) break; // Si ya cubrimos la venta, paramos

            if (lotesActualizados[i].cantidad <= cantidadAVender) {
              // Si el lote tiene menos o igual a lo que necesitamos, nos lo acabamos todo
              cantidadAVender -= lotesActualizados[i].cantidad;
              lotesActualizados[i].cantidad = 0;
            } else {
              // Si el lote tiene más de lo que necesitamos, solo le restamos la venta
              lotesActualizados[i].cantidad -= cantidadAVender;
              cantidadAVender = 0;
            }
          }

          // 4. Limpiamos la basura: Borramos los lotes que quedaron vacíos (cantidad 0)
          lotesActualizados = lotesActualizados.filter(lote => lote.cantidad > 0);

          // 5. Detectamos cuál es la nueva fecha global de vencimiento tras borrar los lotes viejos
          let nuevaFechaVencimientoGlobal = 'Sin vencimiento';
          if (lotesActualizados.length > 0) {
            const loteProximo = lotesActualizados.find(l => l.fechaVencimiento !== 'Sin vencimiento');
            if (loteProximo) {
              nuevaFechaVencimientoGlobal = loteProximo.fechaVencimiento;
            }
          }

          // 6. Guardamos en Firebase la actualización limpia
          const productoRef = doc(this.firestore, `productos/${item.producto.id}`);
          await updateDoc(productoRef, { 
            stock: nuevoStock,
            lotes: lotesActualizados,
            fechaVencimiento: nuevaFechaVencimientoGlobal
          });
        }
      }

      // Guardamos el registro de la venta
      const ventasRef = collection(this.firestore, 'ventas');
      const nuevaVenta = {
        fecha: new Date().toISOString(),
        items: carrito.map(item => ({
          nombre: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.producto.precio,
          subtotal: item.producto.precio * item.cantidad
        })),
        total: totalCobrado
      };
      await addDoc(ventasRef, nuevaVenta);

      return true;
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      throw error;
    }
  }

  // 🟢 3. LA NUEVA FUNCIÓN PARA INGRESAR LOTES Y SUMAR STOCK
  // 🟢 LA FUNCIÓN MEJORADA: Ahora la fecha es opcional
  async registrarIngresoStock(producto: Producto, cantidadIngresa: number, fechaVenc: string = '') {
    const productoRef = doc(this.firestore, `productos/${producto.id}`);
    
    const nuevoLote: Lote = {
      idUnico: Date.now().toString(),
      cantidad: cantidadIngresa,
      fechaVencimiento: fechaVenc || 'Sin vencimiento', // 👈 Si viene vacío, guarda esto
      fechaIngreso: new Date().toISOString()
    };

    const stockActual = producto.stock || 0;
    const nuevoStockTotal = stockActual + cantidadIngresa;

    const lotesActuales = producto.lotes || [];
    lotesActuales.push(nuevoLote);

    const datosAActualizar: any = {
      stock: nuevoStockTotal,
      lotes: lotesActuales
    };

    // 👈 Solo actualizamos la fecha global del producto si se ingresó una fecha nueva
    if (fechaVenc && fechaVenc.trim() !== '') {
      datosAActualizar.fechaVencimiento = fechaVenc;
    }

    return updateDoc(productoRef, datosAActualizar);
  }
}