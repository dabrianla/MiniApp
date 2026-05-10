import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonItem, IonInput, IonButton, IonIcon, 
  LoadingController, AlertController, IonCard, IonCardContent, IonCardHeader, IonCardTitle 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
// 👇 1. Agregamos el ícono "arrowBackOutline" aquí
import { logInOutline, personCircleOutline, arrowBackOutline } from 'ionicons/icons'; 

import { AuthService } from '../services/auth'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, 
    IonItem, IonInput, IonButton, IonIcon,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle
  ]
})
export class LoginPage {
  email: string = '';
  password: string = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  constructor() {
    // 👇 2. Registramos el ícono para que HTML lo pueda usar
    addIcons({ logInOutline, personCircleOutline, arrowBackOutline });
  }

  // 👇 3. Nueva función para volver al inventario
  volverInicio() {
    this.router.navigate(['/productos'], { replaceUrl: true });
  }

  async iniciarSesion() {
    if (!this.email || !this.password) {
      this.mostrarAlerta('Error', 'Por favor, ingresa tu correo y contraseña.');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      await this.authService.login(this.email, this.password);
      await loading.dismiss();
      this.router.navigate(['/productos'], { replaceUrl: true });
    } catch (error: any) {
      await loading.dismiss();
      console.error(error);
      this.mostrarAlerta('Acceso denegado', 'Correo o contraseña incorrectos.');
    }
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}