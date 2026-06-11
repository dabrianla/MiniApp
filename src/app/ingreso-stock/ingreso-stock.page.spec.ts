import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IngresoStockPage } from './ingreso-stock.page';

describe('IngresoStockPage', () => {
  let component: IngresoStockPage;
  let fixture: ComponentFixture<IngresoStockPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IngresoStockPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
