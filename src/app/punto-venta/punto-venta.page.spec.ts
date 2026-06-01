import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PuntoVentaPage } from './punto-venta.page';

describe('PuntoVentaPage', () => {
  let component: PuntoVentaPage;
  let fixture: ComponentFixture<PuntoVentaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PuntoVentaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
