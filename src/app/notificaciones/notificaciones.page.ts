import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonButtons, IonMenuButton, IonIcon, IonButton,
  IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonBadge, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, timeOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonMenuButton, IonIcon, IonButton,
    IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonBadge, IonNote
  ]
})
export class NotificacionesPage implements OnInit {
  
  // Variable para simular si es admin (luego la conectaremos a tu AuthService)
  esAdmin: boolean = true; 
  // Controla qué pestaña se está viendo
  vistaActual: string = 'admin'; 

  // --- DATOS VISTA EMPLEADO (CHAT) ---
  alertas = [
    { tipo: 'vencimiento', mensaje: 'El producto "Yogurth Soprole" está por vencer en 3 días.', fecha: 'Hoy, 08:30 AM' },
    { tipo: 'oferta', mensaje: 'Se ha actualizado una oferta: "Plátano" ahora está a $900 el kg.', fecha: 'Ayer, 15:45 PM' },
    { tipo: 'nuevo', mensaje: 'Nuevo producto agregado: "Chocolate Trencito 90g" a $1.200.', fecha: 'Ayer, 10:15 AM' }
  ];

  // --- DATOS VISTA ADMIN (LISTA PROFESIONAL) ---
  // (Usamos fechas reales para que el sistema calcule los días automáticamente)
  productosPorVencer = [
    { nombre: 'Leche Colun', stock: 8, fechaVencimiento: new Date(Date.now() + 5 * 86400000) }, // En 5 días
    { nombre: 'Queso Laminado', stock: 4, fechaVencimiento: new Date(Date.now() - 1 * 86400000) }, // Vencido hace 1 día
    { nombre: 'Yogurth Soprole', stock: 15, fechaVencimiento: new Date(Date.now() + 2 * 86400000) }, // En 2 días
    { nombre: 'Mantequilla', stock: 10, fechaVencimiento: new Date(Date.now() + 12 * 86400000) }, // En 12 días
  ];

  constructor() {
    // Agregamos íconos nuevos para la lista
    addIcons({ settingsOutline, timeOutline, alertCircleOutline });
  }

  ngOnInit() {
    this.ordenarProductosPorVencimiento();
  }

  // Ordena la lista para que los más urgentes salgan arriba
  ordenarProductosPorVencimiento() {
    this.productosPorVencer.sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime());
  }

  // Calcula la diferencia en días desde hoy hasta la fecha de vencimiento
  calcularDias(fecha: Date): number {
    const hoy = new Date();
    const diferencia = fecha.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  // Devuelve un color según la urgencia
  getColorBadge(dias: number): string {
    if (dias < 0) return 'dark';     // Negro si ya venció
    if (dias <= 3) return 'danger';  // Rojo si faltan 3 días o menos
    if (dias <= 7) return 'warning'; // Amarillo si faltan 7 días o menos
    return 'success';                // Verde si falta más tiempo
  }

  abrirConfiguracion() {
    console.log("Abriendo configuración de alertas...");
  }
}