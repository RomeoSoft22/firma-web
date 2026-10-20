# firma-web

Front (Angular) del sistema de firma digital: firma individual con vista previa y ubicación del
sello, firma masiva, verificación de firmas, historial y configuración (motivos con imagen,
tamaño y diseño del sello; parámetros; conexiones).

Forma parte del sistema:
[firma-api](https://github.com/RomeoSoft22/firma-api) ·
[firma-agente](https://github.com/RomeoSoft22/firma-agente) ·
[firma-servicio](https://github.com/RomeoSoft22/firma-servicio) (documentación general).

## Requisitos

- Node.js 20+
- El [agente local](https://github.com/RomeoSoft22/firma-agente) en ejecución en el equipo que firma
  (por defecto `http://127.0.0.1:9876`) y la [API](https://github.com/RomeoSoft22/firma-api)
  (por defecto `http://127.0.0.1:8000/api`). Ambas direcciones se cambian en **Configuración → Conexiones**.

## Desarrollo

```powershell
npm install
npm start          # http://localhost:4200
```

> Dart Sass falla con rutas de carpeta muy largas en Windows: clone el proyecto en una ruta
> corta (p. ej. `C:\proyectos\firma-web`).

## Compilación (SPA de producción)

```powershell
npm run build      # dist/front/browser
```

| Entorno | Archivo | API | Agente |
| --- | --- | --- | --- |
| Desarrollo (`npm start`) | `src/environments/environment.development.ts` | `http://127.0.0.1:8000/api` | `http://127.0.0.1:9876` |
| Producción (`npm run build`) | `src/environments/environment.ts` | `/api` (mismo dominio) | `http://127.0.0.1:9876` |

Es una SPA: el servidor debe devolver `index.html` para cualquier ruta que no sea un archivo
(`/firmar`, `/historial`…) y enviar `/api/*` a Laravel. El paquete de
[firma-servicio](https://github.com/RomeoSoft22/firma-servicio) (`scripts\empaquetar-cpanel.ps1`)
ya incluye ese `.htaccess` para Apache/cPanel, con HTTPS, cabeceras de seguridad y CSP (por eso la
compilación de producción no inyecta CSS crítico en línea y pdf.js se usa sin `eval`).

Si el agente no responde, la pantalla de firma ofrece descargar `/descargas/AgenteFirmaSetup.exe`.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `src/app/core` | Servicios del agente y de la API, estado compartido, modelos y utilidades |
| `src/app/compartido` | Selector de certificado, opciones de firma, visor PDF (pdf.js), resultado de verificación |
| `src/app/paginas` | Firmar, Firma masiva, Verificar, Historial, Configuración |
