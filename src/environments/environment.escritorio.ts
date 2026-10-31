/**
 * Aplicación de escritorio (Firma Digital, WebView2): el agente sirve esta interfaz en
 * http://127.0.0.1:9876, atiende /api/* (certificados, firma, verificación) y reenvía /servicio/*
 * a la API de firma.juarezcampos.net. Todo es del mismo origen: sin CORS ni bloqueadores de por medio.
 */
export const environment = {
  produccion: true,
  escritorio: true,
  agenteUrl: '',
  apiUrl: '/servicio',
  descargaAgente: 'https://firma.juarezcampos.net/descargas/AgenteFirmaSetup.exe',
  sitioWeb: 'https://firma.juarezcampos.net',
};
