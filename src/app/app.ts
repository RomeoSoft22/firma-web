import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccesoService } from './core/acceso.service';
import { EstadoService } from './core/estado.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly estado = inject(EstadoService);

  protected readonly acceso = inject(AccesoService);
  private readonly router = inject(Router);

  protected readonly menu = [
    { ruta: '/firmar', texto: 'Firmar documento', icono: '✍', protegida: false },
    { ruta: '/masiva', texto: 'Firma masiva', icono: '▤', protegida: false },
    { ruta: '/verificar', texto: 'Verificar firma', icono: '✓', protegida: false },
    { ruta: '/historial', texto: 'Historial', icono: '☰', protegida: true },
    { ruta: '/configuracion', texto: 'Configuración', icono: '⚙', protegida: true },
  ];

  protected async cerrarSesion(): Promise<void> {
    await this.acceso.salir();
    await this.router.navigateByUrl('/firmar');
  }

  ngOnInit(): void {
    this.estado.iniciar();
  }
}
