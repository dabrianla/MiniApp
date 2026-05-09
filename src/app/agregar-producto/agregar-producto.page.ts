import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonItem, IonInput, IonButton, IonLabel,IonIcon
} from '@ionic/angular/standalone';
import { InventarioService, Producto } from '../services/inventario';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonBackButton, IonItem, IonInput, IonButton, IonLabel,IonIcon
  ]
})
export class AgregarProductoPage {
  
  // Objeto temporal ligado al formulario
  nuevoProducto: any = {
    codigoBarras: '', // <-- Agregamos esto aquí para que Angular lo reconozca
    nombre: '',
    medida: '',
    precio: null,
    stock: null,
    imagen: 'https://ionicframework.com/docs/img/demos/thumbnail.svg' // imagen por defecto
  };

  escaneando: boolean = false;
  mensajeError: string = '';

  constructor(
    private inventarioService: InventarioService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone // <-- NgZone inyectado correctamente
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
      // 👇 AQUÍ ESTABA EL ERROR: Ahora usamos lo que escaneó o escribió el usuario (si está vacío, pone ceros)
      codigoBarras: this.nuevoProducto.codigoBarras || '0000000000000', 
      nombre: this.nuevoProducto.nombre,
      marca: this.nuevoProducto.marca || 'Marca Genérica', 
      medida: this.nuevoProducto.medida,
      precio: this.nuevoProducto.precio,
      stock: this.nuevoProducto.stock || 0, 
      imagen: this.nuevoProducto.imagen,
      distribuidor: this.nuevoProducto.distribuidor || 'Distribuidor Genérico' 
    };

    // Guardamos y volvemos a la lista
    this.inventarioService.agregarProducto(productoAguardar);
    this.router.navigate(['/productos']);
  }

  // Actualizar código manual
  actualizarCodigo(event: any) {
    this.nuevoProducto.codigoBarras = event.detail.value;
  }

  async escanearCodigo() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.escaneando = true;

      const result = await BarcodeScanner.startScan(); 

      if (result.hasContent) {
        // 👇 APLICAMOS NGZONE: Obligamos a Angular a atrapar el escaneo al instante
        this.ngZone.run(() => {
          this.nuevoProducto.codigoBarras = String(result.content).trim(); 
        });
      }
    } catch (error) {
      console.error('Error usando el escáner', error);
    } finally {
      this.detenerEscaneo();
    }
  }

  ionViewWillLeave() {
    // Si la cámara está encendida al momento de salir, la apagamos forzosamente
    if (this.escaneando) {
      this.detenerEscaneo();
    }
  }

  // NUEVA FUNCIÓN PARA CANCELAR/LIMPIAR EL ESCÁNER
  detenerEscaneo() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
    this.escaneando = false; 
  }

  // Función temporal para la imagen
  cargarImagen(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.nuevoProducto.imagen = URL.createObjectURL(file);
    }
  }

  async tomarFoto() {
    try {
      const foto = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera // Esto fuerza a que se abra la cámara directamente
      });

      if (foto.webPath) {
        // Usamos NgZone igual que con el escáner para que Angular actualice la imagen de inmediato
        this.ngZone.run(() => {
          this.nuevoProducto.imagen = foto.webPath;
        });
      }
    } catch (error) {
      console.error('Error al tomar la foto o foto cancelada', error);
    }
  }

}