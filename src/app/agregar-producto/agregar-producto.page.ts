import { Component, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonItem, IonInput, IonButton, IonLabel, IonIcon,
  IonSelect, IonSelectOption, IonGrid, IonRow, IonCol, 
  LoadingController, AlertController, IonCard, IonCardContent, IonList, IonToggle, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barcodeOutline, cameraOutline, imageOutline, saveOutline, createOutline, trashOutline, closeOutline, gridOutline, businessOutline, sparklesOutline, cubeOutline, pricetagOutline, cashOutline, scaleOutline} from 'ionicons/icons';
import { InventarioService, Producto } from '../services/inventario';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

@Component({
  selector: 'app-agregar-producto',
  templateUrl: './agregar-producto.page.html',
  styleUrls: ['./agregar-producto.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonBackButton, IonItem, IonInput, IonButton, IonLabel, IonIcon,
    IonSelect, IonSelectOption, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonList, IonToggle, IonFooter
  ]
})
export class AgregarProductoPage {
  nuevoProducto: any = {
    nombre: '',
    codigoBarras: '',
    marca: '',
    categoria: '',
    medida: '',
    stock: null,
    precio: null,
    distribuidor: '',
    imagen: ''
  };

  escaneando: boolean = false;

  private inventarioService = inject(InventarioService);
  private router = inject(Router);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private ngZone = inject(NgZone);

  constructor() {
    addIcons({ barcodeOutline, cameraOutline, imageOutline, saveOutline, createOutline, trashOutline, closeOutline, gridOutline, businessOutline, sparklesOutline, cubeOutline, pricetagOutline, cashOutline, scaleOutline });
  }

  // --- 1. GUARDAR PRODUCTO ---
  async guardarProducto() {
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.precio) {
      const alert = await this.alertController.create({
        header: 'Campos incompletos',
        message: 'El nombre y el precio son obligatorios.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Validación de duplicados
    if (this.nuevoProducto.codigoBarras && this.nuevoProducto.codigoBarras.trim() !== '') {
      const codigoA_Buscar = this.nuevoProducto.codigoBarras.trim();
      
      const productoExistente = this.inventarioService.productos.find(
        (p) => p.codigoBarras === codigoA_Buscar
      );

      if (productoExistente) {
        const alert = await this.alertController.create({
          header: '❌ Código Duplicado ❌',
          message: `No se puede agregar. Ya existe un producto con este código de barras: ${productoExistente.nombre}. 
          Por favor, búscalo en el inventario si deseas actualizar su precio o stock.`,
          buttons: ['Entendido']
        });
        await alert.present();
        return; 
      }
    }

    const loading = await this.loadingController.create({
      message: 'Subiendo producto y foto...', // 🟢 Cambiamos el mensaje para que el usuario sepa qué pasa
      spinner: 'circles'
    });
    await loading.present();

    try {
      let urlImagenFinal = '';

      // 🟢 EL PASO CLAVE: Subimos la imagen a Storage antes de guardar el producto
      if (this.nuevoProducto.imagen) {
        urlImagenFinal = await this.inventarioService.subirImagen(
          this.nuevoProducto.imagen, 
          this.nuevoProducto.nombre.replace(/\s+/g, '_') // Limpiamos el nombre para que el archivo no tenga espacios raros
        );
      }

      // Reemplazamos la imagen gigante en Base64 por la URL cortita de internet
      const datosParaGuardar = {
        ...this.nuevoProducto,
        imagen: urlImagenFinal, 
        codigoBarras: this.nuevoProducto.codigoBarras || '' 
      };

      await this.inventarioService.agregarProducto(datosParaGuardar);
      await loading.dismiss();
      
      const successAlert = await this.alertController.create({
        header: '¡Éxito!',
        message: 'Producto guardado correctamente en el inventario.',
        buttons: ['Genial']
      });
      await successAlert.present();
      
      this.router.navigate(['/productos'], { replaceUrl: true });
      
    } catch (error) {
      await loading.dismiss();
      console.error(error);
      const errorAlert = await this.alertController.create({
        header: 'Error',
        message: 'Hubo un problema de conexión al guardar el producto.',
        buttons: ['OK']
      });
      await errorAlert.present();
    }
  }

  // --- 2. ESCÁNER DE CÓDIGO DE BARRAS ---
  async escanearCodigo() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.escaneando = true;

      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        this.ngZone.run(() => {
          this.nuevoProducto.codigoBarras = result.content.trim();
        });
      }
    } catch (error) {
      console.error('Error al escanear', error);
    } finally {
      this.detenerEscaneo();
    }
  }

  detenerEscaneo() {
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
    this.escaneando = false;
  }

  // --- 3. CÁMARA PARA FOTOS ---
  async tomarFoto() {
    try {
      const foto = await Camera.getPhoto({
        quality: 50,
        width: 800,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera, // 🟢 Forzamos que abra la cámara directo (sin preguntar galería)
        direction: CameraDirection.Rear // 🟢 Forzamos cámara TRASERA
      });

      this.ngZone.run(() => {
        this.nuevoProducto.imagen = foto.dataUrl;
      });
    } catch (error) {
      console.error('Error al tomar foto', error);
    }
  }

  ionViewWillLeave() {
    if (this.escaneando) {
      this.detenerEscaneo();
    }
  }
}