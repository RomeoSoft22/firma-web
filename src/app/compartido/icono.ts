import { Component, input } from '@angular/core';

export type NombreIcono =
  | 'archivo'
  | 'firmar'
  | 'vb'
  | 'imprimir'
  | 'verificar'
  | 'acercar'
  | 'alejar'
  | 'ajustar'
  | 'estado'
  | 'configurar'
  | 'acerca'
  | 'aceptar'
  | 'cancelar'
  | 'certificado'
  | 'carpeta'
  | 'guardar'
  | 'cerrar'
  | 'alerta';

/** Íconos de trazo (24×24) de la aplicación de escritorio; toman el color del texto. */
@Component({
  selector: 'app-icono',
  host: { class: 'icono-svg' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (nombre()) {
        @case ('archivo') {
          <rect x="3" y="4" width="18" height="6" rx="1" /><rect x="3" y="10" width="18" height="10" rx="1" />
          <path d="M10 7h4M10 14h4" />
        }
        @case ('firmar') {
          <rect x="3" y="6" width="15" height="12" rx="1.5" /><path d="M20.5 4.5l-8 8-2.5.8.8-2.5 8-8z" /><path d="M7 21l3 -2 3 2" />
        }
        @case ('vb') {
          <rect x="3" y="7" width="10" height="10" rx="1.5" /><path d="M5.5 12l2 2 3.5-4" /><path d="M15 9l6 -2-1 4-5 2z" />
        }
        @case ('imprimir') {
          <path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><rect x="7" y="14" width="10" height="7" /><path d="M7 11h.01" />
        }
        @case ('verificar') {
          <path d="M20 4c-7 0-12 5-13 13l-3 3" /><path d="M20 4c0 7-5 12-13 13" /><path d="M9 14l8-8" />
        }
        @case ('acercar') {
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5M11 8v6M8 11h6" />
        }
        @case ('alejar') {
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5M8 11h6" />
        }
        @case ('ajustar') {
          <path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" />
        }
        @case ('estado') {
          <path d="M4 12.5l5 5L20 6.5" stroke-width="2.6" />
        }
        @case ('configurar') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
        }
        @case ('acerca') {
          <circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" />
        }
        @case ('aceptar') {
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6" />
        }
        @case ('cancelar') {
          <path d="M6 6l12 12M18 6L6 18" stroke-width="2.6" />
        }
        @case ('certificado') {
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h6M7 14h4" /><circle cx="17" cy="12" r="2" />
        }
        @case ('carpeta') {
          <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        }
        @case ('guardar') {
          <path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3M8 21v-7h8v7" />
        }
        @case ('cerrar') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('alerta') {
          <path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17h.01" />
        }
      }
    </svg>
  `,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
}
