import { WEBHOOK_URL, REQUEST_TIMEOUT_MS } from './config.js';

function demoResponse(payload) {
  return {
    ok: true,
    respuesta: `Modo demostración sobre ${payload.tema}, con nivel ${payload.nivel}.\n\nCuando WEBHOOK_URL tenga una dirección, aquí aparecerá la respuesta generada por tu flujo de n8n para esta pregunta:\n\n${payload.pregunta}`,
    tema: payload.tema,
    nivel: payload.nivel,
    integracion: payload.integracion
  };
}

export async function askAssistant(payload) {
  if (!WEBHOOK_URL) return demoResponse(payload);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error('El Webhook devolvió una respuesta que no es JSON.');
    }

    if (!response.ok || body.ok === false) {
      throw new Error(body.respuesta || `El servicio respondió con HTTP ${response.status}.`);
    }

    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La solicitud tardó demasiado. Intenta nuevamente.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con el Webhook. Revisa CORS y que el flujo esté publicado.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
