import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { environment } from '../environments/environment';
import { AccesoService } from './core/acceso.service';
import { EstadoService } from './core/estado.service';
import { MarcaService } from './core/marca.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly estado = inject(EstadoService);

  protected readonly acceso = inject(AccesoService);
  protected readonly marca = inject(MarcaService);
  private readonly router = inject(Router);

  /** La aplicación de escritorio (/escritorio) ocupa toda la ventana, sin el menú lateral de la web. */
  protected readonly enEscritorio = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/escritorio')),
    ),
    { initialValue: location.pathname.startsWith('/escritorio') },
  );

  protected readonly menu = [
    { ruta: '/firmar', texto: 'Firmar documento', icono: '✍', protegida: false },
    { ruta: '/masiva', texto: 'Firma masiva', icono: '▤', protegida: false },
    { ruta: '/verificar', texto: 'Verificar firma', icono: '✓', protegida: false },
    { ruta: '/historial', texto: 'Historial', icono: '☰', protegida: true },
    { ruta: '/configuracion', texto: 'Configuración', icono: '⚙', protegida: true },
  ];

  /** Compilación de la aplicación de escritorio (Configuración e Historial sin el menú de la web). */
  protected readonly esEscritorio = environment.escritorio;

  protected async cerrarSesion(): Promise<void> {
    await this.acceso.salir();
    await this.router.navigateByUrl(this.esEscritorio ? '/escritorio' : '/firmar');
  }

  /** Vuelve a la ventana de firma; la sesión de administración sigue abierta hasta que venza. */
  protected volverAFirmar(): void {
    this.router.navigateByUrl('/escritorio');
  }

  ngOnInit(): void {
    this.estado.iniciar();
    this.marca.cargar();
  }
}
