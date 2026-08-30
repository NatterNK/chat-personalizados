import { GoogleGenAI } from '@google/genai';
import { characters, getCharacterById } from '../config/characters';
import { createCustomRoute } from '../config/routes';
import { saveRouteProgress } from './routeStorage';
import { getApiKey } from './gemini';

/**
 * 1. Inyección del Catálogo Completo de Personajes
 * Construye un extracto liviano con ID, nombre, categoría, época, foco y resumen para el prompt
 */
export const getCatalogSummary = () => {
  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    epoch: c.era || c.epoch || '',
    focus: c.title || c.thematicAngles?.why || '',
    systemPromptSummary: c.systemPrompt?.slice(0, 180) || c.quote || '',
  }));
};

/**
 * Limpia bloques de código Markdown ```json ... ``` de la respuesta
 */
const cleanJsonText = (text) => {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
};

/**
 * Encuentra el personaje más afín si el ID devuelto por la IA no coincide exactamente
 */
const resolveClosestCharacter = (charId, fallbackCategory = 'filosofos') => {
  if (!charId) return characters[0];
  const exact = getCharacterById(charId);
  if (exact) return exact;

  const normalized = charId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const partial = characters.find((c) => {
    const cNorm = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      cNorm.includes(normalized) ||
      normalized.includes(cNorm) ||
      nameNorm.includes(normalized) ||
      normalized.includes(nameNorm)
    );
  });
  if (partial) return partial;

  const categoryFallback = characters.find((c) => c.category === fallbackCategory);
  return categoryFallback || characters[0];
};

/**
 * 2. Generación Dinámica e Inteligente de Rutas Dialécticas con Gemini
 * Prompt estructurado para selección semántica y progresión pedagógica en 4 etapas
 */
export const generateDialecticRoute = async (userTopic) => {
  const cleanTopic = userTopic?.trim() || 'Concepto Universal';
  const catalogSummary = getCatalogSummary();

  const systemInstruction = `Eres el Curador Filosófico del Dojo Dialéctico. Tu tarea es diseñar una ruta de aprendizaje personalizada de 4 etapas para el tema o dilema: "${cleanTopic}".
Debes seleccionar EXACTAMENTE 4 personajes del siguiente catálogo disponible:
${JSON.stringify(catalogSummary, null, 2)}

Criterios de selección y progresión pedagógica:
- Etapa 1 (Aporía / Cuestionamiento): Un pensador que rompa supuestos sobre "${cleanTopic}".
- Etapa 2 (Fundamentación / Estructura): Un pensador que construya el marco teórico central.
- Etapa 3 (Tensión Crítica / Antítesis): Un pensador que ataque o complique el problema desde otro ángulo (ej. político vs ético, material vs ideal).
- Etapa 4 (Síntesis / Perspectiva Contemporánea): Un pensador que aterrice el dilema en la acción o existencia.

Responde EXCLUSIVAMENTE con un JSON válido con esta estructura exacta:
{
  "title": "Título evocador de la ruta (ej. 'El Descenso hacia la Dignidad Política')",
  "description": "Breve resumen de 2 líneas de la ruta",
  "steps": [
    {
      "characterId": "id_exacto_del_catalogo",
      "stageName": "Nombre de la etapa (ej. 'Demolición Institucional')",
      "mission": "Misión dialéctica específica para el usuario sobre ${cleanTopic} frente a este pensador",
      "recommendedFirstQuestion": "Pregunta de apertura recomendada para iniciar el chat"
    }
  ]
}`;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('[compassService] Sin API Key en el entorno, utilizando generador heurístico.');
      const fallbackRoute = createCustomRoute(cleanTopic);
      saveRouteProgress(fallbackRoute);
      return fallbackRoute;
    }

    const client = new GoogleGenAI({ apiKey });

    let rawText = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Por favor diseña la ruta dialéctica de 4 etapas para el tema o dilema: "${cleanTopic}".`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        });
        rawText = response.text?.trim() || '';
        if (rawText) break;
      } catch (err) {
        console.warn(`[compassService] Modelo ${model} falló (${err.message}). Reintentando siguiente modelo...`);
      }
    }

    if (!rawText) {
      throw new Error('Gemini no devolvió respuesta');
    }

    const cleanedJson = cleanJsonText(rawText);
    const parsed = JSON.parse(cleanedJson);

    if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error('Estructura de pasos inválida en el JSON devuelto');
    }

    // 3. Validación y Mapeo Canónico de Personajes
    const timestamp = Date.now();
    const routeId = `route-${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
    const mappedSteps = parsed.steps.slice(0, 4).map((step, index) => {
      const char = resolveClosestCharacter(step.characterId);
      const stageName = step.stageName || `Etapa ${index + 1}`;
      const mission = step.mission || `Examina "${cleanTopic}" a la luz del pensamiento crítico.`;
      const firstQ = step.recommendedFirstQuestion || `¿Cómo abordamos el problema de "${cleanTopic}"?`;

      return {
        stepNumber: index + 1,
        characterId: char.id,
        characterName: char.name,
        stageTitle: `Etapa ${index + 1}: ${stageName}`,
        role: stageName,
        mission,
        systemPromptAddendum: `Estás en la Etapa ${index + 1} de la Forja sobre "${cleanTopic}". Tu rol en este debate es: ${stageName}. Misión específica: ${mission}. Conduce el examen con agudeza y fidelidad a tu sistema filosófico.`,
        initialGreeting: `Soy ${char.name}. ${firstQ}`,
      };
    });

    // Rellenar si devolvió menos de 4
    while (mappedSteps.length < 4) {
      const idx = mappedSteps.length;
      const fallbackTemplates = [
        { id: 'socrates', role: 'Aporía Inicial' },
        { id: 'platon', role: 'Estructura Universal' },
        { id: 'immanuel_kant', role: 'Límites Epistémicos' },
        { id: 'jean_paul_sartre', role: 'Compromiso Existencial' },
      ];
      const t = fallbackTemplates[idx];
      const char = getCharacterById(t.id) || characters[0];
      mappedSteps.push({
        stepNumber: idx + 1,
        characterId: char.id,
        characterName: char.name,
        stageTitle: `Etapa ${idx + 1}: ${t.role}`,
        role: t.role,
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

    // Guardar directamente en localStorage para persistencia
    saveRouteProgress(dynamicRoute);
    return dynamicRoute;
  } catch (error) {
    console.error('[compassService] Error generando ruta con Gemini, activando fallback heurístico:', error);
    const fallbackRoute = createCustomRoute(cleanTopic);
    saveRouteProgress(fallbackRoute);
    return fallbackRoute;
  }
};
