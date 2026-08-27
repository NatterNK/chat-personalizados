import { cleanTextForSpeech } from './speechUtils';

export { cleanTextForSpeech };

// ==========================================
// 1. RECONOCIMIENTO DE VOZ (STT)
// ==========================================

export const isSpeechRecognitionSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

/**
 * Clase controladora para gestionar el ciclo de vida del reconocimiento de voz
 */
export class SpeechRecognizer {
  constructor({
    lang = 'es-ES',
    onStart = () => {},
    onInterim = () => {},
    onResult = () => {},
    onError = () => {},
    onEnd = () => {},
  } = {}) {
    this.lang = lang;
    this.onStart = onStart;
    this.onInterim = onInterim;
    this.onResult = onResult;
    this.onError = onError;
    this.onEnd = onEnd;

    this.recognition = null;
    this.isListening = false;
    this.accumulatedFinalText = '';

    this._init();
  }

  _init() {
    if (!isSpeechRecognitionSupported()) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();

    this.recognition.lang = this.lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.accumulatedFinalText = '';
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentFinal += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (currentFinal) {
        this.accumulatedFinalText += currentFinal;
      }

      // Notificar resultado intermedio y acumulado en tiempo real
      this.onInterim(interimTranscript.trim(), this.accumulatedFinalText.trim());
    };

    this.recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('SpeechRecognition Error:', event.error);
      }
      this.isListening = false;
      this.onError(event.error);
    };

    this.recognition.onend = () => {
      const wasListening = this.isListening;
      this.isListening = false;

      const finalText = this.accumulatedFinalText.trim();
      if (finalText) {
        this.onResult(finalText);
      }
      this.accumulatedFinalText = '';

      if (wasListening) {
        this.onEnd();
      }
    };
  }

  setLanguage(lang) {
    this.lang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  start() {
    if (!this.recognition) return;
    if (this.isListening) return;

    try {
      this.accumulatedFinalText = '';
      this.recognition.start();
    } catch (err) {
      console.warn('Error al iniciar SpeechRecognition:', err);
    }
  }

  stop() {
    if (!this.recognition) return;
    try {
      this.isListening = false;
      this.recognition.stop();
    } catch (err) {
      console.warn('Error al detener SpeechRecognition:', err);
    }
  }

  abort() {
    if (!this.recognition) return;
    try {
      this.isListening = false;
      this.accumulatedFinalText = '';
      this.recognition.abort();
    } catch (err) {
      console.warn('Error al abortar SpeechRecognition:', err);
    }
  }
}

// ==========================================
// 2. PREFERENCIAS PERSISTENTES DE VOZ
// ==========================================

