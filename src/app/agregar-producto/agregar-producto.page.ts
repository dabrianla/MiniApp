import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonItem, IonInput, IonButton, IonLabel
} from '@ionic/angular/standalone';
import { InventarioService, Producto } from '../services/inventario';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonBackButton, IonItem, IonInput, IonButton, IonLabel
  ]
})
export class AgregarProductoPage {
  
  // Objeto temporal ligado al formulario
  nuevoProducto: any = {
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
    private cdr: ChangeDetectorRef
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
      codigoBarras: '0000000000000', // Código de barras genérico por ahora
      nombre: this.nuevoProducto.nombre,
      marca: this.nuevoProducto.marca || 'Marca Genérica', // Podríamos agregar un campo para esto en el futuro
      medida: this.nuevoProducto.medida,
      precio: this.nuevoProducto.precio,
      stock: this.nuevoProducto.stock || 0, // Si no pone stock, asume 0
      imagen: this.nuevoProducto.imagen,
      distribuidor: this.nuevoProducto.distribuidor || 'Distribuidor Genérico' // Podríamos agregar un campo para esto en el futuro
    };

    // Guardamos y volvemos a la lista
    this.inventarioService.agregarProducto(productoAguardar);
    this.router.navigate(['/productos']);
  }

  async escanearCodigo() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.escaneando = true;

      const result = await BarcodeScanner.startScan(); 

      if (result.hasContent) {
        this.nuevoProducto.codigoBarras = result.content; 
        
        // 3. ¡TOCAMOS EL TIMBRE! Para que el número aparezca en el Input al instante
        this.cdr.detectChanges();
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

  // 4. NUEVA FUNCIÓN PARA CANCELAR/LIMPIAR EL ESCÁNER
  detenerEscaneo() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
    this.escaneando = false; //
  }

  // Función temporal para la imagen
  cargarImagen(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.nuevoProducto.imagen = URL.createObjectURL(file);
    }
  }

}