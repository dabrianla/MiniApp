import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Storage, ref, uploadString, getDownloadURL, deleteObject } from '@angular/fire/storage';

export interface Lote {
  idUnico: string;
  cantidad: number;
  fechaVencimiento: any;
  fechaIngreso: string;
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
  fechaVencimiento?: any;
  stockMinimo?: number | null;
  lotes?: Lote[];
}

export interface EventoHistorial {
  id?: string;
  tipo: 'precio' | 'stock' | 'vencimiento' | 'oferta' | 'oferta-fin' | 'sistema' | 'nuevo' | 'eliminado';
  mensaje: string;
  fecha: string;
  productoId?: string;
}

export interface ConfigNotificaciones {
  limiteMensajes: number;
  colores: Record<string, { fondo: string, borde: string }>;
}

export interface ItemVenta {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  fecha: string;
  items: any[];
  total: number;
  metodoPago: string;
  pagoCon: number;
  vuelto: number;
}

export interface Turno {
  id?: string;
  cajero: string;
  fondoCaja: number; // 🟢 NUEVO: El dinero con el que inicia el turno
  fechaInicio: string;
  fechaFin?: string;
  ventas: Venta[];
  totalEfectivo: number;
  totalTarjeta: number;
  totalGeneral: number;
}

export const COLORES_POR_DEFECTO = {
  'vencimiento': { fondo: '#ffebee', borde: '#f44336' },
  'oferta': { fondo: '#fff8e1', borde: '#ffc107' },
  'oferta-fin': { fondo: '#fff3e0', borde: '#ff9800' },
  'stock': { fondo: '#f3e5f5', borde: '#9c27b0' },
  'precio': { fondo: '#e3f2fd', borde: '#2196f3' },
  'nuevo': { fondo: '#e8f5e9', borde: '#4caf50' },
  'eliminado': { fondo: '#f5f5f5', borde: '#9e9e9e' },
  'sistema': { fondo: '#eeeeee', borde: '#757575' }
};

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  public productos: Producto[] = [];

  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  private novedadesNoLeidasSubject = new BehaviorSubject<boolean>(false);
  public novedadesNoLeidas$ = this.novedadesNoLeidasSubject.asObservable();

  private historialSubject = new BehaviorSubject<EventoHistorial[]>([]);
  public historial$ = this.historialSubject.asObservable();

  public configNotificacionesSubject = new BehaviorSubject<ConfigNotificaciones>({
    limiteMensajes: 100,
    colores: COLORES_POR_DEFECTO
  });
  public configNotificaciones$ = this.configNotificacionesSubject.asObservable();

  private turnosSubject = new BehaviorSubject<Turno[]>([]);
  public turnos$ = this.turnosSubject.asObservable();

  obtenerTurnos() {
    const turnosRef = collection(this.firestore, 'historial_turnos');
    collectionData(turnosRef, { idField: 'id' }).subscribe((res: any[]) => {
      res.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
      this.turnosSubject.next(res);
    });
  }

  constructor(private firestore: Firestore, private storage: Storage) {
    this.obtenerProductos();
    this.obtenerHistorial(); 
    this.obtenerTurnos();
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

  obtenerHistorial() {
    const historialRef = collection(this.firestore, 'historial_notificaciones');
    collectionData(historialRef, { idField: 'id' }).subscribe((res: any[]) => {
      res.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      this.historialSubject.next(res);

      if (res.length > 0) {
        const ultimaNotificacion = res[res.length - 1];
        const ultimaVista = localStorage.getItem('ultimaNotificacionVista');
        
        if (ultimaNotificacion.id !== ultimaVista) {
          this.novedadesNoLeidasSubject.next(true);
        }
      }

      if (this.productos.length > 0) {
        this.verificarVencimientosDiarios();
      }
    });
  }

  marcarHistorialComoVisto() {
    const historialActual = this.historialSubject.value;
    if (historialActual.length > 0) {
      const ultima = historialActual[historialActual.length - 1];
      if (ultima.id) {
        localStorage.setItem('ultimaNotificacionVista', ultima.id);
      }
      this.novedadesNoLeidasSubject.next(false); 
    }
  }

  async registrarEventoHistorial(evento: EventoHistorial) {
    const historialRef = collection(this.firestore, 'historial_notificaciones');
    await addDoc(historialRef, evento);

    const configActual = this.configNotificacionesSubject.value;
    const limite = configActual.limiteMensajes || 100;
    const historialActual = this.historialSubject.value;

    if (historialActual.length >= limite) {
      const cantidadABorrar = (historialActual.length - limite) + 1; 
      const documentosABorrar = historialActual.slice(0, cantidadABorrar);
      
      for (const docViejo of documentosABorrar) {
        if (docViejo.id) {
          await deleteDoc(doc(this.firestore, `historial_notificaciones/${docViejo.id}`));
        }
      }
    }
  }

  async agregarProducto(producto: any) {
    const productosRef = collection(this.firestore, 'productos');
    const docRef = await addDoc(productosRef, producto); 

    await this.registrarEventoHistorial({
      tipo: 'nuevo',
      mensaje: `Nuevo producto registrado en el inventario: "${producto.nombre}".`,
      fecha: new Date().toISOString(),
      productoId: docRef.id 
    });

    return docRef;
  }

  async actualizarProductoCompleto(id: string, datosActualizados: any) {
    const productoAntiguo = this.productos.find(p => p.id === id);
    
    if (productoAntiguo) {
      if (datosActualizados.precio !== undefined && productoAntiguo.precio !== datosActualizados.precio) {
        await this.registrarEventoHistorial({
          tipo: 'precio',
          mensaje: `Cambio de precio en "${productoAntiguo.nombre}": de $${productoAntiguo.precio} a $${datosActualizados.precio}.`,
          fecha: new Date().toISOString(),
          productoId: id
        });
      }

      if (!productoAntiguo.oferta && datosActualizados.oferta === true) {
        await this.registrarEventoHistorial({
          tipo: 'oferta',
          mensaje: `¡El producto "${productoAntiguo.nombre}" ha sido puesto en Oferta!`,
          fecha: new Date().toISOString(),
          productoId: id
        });
      }
      
      if (productoAntiguo.oferta === true && datosActualizados.oferta === false) {
        await this.registrarEventoHistorial({
          tipo: 'oferta-fin',
          mensaje: `La oferta para "${productoAntiguo.nombre}" ha finalizado.`,
          fecha: new Date().toISOString(),
          productoId: id
        });
      }

      if (
        datosActualizados.stock !== undefined && datosActualizados.stockMinimo !== undefined &&
        productoAntiguo.stock! > productoAntiguo.stockMinimo! && 
        datosActualizados.stock <= datosActualizados.stockMinimo
      ) {
        await this.registrarEventoHistorial({
          tipo: 'stock',
          mensaje: `Alerta de Stock: "${productoAntiguo.nombre}" bajó a ${datosActualizados.stock} unidades.`,
          fecha: new Date().toISOString(),
          productoId: id
        });
      }
    }

    const productoDocRef = doc(this.firestore, `productos/${id}`);
    const { id: _, ...datos } = datosActualizados; 
    return updateDoc(productoDocRef, datos);
  }

  async eliminarProducto(producto: any) {
    await this.registrarEventoHistorial({
      tipo: 'eliminado',
      mensaje: `El producto "${producto.nombre}" ha sido eliminado del sistema.`,
      fecha: new Date().toISOString()
    });

    if (producto.imagen && producto.imagen.includes('firebasestorage')) {
      try {
        const imagenRef = ref(this.storage, producto.imagen);
        await deleteObject(imagenRef);
      } catch (error) {}
    }
    const productoDocRef = doc(this.firestore, `productos/${producto.id}`);
    return deleteDoc(productoDocRef);
  }

  // 1. Solo descuenta stock en la BD (Optimizado)
  async procesarDescuentoStock(carrito: any[]) {
    try {
      for (const item of carrito) {
        if (item.producto.stock !== null) {
          let cantidadAVender = item.cantidad;
          const nuevoStockTotal = item.producto.stock - cantidadAVender;

          if (item.producto.stockMinimo !== null && item.producto.stockMinimo !== undefined && item.producto.stock > item.producto.stockMinimo && nuevoStockTotal <= item.producto.stockMinimo) {
            await this.registrarEventoHistorial({ tipo: 'stock', mensaje: `Stock bajo tras venta: Solo quedan ${nuevoStockTotal} unidades de "${item.producto.nombre}".`, fecha: new Date().toISOString(), productoId: item.producto.id });
          }

          let lotesActualizados = item.producto.lotes ? [...item.producto.lotes] : [];
          // ... (mantén aquí tu misma lógica de ordenar y restar lotes que ya tenías)
          for (let i = 0; i < lotesActualizados.length; i++) {
            if (cantidadAVender <= 0) break; 
            if (lotesActualizados[i].cantidad <= cantidadAVender) {
              cantidadAVender -= lotesActualizados[i].cantidad;
              lotesActualizados[i].cantidad = 0;
            } else {
              lotesActualizados[i].cantidad -= cantidadAVender;
              cantidadAVender = 0; 
            }
          }
          lotesActualizados = lotesActualizados.filter(lote => lote.cantidad > 0);
          
          const productoRef = doc(this.firestore, `productos/${item.producto.id}`);
          await updateDoc(productoRef, { stock: nuevoStockTotal, lotes: lotesActualizados });
        }
      }
      return true;
    } catch (error) { throw error; }
  }

  // 2. Guarda TODO el turno de una sola vez (Ahorra Firebase)
  async guardarTurnoCaja(turnoData: any) {
    const turnosRef = collection(this.firestore, 'historial_turnos');
    await addDoc(turnosRef, turnoData);
  }

  async registrarIngresoStock(producto: Producto, cantidadIngresa: number, fechaVenc: string = '') {
    const productoRef = doc(this.firestore, `productos/${producto.id}`);
    const nuevoLote: Lote = {
      idUnico: Date.now().toString(),
      cantidad: cantidadIngresa,
      fechaVencimiento: fechaVenc || 'Sin vencimiento',
      fechaIngreso: new Date().toISOString()
    };

    const stockActual = producto.stock || 0;
    const nuevoStockTotal = stockActual + cantidadIngresa;
    const lotesActuales = producto.lotes || [];
    lotesActuales.push(nuevoLote);

    const datosAActualizar: any = { stock: nuevoStockTotal, lotes: lotesActuales };
    if (fechaVenc && fechaVenc.trim() !== '') {
      datosAActualizar.fechaVencimiento = fechaVenc;
    }

    return updateDoc(productoRef, datosAActualizar);
  }

  async verificarVencimientosDiarios() {
    const historialActual = this.historialSubject.value;
    const hoyIso = new Date().toISOString().split('T')[0]; 

    for (const prod of this.productos) {
      // 🟢 AQUÍ ESTÁ LA SOLUCIÓN: Agregamos la condición de que el stock sea mayor a 0
      if (
        prod.stock !== null && 
        prod.stock !== undefined && 
        prod.stock > 0 && 
        prod.fechaVencimiento && 
        prod.fechaVencimiento !== 'Sin vencimiento'
      ) {
        const fechaVenc = new Date(prod.fechaVencimiento);
        const hoyDate = new Date();
        
        const diferenciaDias = Math.ceil((fechaVenc.getTime() - hoyDate.getTime()) / (1000 * 3600 * 24));

        if (diferenciaDias <= 7) {
          
          const yaAvisoHoy = historialActual.some(h => 
            h.tipo === 'vencimiento' && 
            h.productoId === prod.id && 
            h.fecha.startsWith(hoyIso)
          );

          if (!yaAvisoHoy) {
            let mensajeAlerta = `Atención: "${prod.nombre}" vence en ${diferenciaDias} días.`;
            if (diferenciaDias === 0) mensajeAlerta = `¡Urgente! "${prod.nombre}" vence HOY.`;
            if (diferenciaDias < 0) mensajeAlerta = `¡Urgente! "${prod.nombre}" se encuentra VENCIDO.`;

            await this.registrarEventoHistorial({
              tipo: 'vencimiento',
              mensaje: mensajeAlerta,
              fecha: new Date().toISOString(),
              productoId: prod.id
            });
          }
        }
      }
    } 
  }

  obtenerConfiguracionNotificaciones() {
    const configRef = doc(this.firestore, 'configuracion/notificaciones');
    collectionData(collection(this.firestore, 'configuracion'), { idField: 'id' }).subscribe((res: any[]) => {
      const configDB = res.find(c => c.id === 'notificaciones');
      if (configDB) {
        this.configNotificacionesSubject.next(configDB as ConfigNotificaciones);
      }
    });
  }

  async guardarConfiguracionNotificaciones(config: ConfigNotificaciones) {
    const configRef = doc(this.firestore, 'configuracion/notificaciones');
    return setDoc(configRef, config);
  }

}