/**
 * Utilidades de Limpieza y Modulación Fonética para Síntesis de Voz
 */

/**
 * Limpia y modula el texto para una síntesis de voz natural, fluida y con pausas orgánicas:
 * - Elimina marcas de Markdown: asteriscos (** o *), almohadillas (#), guiones (-), comillas (`), enlaces y corchetes ([1], etc.).
 * - Añade micro-pausas sutiles en signos de puntuación (. , ; : ¿ ? ¡ !) para generar cadencia y respiración natural.
 * - Evita que la voz suene atropellada a velocidades altas.
 */
export const cleanTextForSpeech = (text = '') => {
  if (!text) return '';

  let cleaned = text
    // 1. Eliminar bloques de código markdown (```...```)
    .replace(/```[\s\S]*?```/g, ' ')
    // 2. Eliminar código inline (`...`)
    .replace(/`([^`]+)`/g, '$1')
    // 3. Convertir enlaces markdown [texto](url) en solo texto
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // 4. Eliminar referencias o citas tipo [1], [2], etc.
    .replace(/\[\d+\]/g, '')
    // 5. Eliminar encabezados (# Titulo)
    .replace(/^#{1,6}\s+/gm, '')
    // 6. Eliminar negritas, cursivas y tachados (**, *, __, _, ~~)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    // 7. Eliminar viñetas y listas (- item, * item, > cita)
    .replace(/^\s*[-*+>]\s+/gm, '')
    // 8. Normalizar signos de puntuación y espaciado
    .replace(/([.,;:¿?¡!])(?=[^\s\d])/g, '$1 ')
    .replace(/\s*([,;:])[ \t]*/g, '$1 ')
    .replace(/\s*([.?!])[ \t]+/g, '$1 ')
    // 9. Reemplazar múltiples signos sucesivos por uno solo
    .replace(/\.{2,}/g, '...')
    // 10. Convertir saltos de línea en pausas naturales
    .replace(/[\r\n]+/g, '. ')
    // 11. Eliminar espacios dobles y recortar
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
};
