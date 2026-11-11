# Asistente académico · Web app 3.4

Aplicación web estática para consultar un asistente académico de tecnologías de la información. Permite elegir un tema, indicar el nivel de profundidad, escribir una pregunta y seleccionar la integración que procesará la consulta.

## ¿Qué hace la aplicación?

La interfaz:

- Presenta un flujo guiado de cuatro pasos.
- Permite seleccionar Inteligencia artificial, Redes, Programación, Bases de datos o Internet de las cosas (IoT).
- Permite elegir nivel Básico, Intermedio o Avanzado.
- Valida y normaliza la pregunta antes de enviarla.
- Permite elegir entre Nodo OpenAI y HTTP Request / Responses API.
- Envía la consulta al Webhook de producción de n8n sin recargar la página.
- Muestra estados de carga, errores y la respuesta completa.
- Permite copiar la respuesta e iniciar una nueva consulta.

## ¿Cómo funciona?

El navegador no se conecta directamente con OpenAI. La comunicación sigue este flujo:

```text
Usuario → aplicación estática → Webhook HTTPS de n8n
                                  ↓
                 Nodo OpenAI o HTTP Request
                                  ↓
                        Respond to Webhook
                                  ↓
                         respuesta JSON
```

La aplicación envía mediante `POST` un JSON con los campos exactos:

```json
{
  "tema": "Redes",
  "nivel": "Intermedio",
  "pregunta": "¿Cuál es la diferencia entre TCP y UDP?",
  "integracion": "http"
}
```

El Webhook devuelve un contrato unificado:

```json
{
  "ok": true,
  "respuesta": "Texto generado por el asistente.",
  "tema": "Redes",
  "nivel": "Intermedio",
  "integracion": "http"
}
```

## Archivos principales

- `index.html`: estructura de la interfaz y flujo de pasos.
- `css/styles.css`: diseño responsivo, modo oscuro, tarjetas y panel de respuesta.
- `js/config.js`: URL pública de producción del Webhook.
- `js/validation.js`: validación y normalización de datos.
- `js/api-client.js`: petición HTTPS con Fetch, timeout y manejo de errores.
- `js/app.js`: navegación, estado del formulario y presentación de respuestas.
- `favicon.svg`: icono de la aplicación.

## Pruebas recomendadas

- Consultar usando `nativo`.
- Consultar usando `http`.
- Cambiar tema y nivel.
- Enviar una pregunta vacía o demasiado corta.
- Probar una integración inválida.
- Comprobar el mensaje de error de red o timeout.
- Leer una respuesta larga completa desde el panel de respuesta.
- Copiar la respuesta y comenzar una nueva consulta.
- Verificar la interfaz en computadora y teléfono móvil.
