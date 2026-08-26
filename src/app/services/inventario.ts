import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, setDoc, query, where, orderBy } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Storage, ref, uploadString, getDownloadURL, deleteObject } from '@angular/fire/storage';

export interface Lote {
  idUnico: string;
  cantidad: number;
  fechaVencimiento: any;
  fechaIngreso: string;
  // Nuevos campos para trazabilidad
  precioCosto?: number;
  numeroLote?: string;
  proveedor?: string;
  notas?: string;
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
  // Nuevas opciones de configuración
  diasAlertaVencimiento?: number;       // Cuántos días antes avisar (default: 7)
  alertasActivas?: Record<string, boolean>; // Toggle por tipo
  stockMinimoPorDefecto?: number;       // Para nuevos productos sin mínimo
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
  comprobante?: string;
}

export interface Turno {
  id?: string;
  cajero: string;
  fondoCaja: number;
  fechaInicio: string;
  fechaFin?: string;
  ventas: Venta[];
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia?: number; // Nuevo
  totalCigarros?: number;      // Nuevo — ventas de cigarros identificadas
  totalGeneral: number;
}

// Alerta creada por vendedores para productos sin stock digital (ej: verduras)
export interface AlertaVendedor {
  id?: string;
  mensaje: string;
  productoNombre: string;
  productoId?: string;
  creadoPor: string;    // nombre del vendedor
  fecha: string;
  resuelta: boolean;
  fechaResolucion?: string;
}

// Configuración de cigarros sueltos
export interface ConfigCigarro {
  productoId: string;
  nombreProducto: string;
  precioUnidad: number;   // Precio por cigarro suelto
  cigarrosPorCajetilla: number; // Cuántos cigarros tiene la cajetilla
  activo: boolean;
}