export const getSavedVoicePref = (characterId) => {
  if (!characterId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`voice_pref_${characterId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export const saveVoicePref = (characterId, pref) => {
  if (!characterId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`voice_pref_${characterId}`, JSON.stringify(pref));
  } catch (err) {
    console.warn('[Storage] Error al guardar preferencia de voz:', err);
  }
};

export const clearVoicePref = (characterId) => {
  if (!characterId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`voice_pref_${characterId}`);
  } catch (err) {}
};

/**
 * Aplica una preferencia de voz a todos los pensadores de un género específico
 */
export const applyVoicePrefToAllOfGender = (gender, pref, charactersList = []) => {
  if (!gender || !pref || typeof window === 'undefined' || !Array.isArray(charactersList)) return;
  const targetChars = charactersList.filter((c) => c && c.gender === gender);
  targetChars.forEach((c) => {
    saveVoicePref(c.id, pref);
  });
};

// ==========================================
// 3. SÍNTESIS DE VOZ (TTS) & VOCES NEURONALES
// ==========================================

export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
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
 * Obtiene la lista de voces cargadas en el navegador
 */
export const getAvailableVoices = () => {
  if (cachedVoices.length > 0) return cachedVoices;
  return updateVoicesCache();
};

/**
 * Obtiene solo las voces en español disponibles
 */
export const getSpanishVoices = () => {
  const allVoices = getAvailableVoices();
  const es = allVoices.filter((v) => v.lang.toLowerCase().startsWith('es'));
  return es.length > 0 ? es : allVoices;
};

const FEMALE_VOICE_KEYWORDS = [
  'elena', 'marta', 'lucia', 'paloma', 'paulina', 'sabina', 'laura', 'monica',
  'victoria', 'carmen', 'soledad', 'francisca', 'mia', 'sofia', 'dalia', 'female', 'mujer', 'zira'
];

const MALE_VOICE_KEYWORDS = [
  'jorge', 'tomas', 'gonzalo', 'alonso', 'manuel', 'raul', 'carlos', 'diego',
  'miguel', 'alvaro', 'pablo', 'saul', 'enrique', 'antonio', 'luis', 'julio', 'male', 'hombre', 'david'
];

/**
 * Selecciona de forma inteligente la mejor voz neuronal disponible en español
 * según el género y preferencias configuradas para el pensador
 */
export const getBestVoice = (character = null, preferredLang = 'es-ES') => {
  const voices = getAvailableVoices();
  if (!voices || voices.length === 0) return null;

  // 0. Si el usuario configuró una voz manual específica en localStorage, usarla primero
  if (character?.id) {
    const savedPref = getSavedVoicePref(character.id);
    if (savedPref?.voiceURI || savedPref?.voiceName) {
      const manualMatch = voices.find(
        (v) => (savedPref.voiceURI && v.voiceURI === savedPref.voiceURI) || (savedPref.voiceName && v.name === savedPref.voiceName)
      );
      if (manualMatch) return manualMatch;
    }
  }

  // Filtrar voces en español
  const spanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
  const candidatePool = spanishVoices.length > 0 ? spanishVoices : voices;

  const targetGender = character?.gender || character?.voiceSettings?.gender || 'male';
  const preferredNames = character?.preferredVoices || character?.voiceSettings?.preferredVoices || [];

  const isNaturalOrOnline = (voiceName) => {
    const vLower = voiceName.toLowerCase();
    return vLower.includes('natural') || vLower.includes('online') || vLower.includes('neural') || vLower.includes('google');
  };

  const matchesPreferredName = (voiceName) => {
    const vLower = voiceName.toLowerCase();
    return preferredNames.some((pref) => vLower.includes(pref.toLowerCase()));
  };

  const isFemaleVoice = (voiceName) => {
    const vLower = voiceName.toLowerCase();
    return FEMALE_VOICE_KEYWORDS.some((kw) => vLower.includes(kw));
  };

  const isMaleVoice = (voiceName) => {
    const vLower = voiceName.toLowerCase();
    return MALE_VOICE_KEYWORDS.some((kw) => vLower.includes(kw));
  };

  const matchesGender = (voiceName) => {
    if (targetGender === 'female') {
      return isFemaleVoice(voiceName) && !isMaleVoice(voiceName);
    }
    return isMaleVoice(voiceName) && !isFemaleVoice(voiceName);
  };

  // 1° Prioridad: Voz preferida del personaje + Género correcto + 'Natural' / 'Online' / 'Neural'
  if (preferredNames.length > 0) {
    const naturalGenderPreferred = candidatePool.find(
      (v) => matchesPreferredName(v.name) && matchesGender(v.name) && isNaturalOrOnline(v.name)
    );
    if (naturalGenderPreferred) return naturalGenderPreferred;

    // 2° Prioridad: Voz preferida del personaje + Género correcto
    const genderPreferred = candidatePool.find(
      (v) => matchesPreferredName(v.name) && matchesGender(v.name)
    );
    if (genderPreferred) return genderPreferred;

    // Voz preferida con Natural/Online sin forzar género
    const naturalPreferred = candidatePool.find(
      (v) => matchesPreferredName(v.name) && isNaturalOrOnline(v.name)
    );
    if (naturalPreferred) return naturalPreferred;

    // Cualquier coincidencia con preferidas
    const anyPreferred = candidatePool.find((v) => matchesPreferredName(v.name));
    if (anyPreferred) return anyPreferred;
  }

  // 3° Prioridad: Cualquier voz 'Natural' u 'Online' del género requerido
  const naturalGenderMatch = candidatePool.find(
    (v) => matchesGender(v.name) && isNaturalOrOnline(v.name)
  );
  if (naturalGenderMatch) return naturalGenderMatch;

  // 4° Prioridad: Cualquier voz del género requerido en español
  const genderMatch = candidatePool.find((v) => matchesGender(v.name));
  if (genderMatch) return genderMatch;

  // 5° Prioridad: Cualquier voz 'Natural' u 'Online' en español
  const anyNaturalSpanish = candidatePool.find((v) => isNaturalOrOnline(v.name));
  if (anyNaturalSpanish) return anyNaturalSpanish;

  // 6° Prioridad: Coincidencia regional exacta (ej. 'es-ES', 'es-CL')
  const regionalMatch = candidatePool.find(
    (v) => v.lang.toLowerCase() === preferredLang.toLowerCase()
  );
  if (regionalMatch) return regionalMatch;

  // 7° Prioridad: Primera voz en español disponible
  return candidatePool[0] || null;
};

// Alias de retrocompatibilidad
export const findBestSpanishVoice = (preferredGenders, preferredLang) => {
  const gender = Array.isArray(preferredGenders) && preferredGenders.includes('female') ? 'female' : 'male';
  return getBestVoice({ gender, voiceSettings: { gender } }, preferredLang);
};

/**
 * Sintetiza texto a voz aplicando los parámetros acústicos (pitch, rate, volume) y la voz óptima por género
 */
export const speakPhilosopherText = (
  text,
  {
    philosopher = null,
    character = null,
    rate = null,
    pitch = null,
    volume = null,
    lang = 'es-ES',
    customVoiceURI = null,
    onStart = () => {},
    onEnd = () => {},
    onError = () => {},
  } = {}
) => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('SpeechSynthesis no soportado en este navegador.');
    return null;
  }

  const activeChar = character || philosopher;
  const savedPref = activeChar?.id ? getSavedVoicePref(activeChar.id) : null;

  // Cancelar inmediatamente cualquier audio anterior
  window.speechSynthesis.cancel();

  // Limpiar marcas fonéticas y modular texto
  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) return null;

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Determinar rate, pitch y volume considerando savedPref > character.rate > param rate > 1.0
  const finalRate = rate ?? savedPref?.rate ?? activeChar?.rate ?? activeChar?.voiceSettings?.rate ?? 1.0;
  const finalPitch = pitch ?? savedPref?.pitch ?? activeChar?.pitch ?? activeChar?.voiceSettings?.pitch ?? 1.0;
  const finalVolume = volume ?? savedPref?.volume ?? 1.0;
  const finalLang = activeChar?.voiceSettings?.lang ?? lang ?? 'es-ES';

  utterance.rate = Math.max(0.5, Math.min(2.0, finalRate));
  utterance.pitch = Math.max(0.5, Math.min(2.0, finalPitch));
  utterance.volume = Math.max(0.1, Math.min(1.0, finalVolume));
  utterance.lang = finalLang;

  // Selección de voz: Si se pasó customVoiceURI explícito, buscarla; si no, getBestVoice
  let selectedVoice = null;
  const voices = getAvailableVoices();
  if (customVoiceURI) {
    selectedVoice = voices.find((v) => v.voiceURI === customVoiceURI || v.name === customVoiceURI);
  }
  if (!selectedVoice) {
    selectedVoice = getBestVoice(activeChar, finalLang);
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onstart = () => {
    onStart();
  };

  utterance.onend = () => {
    onEnd();
  };

  utterance.onerror = (event) => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') {
      console.warn('SpeechSynthesis Error:', event.error);
      onError(event);
    } else {
      onEnd();
    }
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
};

// Exportar speakMessage como alias directo
export const speakMessage = speakPhilosopherText;

/**
 * Cancela e interrumpe de inmediato cualquier audio en reproducción
 */
export const cancelSpeech = () => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
};
