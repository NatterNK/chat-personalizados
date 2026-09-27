import { GoogleGenerativeAI } from '@google/generative-ai';
import { characters, getCharacterById, ID_ALIASES } from '../config/characters';
import { saveRouteProgress } from './routeStorage';
import { getApiKey } from './gemini';

/**
 * 1. Inyección del Catálogo Completo de Personajes
 * Extrae id, name, category, epoch y focus para enviar a Gemini
 */
export const getCatalogSummary = () => {
  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    epoch: c.era || c.epoch || '',
    focus: c.title || c.thematicAngles?.why || c.quote || '',
  }));
};

/**
 * Limpia bloques de código Markdown ```json ... ``` y extrae el bloque JSON más externo
 */
const cleanJsonText = (text) => {
  if (!text) return '';
  let cleaned = text.trim();

  // Eliminar delimitadores de bloque de código Markdown
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Extraer el substring delimitado por la primera '{' y la última '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
};

/**
 * Valida y resuelve el personaje exacto en el catálogo de personajes
 */
const resolveCharacter = (charId) => {
  if (!charId) {
    throw new Error('El paso generado no contiene un characterId válido.');
  }

  const cleanId = String(charId).toLowerCase().trim();

  // 1. Búsqueda directa por ID exacto
  const direct = characters.find((c) => c && c.id === cleanId);
  if (direct) return direct;

  // 2. Búsqueda por alias conocido (ej. 'kant' -> 'immanuel_kant', 'sartre' -> 'jean_paul_sartre')
  const canonicalId = ID_ALIASES?.[cleanId];
  if (canonicalId) {
    const aliased = characters.find((c) => c && c.id === canonicalId);
    if (aliased) return aliased;
  }

  // 3. Búsqueda por coincidencia aproximada de ID o nombre
  const normId = cleanId.replace(/[^a-z0-9]/g, '');
  const found = characters.find((c) => {
    const cNorm = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    return (
      cNorm.includes(normId) ||
      normId.includes(cNorm) ||
      nameNorm.includes(normId) ||
      normId.includes(nameNorm)
    );
  });

  if (found) return found;

  const fallback = getCharacterById(cleanId);
  if (fallback) return fallback;

  throw new Error(`El personaje '${charId}' devuelto por la IA no existe en el catálogo.`);
};

/**
 * 2. Generación Dinámica de Rutas Dialécticas con Gemini API (Modelo gemini-2.0-flash)
 */
