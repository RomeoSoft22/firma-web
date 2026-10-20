import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { VerificacionResultado } from '../core/modelos';

@Component({
  selector: 'app-resultado-verificacion',
  imports: [DatePipe],
  template: `
    @let v = resultado();
    @if (v.totalFirmas === 0) {
      <div class="alerta">El documento no contiene firmas digitales.</div>
    } @else {
      <div class="alerta" [class.alerta-ok]="v.todasValidas" [class.alerta-error]="!v.todasValidas">
        {{ v.totalFirmas }} {{ v.totalFirmas === 1 ? 'firma encontrada' : 'firmas encontradas' }} —
        {{ v.todasValidas ? 'todas son válidas e íntegras.' : 'al menos una firma presenta observaciones.' }}
      </div>
      @for (f of v.firmas; track f.nombreCampo) {
        <div class="firma-verificada">
          <div class="firma-cabecera">
            <strong>{{ f.firmante }}</strong>
            <span class="insignia" [class.ok]="f.integridadValida" [class.mal]="!f.integridadValida">
              {{ f.integridadValida ? 'Íntegra' : 'Alterada / inválida' }}
            </span>
            <span class="insignia" [class.ok]="f.certificadoVigenteAlFirmar" [class.mal]="!f.certificadoVigenteAlFirmar">
              {{ f.certificadoVigenteAlFirmar ? 'Certificado vigente al firmar' : 'Certificado no vigente al firmar' }}
            </span>
            @if (f.tieneSelloTiempo) {
              <span class="insignia" [class.ok]="f.selloTiempoValido" [class.mal]="!f.selloTiempoValido">Sello de tiempo</span>
            }
            @if (!f.cubreTodoDocumento) {
              <span class="insignia aviso" title="Hubo modificaciones o firmas posteriores a esta">Revisión {{ f.revision }} de {{ f.totalRevisiones }}</span>
            }
          </div>
          @if (f.error) {
            <div class="alerta alerta-error">{{ f.error }}</div>
          }
          <dl class="datos">
            @if (f.documento) {<dt>Documento</dt><dd>{{ f.documento }}</dd>}
            <dt>Emisor</dt><dd>{{ f.emisor }}</dd>
            <dt>Fecha de firma</dt><dd>{{ f.fechaFirma ? (f.fechaFirma | date: 'dd/MM/yyyy HH:mm:ss') : '—' }}</dd>
            @if (f.fechaSelloTiempo) {<dt>Sello de tiempo</dt><dd>{{ f.fechaSelloTiempo | date: 'dd/MM/yyyy HH:mm:ss' }}</dd>}
            @if (f.motivo) {<dt>Motivo</dt><dd>{{ f.motivo }}</dd>}
            @if (f.ubicacion) {<dt>Lugar</dt><dd>{{ f.ubicacion }}</dd>}
            <dt>Vigencia del certificado</dt>
            <dd>{{ f.certValidoDesde | date: 'dd/MM/yyyy' }} — {{ f.certValidoHasta | date: 'dd/MM/yyyy' }}</dd>
            <dt>Algoritmo</dt><dd>{{ f.algoritmoHash }} con {{ f.algoritmoFirma }}</dd>
            <dt>N.° de serie</dt><dd class="mono">{{ f.numeroSerie }}</dd>
          </dl>
        </div>
      }
    }
  `,
})
export class ResultadoVerificacion {
  readonly resultado = input.required<VerificacionResultado>();
}
