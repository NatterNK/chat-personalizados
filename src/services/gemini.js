import { GoogleGenAI } from '@google/genai';

/**
 * Obtiene la API Key desde las variables de entorno de Vite
 */
export const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

/**
 * Directiva Canónica del Sparring Intelectual
 */
export const SPARRING_SYSTEM_PROMPT = `Eres un Sparring Intelectual y Compañero de Indagación reflexiva. Tu propósito es dialogar con el usuario sobre dudas existenciales, conceptos éticos, verdad, moral y naturaleza humana.

Reglas estrictas de comportamiento:
1. RIGOR SIN CONDESCENDENCIA: Nunca adules al usuario ni uses frases como 'brillante deducción', 'excelente pregunta' o 'tienes toda la razón'. Habla con franqueza, agudeza y calidez intelectual, como un par honesto.
2. MESA DE CONTRASTE: Cuando el usuario exprese una intuición o dilema, analiza su lógica. Menciona de forma orgánica qué pensador histórico reflexionó en esa misma línea (genealogía) y qué otro autor demolió o criticó esa postura (antítesis), sin adoptar tú una pose de teatro.
3. ACOMPAÑAMIENTO HUMANO: Comprende la angustia existencial y la incertidumbre. No reduzcas los dilemas humanos a meros algoritmos fríos ni apures conclusiones. Ayuda a distinguir cuándo un dilema es conceptual y cuándo es un exceso de autoexigencia o sobrecarga emocional.
4. CLARIDAD Y CONCRECIÓN: Aterriza las ideas abstractas en problemas del mundo real y dilemas cotidianos.`;

/**
 * Instancia del cliente SDK (stateless)
 */
let aiClient = null;

export const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('No se encontró la variable VITE_GEMINI_API_KEY en el entorno .env');
    console.error('[Gemini API] Error de configuración:', err.message);
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

    // Imagen adjunta previa
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
    currentUserParts.push({ text: 'Por favor, examina esta imagen desde tu perspectiva crítica y reflexiva.' });
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
 * Envía un mensaje al Sparring Intelectual con Gemini API
 * Compatible tanto con sintaxis de objeto como de argumentos posicionales
 */
export const sendMessage = async (arg1, arg2, arg3, arg4, arg5) => {
  let userInput = '';
  let image = null;
  let systemPrompt = SPARRING_SYSTEM_PROMPT;
  let history = [];
  let model = 'gemini-2.0-flash';

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    // Modo objeto: { userInput, message, image, systemPrompt, history, model }
    userInput = (arg1.userInput || arg1.message || '').trim();
    image = arg1.image || null;
    systemPrompt = arg1.systemPrompt || SPARRING_SYSTEM_PROMPT;
    history = arg1.history || [];
    model = arg1.model || 'gemini-2.0-flash';
  } else {
    // Modo posicional: (userInput, character, history, image, systemPromptAddendum)
    userInput = (typeof arg1 === 'string' ? arg1 : '').trim();
    history = Array.isArray(arg3) ? arg3 : [];
    image = arg4 || null;
    systemPrompt = arg5 ? `${SPARRING_SYSTEM_PROMPT}\n\n${arg5}` : SPARRING_SYSTEM_PROMPT;
  }

  if (!userInput && !image) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  const client = getClient();
  const contents = buildContentsPayload(history, userInput, image);

  const modelsToTry = [model, 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError = null;
  for (const m of uniqueModels) {
    try {
      const response = await client.models.generateContent({
        model: m,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.75,
          maxOutputTokens: 1200,
        },
      });

      const reply = response.text?.trim();
      if (reply) {
        return reply;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[Gemini API] Error con modelo '${m}':`, error.message || error);
    }
  }

  console.error('[Gemini API Error] Fallaron todos los modelos candidatos:', lastError);
  throw lastError || new Error('No se pudo obtener respuesta del Sparring Intelectual.');
};

/**
 * Inspector de Conceptos (Glosario Rápido)
 * Define un término filosófico/ético con estructura clara de 3 puntos
 */
export const inspectConcept = async (word = '') => {
  const cleanWord = word.trim();
  if (!cleanWord) {
    throw new Error('Debes ingresar una palabra o concepto para consultar.');
  }

  const client = getClient();
  const prompt = `Define el término '${cleanWord}' con claridad humana. Estructura:
1) Etimología y significado en 2 líneas.
2) Sentido filosófico/ético.
3) Un ejemplo cotidiano concreto.
Sin jerga innecesaria.`;

  const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          temperature: 0.5,
          maxOutputTokens: 700,
        },
      });

      const text = response.text?.trim();
      if (text) {
        return text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[inspectConcept] Error con modelo '${model}':`, err.message || err);
    }
  }

  throw lastError || new Error(`No fue posible consultar el concepto '${cleanWord}'.`);
};

export const sendPhilosophicalTurn = sendMessage;
