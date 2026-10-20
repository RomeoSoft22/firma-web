import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgenteService } from '../core/agente.service';
import { mensajeError } from '../core/archivos';
import { EstadoService } from '../core/estado.service';
import { Certificado } from '../core/modelos';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-selector-certificado',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="tarjeta">
      <div class="tarjeta-cabecera">
        <h2><span class="paso">1</span> Certificado digital</h2>
        <div class="acciones">
          <label class="check"><input type="checkbox" [(ngModel)]="todos" (change)="cargar()" /> Mostrar todos</label>
          <button class="btn btn-sec" (click)="cargar()" [disabled]="cargando()">
            {{ cargando() ? 'Leyendo…' : 'Actualizar' }}
          </button>
        </div>
      </div>

      @if (!estado.agenteOk()) {
        <div class="alerta alerta-error ayuda-agente">
          <strong>No se pudo conectar con el Agente de Firma de esta PC.</strong>
          <ol>
            <li>
              ¿Primera vez en esta PC?
              <a [href]="descargaAgente" download>Descargue e instale el Agente de Firma</a>.
            </li>
            <li>
              Si ya está instalado, ábralo desde el menú Inicio (<em>Reiniciar Agente de Firma</em>) y compruebe el ícono
              «FD» en la bandeja del sistema.
            </li>
            <li>
              Si el navegador preguntó si este sitio puede <em>acceder a la red local / dispositivos locales</em>, elija
              <strong>Permitir</strong> (candado de la barra de direcciones → Configuración del sitio).
            </li>
            <li>
              Desactive el <strong>bloqueador de anuncios o escudos</strong> del navegador para este sitio: algunos bloquean
              la conexión con el agente (127.0.0.1).
            </li>
          </ol>
          Luego pulse «Actualizar».
        </div>
      } @else if (error()) {
        <div class="alerta alerta-error">{{ error() }}</div>
      } @else if (!cargando() && certificados().length === 0) {
        <div class="alerta">
          No se encontraron certificados aptos para firma. Conecte su token / DNIe o instale su certificado (.pfx)
          en el almacén personal de Windows y pulse «Actualizar».
        </div>
      }

      <div class="lista-certificados">
        @for (c of certificados(); track c.thumbprint) {
          <button
            type="button"
            class="certificado"
            [class.activo]="seleccionado()?.thumbprint === c.thumbprint"
            [class.no-apto]="!c.aptoFirma"
            [disabled]="!c.aptoFirma"
            (click)="seleccionado.set(c)"
          >
            <div class="cert-titular">{{ c.titular }}</div>
            @if (c.documento) {
              <div class="cert-dato">{{ c.documento }}</div>
            }
            @if (c.organizacion) {
              <div class="cert-dato">{{ c.organizacion }}{{ c.cargo ? ' · ' + c.cargo : '' }}</div>
            }
            <div class="cert-dato">Emisor: {{ c.emisor }}</div>
            <div class="cert-pie">
              <span class="insignia" [class.ok]="c.vigente" [class.mal]="!c.vigente">
                {{ c.vigente ? 'Vigente' : 'Vencido' }} hasta {{ c.validoHasta | date: 'dd/MM/yyyy' }}
              </span>
              @if (c.aptoFirma && !c.deFirma) {
                <span class="insignia aviso" title="No tiene uso de No repudio ni de firma de documentos">No es de firma</span>
              }
              @if (!c.cadenaConfiable) {
                <span class="insignia aviso" title="Windows no reconoce la cadena de la entidad emisora">Cadena no verificada</span>
              }
              <span class="insignia">{{ c.algoritmo }}</span>
            </div>
          </button>
        }
      </div>
    </div>
  `,
})
export class SelectorCertificado implements OnInit {
  private readonly agente = inject(AgenteService);
  protected readonly estado = inject(EstadoService);
  protected readonly descargaAgente = environment.descargaAgente;

  readonly seleccionado = model<Certificado | null>(null);
  protected readonly certificados = signal<Certificado[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected todos = false;

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      await this.estado.comprobarConexion();
      if (!this.estado.agenteOk()) return;
      const lista = await this.agente.certificados(this.todos);
      this.certificados.set(lista);
      const actual = this.seleccionado();
      if (!actual || !lista.some((c) => c.thumbprint === actual.thumbprint)) {
        const aptos = lista.filter((c) => c.aptoFirma);
        this.seleccionado.set(aptos.length === 1 ? aptos[0] : null);
      }
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
