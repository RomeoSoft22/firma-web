import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EstadoService } from './core/estado.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly estado = inject(EstadoService);

  protected readonly menu = [
    { ruta: '/firmar', texto: 'Firmar documento', icono: '✍' },
    { ruta: '/masiva', texto: 'Firma masiva', icono: '▤' },
    { ruta: '/verificar', texto: 'Verificar firma', icono: '✓' },
    { ruta: '/historial', texto: 'Historial', icono: '☰' },
    { ruta: '/configuracion', texto: 'Configuración', icono: '⚙' },
  ];

  ngOnInit(): void {
    this.estado.iniciar();
  }
}
