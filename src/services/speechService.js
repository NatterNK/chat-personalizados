import { cleanTextForSpeech } from './speechUtils';

export { cleanTextForSpeech };

export const SPEECH_SETTINGS_KEY = 'speech_settings';

const DEFAULT_SETTINGS = {
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  autoSpeak: false,
};

/**
 * Comprueba si la Web Speech API (síntesis) está soportada en el navegador
 */
export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

/**
 * Obtiene la configuración de voz persistente en localStorage
 */
export const getSpeechSettings = () => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SPEECH_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('[speechService] Error leyendo speech_settings:', e);
  }
  return DEFAULT_SETTINGS;
};

/**
 * Guarda la configuración de voz en localStorage
 */
export const saveSpeechSettings = (settings) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getSpeechSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SPEECH_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('[speechService] Error guardando speech_settings:', e);
  }
};

let cachedVoices = [];

const updateVoicesCache = () => {
  if (!isSpeechSynthesisSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
};

if (typeof window !== 'undefined' && isSpeechSynthesisSupported()) {
  updateVoicesCache();
  window.speechSynthesis.onvoiceschanged = () => {
    updateVoicesCache();
  };
}

/**
 * Retorna todas las voces disponibles en el navegador
 */
export const getAllVoices = () => {
  if (cachedVoices.length > 0) return cachedVoices;
  return updateVoicesCache();
};

/**
 * Retorna únicamente las voces en español ('es-', 'es-ES', 'es-MX', etc.)
 */
export const getSpanishVoices = () => {
  const allVoices = getAllVoices();
  const esVoices = allVoices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
  return esVoices.length > 0 ? esVoices : allVoices;
};

/**
 * Encuentra la mejor voz disponible según configuración guardada o por defecto
 */
export const getActiveVoice = (voiceURI = null) => {
  const spanish = getSpanishVoices();
  if (spanish.length === 0) return null;

  const targetURI = voiceURI || getSpeechSettings().voiceURI;

  if (targetURI) {
    const match = spanish.find((v) => v.voiceURI === targetURI || v.name === targetURI);
    if (match) return match;
  }

  // Si no hay seleccionada, priorizar voces que contengan 'natural', 'neural' o 'google'
  const natural = spanish.find((v) => {
    const n = v.name.toLowerCase();
    return n.includes('natural') || n.includes('neural') || n.includes('google');
  });
  if (natural) return natural;

  // Si no, la primera disponible en español
  return spanish[0];
};

/**
 * Cancela de inmediato cualquier locución en curso
 */
export const cancelSpeech = () => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[speechService] Error cancelando locución:', e);
    }
  }
};

/**
 * Sintetiza un texto a voz utilizando Web Speech API con limpieza de Markdown y parámetros configurados
 */
export const speakText = (
  text = '',
  {
    onStart = () => {},
    onEnd = () => {},
    onError = () => {},
    customSettings = null,
  } = {}
) => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('[speechService] SpeechSynthesis no soportado en este navegador.');
    return null;
  }

  // Cancelar locución previa
  cancelSpeech();

  // Limpiar texto para evitar que se pronuncien símbolos de Markdown o código
  const clean = cleanTextForSpeech(text);
  if (!clean) {
    onEnd();
    return null;
  }

  const settings = customSettings || getSpeechSettings();
  const utterance = new SpeechSynthesisUtterance(clean);

  utterance.rate = Math.max(0.5, Math.min(2.0, settings.rate || 1.0));
  utterance.pitch = Math.max(0.5, Math.min(2.0, settings.pitch || 1.0));

  const selectedVoice = getActiveVoice(settings.voiceURI);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang || 'es-ES';
  } else {
    utterance.lang = 'es-ES';
  }

  utterance.onstart = () => {
    onStart();
  };

  utterance.onend = () => {
    onEnd();
  };

  utterance.onerror = (event) => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') {
      console.warn('[speechService] Error en síntesis de voz:', event.error);
      onError(event);
    } else {
      onEnd();
    }
  };

  try {
    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (e) {
    console.error('[speechService] Excepción al invocar window.speechSynthesis.speak:', e);
    onError(e);
    return null;
  }
};