export const generateDialecticRoute = async (userTopic) => {
  const cleanTopic = userTopic?.trim();
  if (!cleanTopic) {
    const emptyErr = new Error('Debes ingresar un tema o dilema para forjar la ruta.');
    console.error('[Brújula Error]:', emptyErr);
    throw emptyErr;
  }

  console.log('[Brújula] Iniciando generación de ruta para el tema:', cleanTopic);

  const catalog = getCatalogSummary();

  const prompt = `Tema solicitado por el usuario: "${cleanTopic}"

Catálogo disponible de pensadores en la app:
${JSON.stringify(catalog, null, 2)}

INSTRUCCIÓN:
Actúa como un curador filosófico de élite. Analiza la especificidad del tema "${cleanTopic}".
- Si el tema es 'Dignidad en política / rol del Estado / leyes', NO selecciones a los filósofos de introspección moral si tienes disponibles a filósofos políticos (ej. Hannah Arendt, Aristóteles, Karl Marx, Foucault, Simone Weil).
- Si el tema es sobre ciencia/mente/lógica, selecciona filósofos de la ciencia, epistemólogos o matemáticos (ej. Turing, Gödel, Einstein, Feynman, Jung, Wittgenstein).
- Si el tema es existencial/amor/sentido, selecciona pensadores del amor, ética o existencia (ej. Sartre, Beauvoir, Camus, Nietzsche, Spinoza, Schopenhauer, Nussbaum).
- Si el tema es sobre 'feminismo / género / opresión', selecciona a Simone de Beauvoir, Hannah Arendt, Simone Weil, Philippa Foot, Martha Nussbaum, etc.
- Si el tema es sobre 'felicidad / bienestar / dolor', selecciona a Aristóteles, Spinoza, Schopenhauer, Camus, Marcus Aurelius, etc.

Debes seleccionar EXACTAMENTE 4 personajes del catálogo que mejor aborden este matiz específico y ordenarlos en 4 etapas:
1. Aporía/Punto de quiebre
2. Estructura y fundamentación
3. Tensión y contrapunto crítico
4. Síntesis o aterrizaje práctico

Responde ÚNICAMENTE un bloque JSON válido (sin texto adicional fuera del JSON):
{
  "title": "Título temático único para '${cleanTopic}'",
  "description": "Descripción de 2 líneas sobre cómo esta ruta aborda '${cleanTopic}'",
  "steps": [
    {
      "characterId": "id_del_catalogo",
      "stageName": "Nombre de la etapa",
      "mission": "Misión específica sobre '${cleanTopic}'",
      "recommendedFirstQuestion": "Pregunta inicial precisa para abrir el debate sobre '${cleanTopic}'"
    }
  ]
}`;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      const missingKeyError = new Error('No se encontró la variable VITE_GEMINI_API_KEY en el entorno .env');
      console.error('[Brújula Error]:', missingKeyError);
      throw missingKeyError;
    }

    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    let rawText = '';

    // Intento con SDK
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.6,
          responseMimeType: 'application/json',
        },
      });

      const response = await model.generateContent(prompt);
      const result = await response.response;
      rawText = result.text()?.trim() || '';
    } catch (sdkErr) {
      console.warn('[Brújula SDK Warning] Falló SDK, intentando REST API directa:', sdkErr.message || sdkErr);
    }

    // Fallback REST directo
    if (!rawText) {
      try {
        const restRes = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.6,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!restRes.ok) {
          const detail = await restRes.text();
          console.error('[Brújula API Error] Endpoint exacto consultado:', endpointUrl, 'Status:', restRes.status, 'Detalle:', detail);
          throw new Error(`HTTP ${restRes.status}: ${detail}`);
        }

        const json = await restRes.json();
        rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      } catch (restErr) {
        console.error('[Brújula Error] Falló consulta al endpoint:', endpointUrl, restErr);
        throw restErr;
      }
    }

    if (!rawText) {
      throw new Error('Gemini no devolvió texto en la respuesta.');
    }

    // 3. Parseo Seguro y Verificación de JSON
    const cleanedJson = cleanJsonText(rawText);
    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error('[Brújula Error]: Falló el parseo del JSON devuelto por Gemini. Respuesta bruta:', rawText, parseErr);
      throw new Error(`La respuesta de Gemini no tiene formato JSON válido: ${parseErr.message}`);
    }

    if (!parsed || !parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      const structureErr = new Error('El JSON de la ruta no contiene el arreglo "steps" esperado.');
      console.error('[Brújula Error]:', structureErr, parsed);
      throw structureErr;
    }

    const timestamp = Date.now();
    const routeId = `route-${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;

    const mappedSteps = parsed.steps.slice(0, 4).map((step, index) => {
      const char = resolveCharacter(step.characterId);
      const stageName = step.stageName || `Etapa ${index + 1}`;
      const mission = step.mission || `Examina "${cleanTopic}" a la luz del pensamiento crítico de ${char.name}.`;
      const firstQuestion = step.recommendedFirstQuestion || `¿Cómo abordamos el problema de "${cleanTopic}"?`;

      return {
        stepNumber: index + 1,
        characterId: char.id,
        characterName: char.name,
        stageTitle: `Etapa ${index + 1}: ${stageName}`,
        role: stageName,
        mission,
        systemPromptAddendum: `Estás en la Etapa ${index + 1} de la Forja sobre "${cleanTopic}". Tu rol en este debate es: ${stageName}. Misión específica: ${mission}. Conduce el examen con agudeza, rigor y máxima fidelidad a tu sistema filosófico.`,
        initialGreeting: `Soy ${char.name}. ${firstQuestion}`,
      };
    });

    if (mappedSteps.length < 4) {
      const stepCountErr = new Error(`Gemini devolvió ${mappedSteps.length} pasos en lugar de 4.`);
      console.error('[Brújula Error]:', stepCountErr);
      throw stepCountErr;
    }

    const dynamicRoute = {
      id: routeId,
      isCustom: true,
      topic: cleanTopic,
      concept: cleanTopic,
      title: parsed.title || `El Descenso hacia ${cleanTopic}`,
      description: parsed.description || `Ruta dialéctica personalizada de 4 etapas para examinar "${cleanTopic}".`,
      icon: '🔮',
      tag: 'Forja IA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStepIndex: 0,
      completedSteps: [],
      messagesByStep: {},
      isCompleted: false,
      steps: mappedSteps,
    };

    saveRouteProgress(dynamicRoute);

    console.log(
      '[Brújula] Ruta generada exitosamente:',
      dynamicRoute.title,
      '-> Pensadores elegidos:',
      dynamicRoute.steps.map((s) => s.characterName).join(' ➔ ')
    );

    return dynamicRoute;
  } catch (error) {
    console.error('[Brújula Error]:', error);
    throw error;
  }
};
