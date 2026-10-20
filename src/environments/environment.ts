/**
 * Producción (firma.juarezcampos.net): la API se sirve en el mismo dominio bajo /api,
 * así el navegador no necesita CORS. El agente siempre corre en la PC del usuario.
 */
export const environment = {
  produccion: true,
  agenteUrl: 'http://127.0.0.1:9876',
  apiUrl: '/api',
  /** Instalador del agente publicado junto al front. */
  descargaAgente: '/descargas/AgenteFirmaSetup.exe',
};
