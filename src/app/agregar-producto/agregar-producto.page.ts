import { Component } from '@angular/core';
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

  mensajeError: string = '';

  constructor(
    private inventarioService: InventarioService,
    private router: Router
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
      // 1. Pedir permisos de cámara
      await BarcodeScanner.checkPermission({ force: true });
      
      // 2. Hacer transparente el fondo de la app (la cámara está por "detrás" de la pantalla)
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner'); // Usamos esto para quitar los fondos blancos

      // 3. ¡Encender cámara y esperar a que detecte un código!
      const result = await BarcodeScanner.startScan(); 

      // 4. Si escanea algo exitosamente...
      if (result.hasContent) {
        this.nuevoProducto.codigoBarras = result.content; // Rellenamos el input automáticamente
      }

      // 5. Apagar cámara y restaurar la pantalla
      BarcodeScanner.showBackground();
      document.body.classList.remove('qrscanner');

    } catch (error) {
      console.error('Error usando el escáner', error);
      alert('La cámara nativa solo funciona cuando instales la app en un teléfono real.');
    }
  }

  // Función temporal para la imagen
  cargarImagen(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Por ahora solo guardamos el nombre del archivo como prueba
      this.nuevoProducto.imagen = URL.createObjectURL(file);
    }
  }
}