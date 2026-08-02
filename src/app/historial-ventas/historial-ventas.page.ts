import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonItem, IonLabel, IonNote, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonDatetime, IonModal, IonBadge, IonAccordion, IonAccordionGroup, IonIcon, IonList, IonDatetimeButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cashOutline, cardOutline, receiptOutline, calendarOutline, personCircleOutline, timeOutline } from 'ionicons/icons';
import { InventarioService, Turno } from '../services/inventario';

@Component({
  selector: 'app-historial-ventas',
  templateUrl: './historial-ventas.page.html',
  styleUrls: ['./historial-ventas.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonBackButton, IonItem, IonLabel, IonNote, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonDatetime, IonModal, IonBadge, IonAccordion, 
    IonAccordionGroup, IonIcon, IonList, IonDatetimeButton
  ]
})
export class HistorialVentasPage implements OnInit {
  private inventarioService = inject(InventarioService);
  
  turnosTotales: Turno[] = [];
  turnosDelDia: Turno[] = [];

  fechaSeleccionada: string = new Date().toISOString(); 

  totalCaja: number = 0;
  totalEfectivo: number = 0;
  totalTarjeta: number = 0;
  cantidadVentas: number = 0;

  constructor() {
    addIcons({ cashOutline, cardOutline, receiptOutline, calendarOutline, personCircleOutline, timeOutline });
  }

  ngOnInit() {
    this.inventarioService.turnos$.subscribe(turnos => {
      this.turnosTotales = turnos;
      this.filtrarPorFecha(); 
    });
  }

  cambiarFecha(event: any) {
    this.fechaSeleccionada = event.detail.value;
    this.filtrarPorFecha();
  }

  filtrarPorFecha() {
    const diaSeleccionado = this.fechaSeleccionada.split('T')[0];
    this.turnosDelDia = this.turnosTotales.filter(t => t.fechaInicio.startsWith(diaSeleccionado));
    this.calcularCierreCaja();
  }

  calcularCierreCaja() {
    this.totalCaja = 0;
    this.totalEfectivo = 0;
    this.totalTarjeta = 0;
    this.cantidadVentas = 0;

    this.turnosDelDia.forEach(turno => {
      this.totalCaja += turno.totalGeneral;
      this.totalEfectivo += turno.totalEfectivo;
      this.totalTarjeta += turno.totalTarjeta;
      this.cantidadVentas += turno.ventas.length; 
    });
  }
}