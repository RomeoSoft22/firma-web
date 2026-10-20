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

## Compilación

```powershell
npm run build      # dist/front/browser
```

Publique `dist/front/browser` en un servidor web con HTTPS y agregue su dominio a
`Agente:OrigenesPermitidos` del agente y a `CORS_ORIGINS` de la API.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `src/app/core` | Servicios del agente y de la API, estado compartido, modelos y utilidades |
| `src/app/compartido` | Selector de certificado, opciones de firma, visor PDF (pdf.js), resultado de verificación |
| `src/app/paginas` | Firmar, Firma masiva, Verificar, Historial, Configuración |
