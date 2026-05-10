import { Component, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonItem, IonInput, IonButton, IonLabel, IonIcon,
  IonSelect, IonSelectOption, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barcodeOutline, cameraOutline } from 'ionicons/icons';
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
    IonToolbar, IonButtons, IonBackButton, IonItem, IonInput, 
    IonButton, IonLabel, IonIcon, IonSelect, IonSelectOption
  ]
})
export class AgregarProductoPage {
  private inventarioService = inject(InventarioService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private loadingController = inject(LoadingController);

  nuevoProducto: Producto = {
    id: '',
    codigoBarras: '',
    nombre: '',
    categoria: 'Abarrotes',
    marca: '',
    medida: 'Unidad',
    precio: 0,
    stock: null,
    distribuidor: '',
    imagen: 'https://ionicframework.com/docs/img/demos/thumbnail.svg'
  };

  escaneando: boolean = false;

  constructor() {
    // Registramos los íconos usados en esta pantalla
    addIcons({ barcodeOutline, cameraOutline });
  }

  async guardarProducto() {
    if (!this.nuevoProducto.nombre || this.nuevoProducto.precio <= 0) {
      alert('El nombre y el precio son obligatorios.');
      return;
    }

    // 1. Mostramos el cargando, pero le ponemos un tiempo máximo (medio segundo)
    // para que sea solo un efecto visual rápido.
    const loading = await this.loadingController.create({
      message: 'Guardando...',
      spinner: 'circles',
      duration: 500 // <-- Se cerrará automáticamente en 500 milisegundos
    });
    await loading.present();

    try {
      // 2. Le quitamos el "await" inicial. 
      // Lanzamos la función y dejamos que Firebase se encargue de subirlo en segundo plano.
      this.inventarioService.agregarProducto(this.nuevoProducto);
      
      // 3. Nos vamos directamente a la lista sin esperar al servidor
      this.ngZone.run(() => {
        this.router.navigate(['/productos'], { replaceUrl: true });
      });

    } catch (error) {
      console.error(error);
      alert('Error al guardar. Revisa tu código.');
    }
}

  async escanearCodigo() {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (status.granted) {
        this.escaneando = true;
        document.body.classList.add('qrscanner');
        BarcodeScanner.hideBackground();
        
        const result = await BarcodeScanner.startScan(); 

        if (result.hasContent) {
          this.ngZone.run(() => {
            this.nuevoProducto.codigoBarras = String(result.content).trim(); 
          });
        }
      }
    } catch (error) {
      console.error('Error usando el escáner', error);
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

  async tomarFoto() {
    try {
      const foto = await Camera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (foto.webPath) {
        this.ngZone.run(() => {
          this.nuevoProducto.imagen = foto.webPath!;
        });
      }
    } catch (error) {
      console.error('Error al tomar la foto', error);
    }
  }

  ionViewWillLeave() {
    if (this.escaneando) {
      this.detenerEscaneo();
    }
  }
}