import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'productos',
    pathMatch: 'full',
  },
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
  },
  {
    path: 'productos',
    loadComponent: () => import('./productos/productos.page').then( m => m.ProductosPage)
  },
  {
    path: 'agregar-producto',
    loadComponent: () => import('./agregar-producto/agregar-producto.page').then( m => m.AgregarProductoPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'punto-venta',
    loadComponent: () => import('./punto-venta/punto-venta.page').then( m => m.PuntoVentaPage)
  },
  {
    path: 'notificaciones',
    loadComponent: () => import('./notificaciones/notificaciones.page').then( m => m.NotificacionesPage)
  },
  {
    path: 'ingreso-stock',
    loadComponent: () => import('./ingreso-stock/ingreso-stock.page').then( m => m.IngresoStockPage)
  },
];
