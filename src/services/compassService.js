import { GoogleGenAI } from '@google/genai';
import { characters, getCharacterById } from '../config/characters';
import { createCustomRoute } from '../config/routes';
import { saveRouteProgress } from './routeStorage';
import { getApiKey } from './gemini';

/**
 * 1. Inyección del Catálogo Completo de Personajes
 * Extrae id, name, focus, category y epoch para enviar a Gemini
 */
export const getCatalogSummary = () => {
  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    focus: c.title || c.thematicAngles?.why || c.quote || '',
    category: c.category,
    epoch: c.era || c.epoch || '',
  }));
};

/**
 * Limpia bloques de código Markdown ```json ... ``` o extrae el bloque JSON más externo
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

  // Buscar el primer '{' y el último '}' para extraer únicamente el JSON válido
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
};

/**
 * Valida y resuelve el personaje exacto o más cercano en el catálogo
 */
const resolveCharacter = (charId) => {
  if (!charId) return characters[0];

  // Búsqueda directa por ID
  const direct = characters.find((c) => c && c.id === charId);
  if (direct) return direct;

  // Búsqueda por getCharacterById (incluye alias como kant -> immanuel_kant)
  const byAlias = getCharacterById(charId);
  if (byAlias && byAlias.id !== characters[0].id) {
    return byAlias;
  }

  // Búsqueda aproximada por coincidencia de nombre o id normalizado
  const normId = charId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = characters.find((c) => {
    const cNorm = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      cNorm.includes(normId) ||
      normId.includes(cNorm) ||
      nameNorm.includes(normId) ||
      normId.includes(nameNorm)
    );
  });

  return found || byAlias || characters[0];
};

/**
 * 2. Generación Dinámica de Rutas Dialécticas con Gemini API (gemini-2.0-flash)
 */
export const generateDialecticRoute = async (userTopic) => {
  const cleanTopic = userTopic?.trim() || 'Concepto Universal';

  // Log de Diagnóstico Obligatorio
  console.log('[Brújula] Iniciando generación de ruta para el tema:', cleanTopic);

  const catalog = getCatalogSummary();

  const prompt = `Tema solicitado por el usuario: "${cleanTopic}"

Catálogo disponible de pensadores en la app:
${JSON.stringify(catalog, null, 2)}

INSTRUCCIÓN:
Actúa como un curador filosófico de élite. Analiza la especificidad del tema "${cleanTopic}".
- Si el tema es 'Dignidad en política / rol del Estado / leyes', NO selecciones a los filósofos de introspección moral si tienes disponibles a filósofos políticos (ej. Hannah Arendt, Aristóteles, Karl Marx, Foucault, Simone Weil).
- Si el tema es sobre ciencia/mente, selecciona filósofos de la ciencia o epistemólogos.
- Si el tema es existencial/amor, selecciona pensadores del amor, ética o existencia.

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
      console.error('[Brújula Error]: Falta API Key.', missingKeyError);
      throw missingKeyError;
    }

    const client = new GoogleGenAI({ apiKey });

    // Modelos a intentar en orden de preferencia (gemini-2.0-flash como principal)
    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let rawText = '';
    let lastModelError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[Brújula] Enviando solicitud a Gemini con modelo '${model}'...`);
        const response = await client.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          config: {
            temperature: 0.65,
            responseMimeType: 'application/json',
          },
        });

        rawText = response.text?.trim() || '';
        if (rawText) {
          console.log(`[Brújula] Respuesta recibida exitosamente de modelo '${model}'.`);
          break;
        }
      } catch (err) {
        lastModelError = err;
        console.warn(`[Brújula] Modelo '${model}' falló:`, err.message || err);
      }
    }

    if (!rawText) {
      throw lastModelError || new Error('Gemini no devolvió texto en la respuesta.');
    }

    // 3. Parseo Seguro y Verificación
    const cleanedJson = cleanJsonText(rawText);
    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error('[Brújula Error]: Error al parsear JSON devuelto por Gemini. Texto bruto:', rawText, parseErr);
      throw parseErr;
    }

    if (!parsed || !parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      const shapeError = new Error('Estructura de JSON inválida: falta el arreglo "steps".');
      console.error('[Brújula Error]:', shapeError, parsed);
      throw shapeError;
    }

    // Mapeo y validación de los 4 personajes contra el catálogo
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

    // Garantizar exactamente 4 etapas
    while (mappedSteps.length < 4) {
      const idx = mappedSteps.length;
      const fallbackList = [
        { id: 'socrates', role: 'Aporía Inicial' },
        { id: 'platon', role: 'Estructura Teórica' },
        { id: 'immanuel_kant', role: 'Límites Críticos' },
        { id: 'jean_paul_sartre', role: 'Aterrizaje Práctico' },
      ];
      const fb = fallbackList[idx];
      const char = resolveCharacter(fb.id);
      mappedSteps.push({
        stepNumber: idx + 1,
        characterId: char.id,
        characterName: char.name,
        stageTitle: `Etapa ${idx + 1}: ${fb.role}`,
        role: fb.role,
        mission: `Indaga el concepto de "${cleanTopic}".`,
        systemPromptAddendum: `Estás en la Etapa ${idx + 1} sobre "${cleanTopic}".`,
        initialGreeting: `Soy ${char.name}. Examinemos "${cleanTopic}".`,
      });
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

    // Guardar en localStorage ('saved_dialectic_routes')
    saveRouteProgress(dynamicRoute);

    console.log(
      '[Brújula] Ruta generada exitosamente:',
      dynamicRoute.title,
      '-> Pensadores elegidos:',
      dynamicRoute.steps.map((s) => s.characterName).join(' ➔ ')
    );

    return dynamicRoute;
  } catch (error) {
    console.error('[Brújula Error]: Falló la generación dinámica con Gemini:', error);

    // Respaldo de seguridad para que la aplicación continúe funcionando
    console.warn('[Brújula] Activando generador de respaldo para el tema:', cleanTopic);
    const fallbackRoute = createCustomRoute(cleanTopic);
    saveRouteProgress(fallbackRoute);
    return fallbackRoute;
  }
};
