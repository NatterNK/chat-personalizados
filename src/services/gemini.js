import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Obtiene la API Key desde las variables de entorno de Vite
 */
export const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

/**
 * Identificador canónico del modelo Gemini
 * Sin prefijo "models/", únicamente la cadena limpia
 */
export const GEMINI_MODEL_NAME = 'gemini-3.5-flash-lite';

/**
 * Directiva Canónica del Sparring Intelectual
 */
export const SPARRING_SYSTEM_PROMPT = `Eres un Sparring Intelectual y Compañero de Indagación reflexiva. Dialogas con el usuario sobre dudas existenciales, ética, moral y sentido.

REGLAS DE INTERACCIÓN Y ECONOMÍA VERBAL (OBLIGATORIAS):
1. PROPORCIONALIDAD Y BREVEDAD: 
   - No des conferencias ni escribas ensayos. Si el usuario te escribe 1 o 2 frases, tu réplica NO debe superar 2 o 3 párrafos breves (alrededor de 150-180 palabras en total).
   - Elimina introducciones retóricas ('Entiendo lo que planteas', 'Es una cuestión fascinante') y cierres redundantes. Entra directo a la médula en la primera frase.

2. PRECISIÓN Y CONTRASTE AFILADO:
   - Encuentra la palabra conceptual exacta (ej. aporía, utilitarismo, mala fe, phrónesis).
   - Muestra el contrapunto en una o dos frases: señala qué pensador vio el problema como el usuario y cuál lo demolió, sin contar la biografía del autor.

3. DIÁLOGO ACTIVO (PING-PONG):
   - Esto es una conversación íntima de café, no un monólogo. Expon la tensión de la idea y devuelve el turno al usuario cerrando con UNA sola pregunta incisiva que ponga a prueba el límite de su premisa.

4. SIN ADULACIÓN:
   - Mantén el tono honesto, cercano y crítico. No valides por cortesía ni des la razón automáticamente.`;

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
 * Ejecutor unificado de peticiones a Gemini API
 * Utiliza @google/generative-ai con fallback a REST API directo
 * Imprime el endpoint exacto en caso de error para facilitar la depuración
 */
const executeGeminiRequest = async ({
  contents,
  systemPrompt,
  modelName = GEMINI_MODEL_NAME,
  temperature = 0.75,
  maxOutputTokens = 1200,
}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('No se encontró la variable VITE_GEMINI_API_KEY en el archivo .env');
    console.error('[Gemini API] Error de configuración:', err.message);
    throw err;
  }

  // Endpoint REST canónico de v1beta
  const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // 1. Intento primario con SDK oficial @google/generative-ai
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt || undefined,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    });

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const text = response.text()?.trim();

    if (text) {
      return text;
    }
  } catch (sdkError) {
    console.warn(`[Gemini SDK Error] Falló llamada con @google/generative-ai (${modelName}):`, sdkError.message || sdkError);
    console.warn(`[Gemini Fallback] Intentando vía REST API directa al endpoint: https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`);
  }

  // 2. Intento de respaldo directo vía REST API (fetch)
  try {
    const bodyPayload = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };

    if (systemPrompt) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const restResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!restResponse.ok) {
      const errorBody = await restResponse.text();
      const status = restResponse.status;
      const errorMsg = `Error HTTP ${status} al consultar endpoint: https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=[HIDDEN]. Detalle: ${errorBody}`;
      console.error('[Gemini API Error] Falló respuesta HTTP del endpoint:', endpointUrl, 'Status:', status, 'Detalle:', errorBody);
      throw new Error(errorMsg);
    }

    const json = await restResponse.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (candidateText) {
      return candidateText;
    }

    throw new Error('La respuesta devuelta por la REST API de Gemini estaba vacía.');
  } catch (restError) {
    console.error(`[Gemini API Error] Endpoint exacto consultado: ${endpointUrl}`);
    console.error('[Gemini API Error] Detalle del fallo:', restError);
    throw restError;
  }
};

/**
 * Envía un mensaje al Sparring Intelectual con Gemini API
 * Modelo: "gemini-3.5-flash-lite" (sin prefijo "models/")
 */
export const sendMessage = async (arg1, arg2, arg3, arg4, arg5) => {
  let userInput = '';
  let image = null;
  let systemPrompt = SPARRING_SYSTEM_PROMPT;
  let history = [];
  let model = GEMINI_MODEL_NAME;

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    // Modo objeto: { userInput, message, image, systemPrompt, history, model }
    userInput = (arg1.userInput || arg1.message || '').trim();
    image = arg1.image || null;
    systemPrompt = arg1.systemPrompt || SPARRING_SYSTEM_PROMPT;
    history = arg1.history || [];
    model = (arg1.model || GEMINI_MODEL_NAME).replace(/^models\//, '');
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

  const contents = buildContentsPayload(history, userInput, image);

  return await executeGeminiRequest({
    contents,
    systemPrompt,
    modelName: model,
    temperature: 0.75,
    maxOutputTokens: 1200,
  });
};

/**
 * Inspector de Conceptos (Glosario Rápido)
 * Define un término filosófico/ético con estructura clara de 3 puntos
 * Modelo: "gemini-3.5-flash-lite"
 */
export const inspectConcept = async (word = '') => {
  const cleanWord = word.trim();
  if (!cleanWord) {
    throw new Error('Debes ingresar una palabra o concepto para consultar.');
  }

  const prompt = `Define el término '${cleanWord}' con claridad humana. Estructura:
1) Etimología y significado en 2 líneas.
2) Sentido filosófico/ético.
3) Un ejemplo cotidiano concreto.
Sin jerga innecesaria.`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  return await executeGeminiRequest({
    contents,
    modelName: GEMINI_MODEL_NAME,
    temperature: 0.5,
    maxOutputTokens: 700,
  });
};

export const sendPhilosophicalTurn = sendMessage;
