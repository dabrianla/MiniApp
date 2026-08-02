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
import { barcodeOutline, cameraOutline, imageOutline, saveOutline, createOutline, trashOutline, closeOutline, gridOutline, businessOutline, sparklesOutline, cubeOutline, pricetagOutline, cashOutline, scaleOutline, alertCircleOutline, calendarOutline} from 'ionicons/icons';
import { InventarioService, Producto } from '../services/inventario';
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';
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
  esEdicion: boolean = false; // 🟢 Nueva variable para saber si estamos sobreescribiendo

  private inventarioService = inject(InventarioService);
  private router = inject(Router);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);
  private ngZone = inject(NgZone);

  constructor() {
    addIcons({ barcodeOutline, cameraOutline, imageOutline, saveOutline, createOutline, trashOutline, closeOutline, gridOutline, businessOutline, sparklesOutline, cubeOutline, pricetagOutline, cashOutline, scaleOutline, alertCircleOutline, calendarOutline });
  }

  // --- 1. GUARDAR PRODUCTO ---
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

      // 🟢 Modificamos esto: Solo bloquea si NO estamos en modo edición
      if (productoExistente && !this.esEdicion) {
        const alert = await this.alertController.create({
          header: 'Código Duplicado ',
          message: `Ya existe un producto con este código de barras: ${productoExistente.nombre}. Ingresa al control de stock para ingresar más unidades.`,
          buttons: ['Entendido']
        });
        await alert.present();
        return; 
      }
    }

    const loading = await this.loadingController.create({
      message: this.esEdicion ? 'Actualizando producto...' : 'Subiendo producto...', 
      spinner: 'circles'
    });
    await loading.present();

    try {
      let urlImagenFinal = '';

      // Si tiene una imagen nueva en base64 (y no una URL de Firebase de un producto existente)
      if (this.nuevoProducto.imagen && !this.nuevoProducto.imagen.startsWith('http')) {
        urlImagenFinal = await this.inventarioService.subirImagen(
          this.nuevoProducto.imagen, 
          this.nuevoProducto.nombre.replace(/\s+/g, '_') 
        );
      } else {
        urlImagenFinal = this.nuevoProducto.imagen; // Conserva la imagen que ya tenía
      }

      // TRATAMIENTO DE LA FECHA
      let fechaFinalDate = null;
      if (this.nuevoProducto.fechaVencimiento && typeof this.nuevoProducto.fechaVencimiento === 'string' && this.nuevoProducto.fechaVencimiento.trim() !== '') {
        const partesFecha = this.nuevoProducto.fechaVencimiento.split('-');
        if(partesFecha.length === 3) {
          fechaFinalDate = new Date(parseInt(partesFecha[0]), parseInt(partesFecha[1]) - 1, parseInt(partesFecha[2]));
        }
      }

      const datosParaGuardar = {
        ...this.nuevoProducto,
        imagen: urlImagenFinal, 
        codigoBarras: this.nuevoProducto.codigoBarras || '',
        fechaVencimiento: fechaFinalDate || this.nuevoProducto.fechaVencimiento 
      };

      // 🟢 AQUÍ ESTÁ LA SOLUCIÓN DEFINITIVA A LOS DUPLICADOS
      if (this.esEdicion && this.nuevoProducto.id) {
        // SI ES EDICIÓN: Usamos el ID interno de Firebase para buscarlo y sobreescribir sus datos
        await this.inventarioService.actualizarProductoCompleto(this.nuevoProducto.id, datosParaGuardar);
      } else {
        // SI ES NUEVO: Nos aseguramos de borrar el id temporal por si acaso, y lo creamos desde cero
        delete datosParaGuardar.id;
        await this.inventarioService.agregarProducto(datosParaGuardar);
      }

      await loading.dismiss();
      
      const successAlert = await this.alertController.create({
        header: '¡Éxito!',
        message: this.esEdicion ? 'Producto actualizado correctamente.' : 'Producto guardado correctamente en el inventario.',
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
  // --- 2. ESCÁNER DE CÓDIGO DE BARRAS MEJORADO ---
  async escanearCodigo() {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      document.body.classList.add('qrscanner');
      this.escaneando = true;

      const opciones = {
        targetedFormats: [
          SupportedFormat.EAN_13, 
          SupportedFormat.EAN_8, 
          SupportedFormat.UPC_A, 
          SupportedFormat.UPC_E
        ]
      };

      const result = await BarcodeScanner.startScan(opciones);

      if (result.hasContent) {
        const codigoLeido = result.content.trim();

        if (codigoLeido.length < 8) {
          const alertReflejo = await this.alertController.create({
            header: 'Código irreconocible',
            message: 'Parece que la cámara leyó un reflejo o el código está borroso. Intenta acercar la cámara lentamente.',
            buttons: ['Intentar de nuevo']
          });
          await alertReflejo.present();
          return;
        }

        // 🟢 3. NUEVO: Verificamos si el producto ya existe
        const productoExistente = this.inventarioService.productos.find(
          (p) => p.codigoBarras === codigoLeido
        );

        if (productoExistente) {
          // Si el producto existe, le preguntamos al usuario si desea sobreescribirlo
          const alertExiste = await this.alertController.create({
            header: 'Producto ya registrado',
            message: `Este producto (${productoExistente.nombre}) ya se encuentra en el catálogo. ¿Quieres cargar sus datos para sobrescribirlo o actualizarlo?`,
            buttons: [
              {
                text: 'No, cancelar',
                role: 'cancel'
              },
              {
                text: 'Sí, sobrescribir',
                handler: () => {
                  this.ngZone.run(() => {
                    this.esEdicion = true; // Marcamos que estamos sobreescribiendo
                    // Copiamos los datos del producto existente al formulario
                    this.nuevoProducto = { ...productoExistente };
                    
                    // Si la fecha de vencimiento es un objeto, lo pasamos a string para el input
                    if (this.nuevoProducto.fechaVencimiento && typeof this.nuevoProducto.fechaVencimiento.toDate === 'function') {
                      this.nuevoProducto.fechaVencimiento = this.nuevoProducto.fechaVencimiento.toDate().toISOString().split('T')[0];
                    }
                  });
                }
              }
            ]
          });
          await alertExiste.present();
        } else {
          // Si el producto es totalmente nuevo, lo asignamos de forma normal
          this.ngZone.run(() => {
            this.esEdicion = false;
            this.nuevoProducto.codigoBarras = codigoLeido;
          });
        }
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