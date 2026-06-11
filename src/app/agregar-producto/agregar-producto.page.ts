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
// 🟢 Corregí el nombre del ícono del calendario
import { barcodeOutline, cameraOutline, imageOutline, saveOutline, createOutline, trashOutline, closeOutline, gridOutline, businessOutline, sparklesOutline, cubeOutline, pricetagOutline, cashOutline, scaleOutline, alertCircleOutline, calendarOutline} from 'ionicons/icons';
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
    imagen: '',
    stockMinimo: null,
    fechaVencimiento: null
  };

  escaneando: boolean = false;

  private inventarioService = inject(InventarioService);
  private router = inject(Router);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private ngZone = inject(NgZone);

  constructor() {
    addIcons({ barcodeOutline, cameraOutline, imageOutline, saveOutline, createOutline, trashOutline, closeOutline, gridOutline, businessOutline, sparklesOutline, cubeOutline, pricetagOutline, cashOutline, scaleOutline, alertCircleOutline, calendarOutline });
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

    if (this.nuevoProducto.codigoBarras && this.nuevoProducto.codigoBarras.trim() !== '') {
      const codigoA_Buscar = this.nuevoProducto.codigoBarras.trim();
      const productoExistente = this.inventarioService.productos.find(
        (p) => p.codigoBarras === codigoA_Buscar
      );

      if (productoExistente) {
        const alert = await this.alertController.create({
          header: '❌ Código Duplicado ❌',
          message: `Ya existe un producto con este código de barras: ${productoExistente.nombre}. Búscalo en el inventario si deseas actualizar su stock.`,
          buttons: ['Entendido']
        });
        await alert.present();
        return; 
      }
    }

    const loading = await this.loadingController.create({
      message: 'Subiendo producto...', 
      spinner: 'circles'
    });
    await loading.present();

    try {
      let urlImagenFinal = '';

      if (this.nuevoProducto.imagen) {
        urlImagenFinal = await this.inventarioService.subirImagen(
          this.nuevoProducto.imagen, 
          this.nuevoProducto.nombre.replace(/\s+/g, '_') 
        );
      }

      // 🟢 TRATAMIENTO DE LA FECHA (PASA DE TEXTO A OBJETO DATE NATIVO)
      let fechaFinalDate = null;
      if (this.nuevoProducto.fechaVencimiento && this.nuevoProducto.fechaVencimiento.trim() !== '') {
        // Separamos el texto "2025-10-31" en una lista [2025, 10, 31]
        const partesFecha = this.nuevoProducto.fechaVencimiento.split('-');
        if(partesFecha.length === 3) {
          // Javascript cuenta los meses desde el 0 (Enero es 0). Por eso el -1 en el mes.
          fechaFinalDate = new Date(parseInt(partesFecha[0]), parseInt(partesFecha[1]) - 1, parseInt(partesFecha[2]));
        }
      }

      const datosParaGuardar = {
        ...this.nuevoProducto,
        imagen: urlImagenFinal, 
        codigoBarras: this.nuevoProducto.codigoBarras || '',
        fechaVencimiento: fechaFinalDate // 🟢 Se guarda un Date real, Firebase lo convierte a Timestamp
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
        source: CameraSource.Camera, 
        direction: CameraDirection.Rear 
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