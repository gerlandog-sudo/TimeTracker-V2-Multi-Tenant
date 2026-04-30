# MEMORIA TÉCNICA: Integración con KODAN-HUB (TimeTracker)

Este documento es una guía para el agente de IA encargado de **TimeTracker**. Define el cambio de arquitectura para las llamadas de Inteligencia Artificial hacia el Hub centralizado.

## 1. Nuevo Punto de Acceso
Se ha centralizado la IA en **KODAN-HUB** para proteger las API Keys y gestionar el consumo por producto.

## 2. Configuración del Hub
- **URL del Hub**: `https://hub.pmaasglobal.com/`
- **Token de Aplicación**: `TT-HUB-4482-KDN` (Header `X-KODAN-TOKEN`)
- **API Key**: Blindada en el servidor. **Eliminar de config.php y .env locales en TimeTracker.**

## 3. Implementación Sugerida
Actualizar el `AiService.php` de TimeTracker para que en lugar de llamar a Google directamente, realice un `POST` a la URL del Hub inyectando el header de seguridad correspondiente.

## 4. Estructura JSON
```json
{
  "model": "gemma-3-4b-it",
  "payload": {
    "contents": [ ... ]
  }
}
```