export interface ConfigCigarros {
  cigarros: ConfigCigarro[];
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

export const ALERTAS_ACTIVAS_POR_DEFECTO: Record<string, boolean> = {
  'vencimiento': true,
  'oferta': true,
  'oferta-fin': true,
  'stock': true,
  'precio': true,
  'nuevo': true,
  'eliminado': true,
  'sistema': true
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
    colores: COLORES_POR_DEFECTO,
    diasAlertaVencimiento: 7,
    alertasActivas: ALERTAS_ACTIVAS_POR_DEFECTO,
    stockMinimoPorDefecto: 5
  });
  public configNotificaciones$ = this.configNotificacionesSubject.asObservable();

  private turnosSubject = new BehaviorSubject<Turno[]>([]);
  public turnos$ = this.turnosSubject.asObservable();

  private alertasVendedorSubject = new BehaviorSubject<AlertaVendedor[]>([]);
  public alertasVendedor$ = this.alertasVendedorSubject.asObservable();

  private alertasNoLeidasSubject = new BehaviorSubject<number>(0);
  public alertasNoLeidas$ = this.alertasNoLeidasSubject.asObservable();

  obtenerTurnos() {
    const turnosRef = collection(this.firestore, 'historial_turnos');
    collectionData(turnosRef, { idField: 'id' }).subscribe((res: any[]) => {
      res.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
      this.turnosSubject.next(res);
    });
  }

  obtenerAlertasVendedor() {
    const alertasRef = collection(this.firestore, 'alertas_stock');
    collectionData(alertasRef, { idField: 'id' }).subscribe((res: any[]) => {
      res.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      this.alertasVendedorSubject.next(res as AlertaVendedor[]);
      const pendientes = res.filter(a => !a.resuelta).length;
      this.alertasNoLeidasSubject.next(pendientes);
    });
  }

  constructor(private firestore: Firestore, private storage: Storage) {
    this.obtenerProductos();
    this.obtenerHistorial(); 
    this.obtenerTurnos();
    this.obtenerAlertasVendedor();
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
    // Verificar si este tipo de alerta está activo
    const config = this.configNotificacionesSubject.value;
    const alertasActivas = config.alertasActivas || ALERTAS_ACTIVAS_POR_DEFECTO;
    if (alertasActivas[evento.tipo] === false) return; // Salir si está desactivado

    const historialRef = collection(this.firestore, 'historial_notificaciones');
    await addDoc(historialRef, evento);

    const limite = config.limiteMensajes || 100;
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

  async registrarAlertaVendedor(alerta: Omit<AlertaVendedor, 'id'>) {
    const alertasRef = collection(this.firestore, 'alertas_stock');
    return addDoc(alertasRef, alerta);
  }

  async resolverAlerta(id: string) {
    const alertaRef = doc(this.firestore, `alertas_stock/${id}`);
    return updateDoc(alertaRef, {
      resuelta: true,
      fechaResolucion: new Date().toISOString()
    });
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

  async guardarTurnoCaja(turnoData: any) {
    const turnosRef = collection(this.firestore, 'historial_turnos');
    await addDoc(turnosRef, turnoData);
  }

  async registrarIngresoStock(producto: Producto, cantidadIngresa: number, fechaVenc: string = '', extras?: { precioCosto?: number; numeroLote?: string; proveedor?: string; notas?: string; }) {
    const productoRef = doc(this.firestore, `productos/${producto.id}`);
    const nuevoLote: Lote = {
      idUnico: Date.now().toString(),
      cantidad: cantidadIngresa,
      fechaVencimiento: fechaVenc || 'Sin vencimiento',
      fechaIngreso: new Date().toISOString(),
      ...(extras || {})
    };

    const stockActual = producto.stock || 0;
    const nuevoStockTotal = stockActual + cantidadIngresa;
    const lotesActuales = producto.lotes || [];
    lotesActuales.push(nuevoLote);

    const datosAActualizar: any = { stock: nuevoStockTotal, lotes: lotesActuales };
    if (fechaVenc && fechaVenc.trim() !== '') {
      datosAActualizar.fechaVencimiento = fechaVenc;
    }

    await this.registrarEventoHistorial({
      tipo: 'stock',
      mensaje: `Ingreso de stock: +${cantidadIngresa} unidades de "${producto.nombre}". Stock total: ${nuevoStockTotal}.`,
      fecha: new Date().toISOString(),
      productoId: producto.id
    });

    return updateDoc(productoRef, datosAActualizar);
  }

  async verificarVencimientosDiarios() {
    const historialActual = this.historialSubject.value;
    const hoyIso = new Date().toISOString().split('T')[0]; 
    const config = this.configNotificacionesSubject.value;
    const diasAlerta = config.diasAlertaVencimiento ?? 7;

    for (const prod of this.productos) {
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

        if (diferenciaDias <= diasAlerta) {
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
    collectionData(collection(this.firestore, 'configuracion'), { idField: 'id' }).subscribe((res: any[]) => {
      const configDB = res.find(c => c.id === 'notificaciones');
      if (configDB) {
        // Merge con defaults para que nuevos campos siempre tengan valor
        const merged: ConfigNotificaciones = {
          limiteMensajes: 100,
          colores: COLORES_POR_DEFECTO,
          diasAlertaVencimiento: 7,
          alertasActivas: ALERTAS_ACTIVAS_POR_DEFECTO,
          stockMinimoPorDefecto: 5,
          ...configDB
        };
        this.configNotificacionesSubject.next(merged);
      }
    });
  }

  async guardarConfiguracionNotificaciones(config: ConfigNotificaciones) {
    const configRef = doc(this.firestore, 'configuracion/notificaciones');
    return setDoc(configRef, config);
  }

  // ===================== CONFIGURACIÓN CIGARROS =====================

  async obtenerConfigCigarros(): Promise<ConfigCigarros> {
    const configRef = collection(this.firestore, 'configuracion');
    return new Promise(resolve => {
      collectionData(configRef, { idField: 'id' }).subscribe((res: any[]) => {
        const configDB = res.find(c => c.id === 'cigarros');
        resolve(configDB ? (configDB as ConfigCigarros) : { cigarros: [] });
      });
    });
  }

  async guardarConfigCigarros(config: ConfigCigarros) {
    const configRef = doc(this.firestore, 'configuracion/cigarros');
    return setDoc(configRef, config);
  }

  // Detecta si un producto es un cigarro por palabras clave en el nombre
  esCigarro(producto: Producto): boolean {
    const keywords = ['cigarro', 'cigarrillo', 'cajetilla', 'tabaco', 'marlboro', 'kent', 'lucky strike', 'pall mall', 'winston', 'belmont', 'nevada', 'derby'];
    const nombreLower = (producto.nombre || '').toLowerCase();
    const marcaLower = (producto.marca || '').toLowerCase();
    const categoriaLower = (producto.categoria || '').toLowerCase();
    return categoriaLower === 'cigarrería' || 
           keywords.some(k => nombreLower.includes(k) || marcaLower.includes(k));
  }
}