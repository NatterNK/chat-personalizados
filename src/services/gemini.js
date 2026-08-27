import { GoogleGenAI } from '@google/genai';

/**
 * Obtiene la API Key desde las variables de entorno de Vite
 */
export const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

/**
 * Instancia del cliente SDK (stateless)
 */
let aiClient = null;

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('No se encontró la variable VITE_GEMINI_API_KEY en el entorno .env');
    console.error('Error de configuración:', err.message);
    throw err;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

/**
 * Parsea un Data URL en mimeType y data base64 puro
 */
const parseDataUrl = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mimeType: matches[1],
    data: matches[2],
  };
};

/**
 * Mapea el historial de mensajes y posible imagen al formato estricto de Gemini contents
 */
const buildContentsPayload = (history = [], userInput = '', image = null) => {
  const contents = [];

  // 1. Incluir turnos anteriores de la conversación
  for (const msg of history) {
    if (!msg) continue;
    const parts = [];

    // Si el mensaje anterior tenía una imagen adjunta
    if (msg.image) {
      const parsed = typeof msg.image === 'string' ? parseDataUrl(msg.image) : msg.image;
      if (parsed?.data && parsed?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data.replace(/^data:[^;]+;base64,/, ''),
          },
        });
      }
    }

    if (msg.text) {
      parts.push({ text: msg.text });
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts,
      });
    }
  }

  // 2. Agregar el mensaje actual del usuario + imagen multimodal
  const currentUserParts = [];

  if (image) {
    const parsed = typeof image === 'string' ? parseDataUrl(image) : image;
    if (parsed?.data && parsed?.mimeType) {
      currentUserParts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }
  }

  if (userInput) {
    currentUserParts.push({ text: userInput });
  } else if (image && currentUserParts.length === 1) {
    currentUserParts.push({ text: 'Por favor, examina esta imagen desde tu perspectiva filosófica.' });
  }

  if (currentUserParts.length > 0) {
    contents.push({
      role: 'user',
      parts: currentUserParts,
    });
  }

  return contents;
};

/**
 * Envía un mensaje a Gemini con soporte multimodal (texto + imagen) y sin estado (Stateless Multi-turn)
 */
export const sendMessage = async ({
  userInput,
  message,
  image = null,
  systemPrompt,
  history = [],
  philosopherId = 'filósofo',
  model = 'gemini-3.5-flash-lite',
}) => {
  const textToSend = (userInput || message || '').trim();
  if (!textToSend && !image) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  if (!systemPrompt) {
    console.warn(`[Gemini API] Advertencia: systemPrompt no provisto para ${philosopherId}.`);
  }

  const client = getClient();
  const contents = buildContentsPayload(history, textToSend, image);

  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt || undefined,
        temperature: 0.85,
        maxOutputTokens: 1000,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      throw new Error('La respuesta devuelta por Gemini estaba vacía.');
    }

    return reply;
  } catch (error) {
    console.error(`[Gemini API Error] Falló llamada para '${philosopherId}' con modelo '${model}':`, error);

    const errorMessage = error?.message || '';

    // Respaldo automático inmediato ante errores de saturación / no disponibilidad
    const isAvailabilityError =
      errorMessage.includes('503') ||
      errorMessage.includes('404') ||
      errorMessage.includes('UNAVAILABLE') ||
      errorMessage.includes('Unavailable') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('NotFound') ||
      errorMessage.includes('overloaded');

    if (model === 'gemini-3.5-flash-lite' && isAvailabilityError) {
      console.warn(`[Gemini Fallback] El modelo '${model}' falló (${errorMessage}). Reintentando con 'gemini-3.5-flash'...`);
      return sendMessage({
        userInput: textToSend,
        image,
        systemPrompt,
        history,
        philosopherId,
        model: 'gemini-3.5-flash',
      });
    }

    if (model === 'gemini-3.5-flash' && isAvailabilityError) {
      console.warn(`[Gemini Fallback Secundario] Reintentando con 'gemini-2.0-flash'...`);
      return sendMessage({
        userInput: textToSend,
        image,
        systemPrompt,
        history,
        philosopherId,
        model: 'gemini-2.0-flash',
      });
    }

    // Mapeo de errores amigables para la UI
    let userFriendlyMessage = 'Error al comunicarse con Gemini.';
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401') || errorMessage.includes('403')) {
      userFriendlyMessage = 'API Key inválida o sin permisos. Revisa tu VITE_GEMINI_API_KEY en .env.';
    } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
      userFriendlyMessage = 'Límite de cuota alcanzado (Error 429). Espera unos segundos e intenta nuevamente.';
    } else if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE')) {
      userFriendlyMessage = 'Servidor temporalmente sobrecargado (Error 503). Intenta de nuevo en unos momentos.';
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      userFriendlyMessage = `El modelo '${model}' no está disponible (Error 404).`;
    } else if (errorMessage) {
      userFriendlyMessage = `Error de Gemini: ${errorMessage}`;
    }

    const enhancedError = new Error(userFriendlyMessage);
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

export const sendPhilosophicalTurn = sendMessage;
