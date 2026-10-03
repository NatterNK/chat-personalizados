import { cleanTextForSpeech } from './speechUtils';

export { cleanTextForSpeech };

export const SPEECH_SETTINGS_KEY = 'speech_settings';

const DEFAULT_SETTINGS = {
  voiceURI: 'es-ES-AlvaroNeural', // Voz neural solemne por defecto
  rate: 1.0,
  pitch: 1.0,
  autoSpeak: false,
  useNeuralVoice: true, // Voz neural de Microsoft Edge-TTS
};

/**
 * Control del reproductor de audio HTML5 para Voz Neural y Web Audio API
 */
let currentAudioInstance = null;
let currentBlobUrl = null;
let currentAudioContext = null;
let playSessionCounter = 0;

/**
 * Detiene cualquier audio en reproducción (tanto Voz Neural como Web Speech Synthesis)
 * y libera recursos de hardware/audio para no saturar memoria móvil.
 */
export const stopAllAudio = () => {
  playSessionCounter++;

  if (currentAudioInstance) {
    try {
      currentAudioInstance.pause();
      currentAudioInstance.currentTime = 0;
      currentAudioInstance.src = '';
    } catch (e) {}
    currentAudioInstance = null;
  }

  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch (e) {}
    currentBlobUrl = null;
  }

  if (currentAudioContext) {
    try {
      if (currentAudioContext.state !== 'closed') {
        currentAudioContext.close();
      }
    } catch (e) {}
    currentAudioContext = null;
  }

  cancelSpeech();
};

/**
 * Pausa la locución neural actual y suspende el AudioContext
 */
export const pauseNeuralVoice = () => {
  if (currentAudioInstance && !currentAudioInstance.paused) {
    try {
      currentAudioInstance.pause();
    } catch (e) {}
  }
  if (currentAudioContext && currentAudioContext.state === 'running') {
    try {
      currentAudioContext.suspend();
    } catch (e) {}
  }
};

/**
 * Reanuda la locución neural pausada y reactiva el AudioContext
 */
export const resumeNeuralVoice = () => {
  if (currentAudioContext && currentAudioContext.state === 'suspended') {
    try {
      currentAudioContext.resume();
    } catch (e) {}
  }
  if (currentAudioInstance && currentAudioInstance.paused) {
    try {
      currentAudioInstance.play();
    } catch (e) {}
  }
};

/**
 * Verifica si hay audio neural sonando actualmente
 */
export const isNeuralAudioPlaying = () => {
  return Boolean(currentAudioInstance && !currentAudioInstance.paused && !currentAudioInstance.ended);
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

  const natural = spanish.find((v) => {
    const n = v.name.toLowerCase();
    return n.includes('natural') || n.includes('neural') || n.includes('google');
  });
  if (natural) return natural;

  return spanish[0];
};

/**
 * Cancela de inmediato cualquier locución en curso en Web Speech API
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
 * Sintetiza un texto a voz utilizando Web Speech API nativa
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

  cancelSpeech();

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

/**
 * Reproducción de Voz Neuronal de Microsoft (Edge-TTS / es-ES-AlvaroNeural)
 * Realiza fetch a /api/tts, crea Blob de audio MP3 y reproduce con new Audio()
 * Incluye fallback automático a Web Speech API en caso de desconexión o fallo de servidor
 */
export const playNeuralVoice = async (
  text = '',
  {
    voice = 'es-ES-AlvaroNeural',
    rate = '-18%',
    pitch = '-8Hz',
    onStart = () => {},
    onEnd = () => {},
    onError = () => {},
  } = {}
) => {
  // Limpiar cualquier audio previo
  stopAllAudio();
  const sessionId = playSessionCounter;

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    onEnd();
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: clean,
        voice,
        rate,
        pitch,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutTimer);

    // Si otra reproducción se inició mientras se recibía la respuesta, descartar
    if (sessionId !== playSessionCounter) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`TTS serverless endpoint respondió con código HTTP ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Blob de audio vacío recibido del servidor.');
    }

    if (sessionId !== playSessionCounter) {
      return null;
    }

    const audioUrl = URL.createObjectURL(blob);
    currentBlobUrl = audioUrl;

    const audioElement = new Audio(audioUrl);
    currentAudioInstance = audioElement;

    // Efecto de micrófono de estudio con Web Audio API:
    // Filtro para inflar graves (Efecto de proximidad)
    let audioCtx = null;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        currentAudioContext = audioCtx;

        const source = audioCtx.createMediaElementSource(audioElement);

        // Filtro para inflar graves (Efecto de proximidad)
        const bassBooster = audioCtx.createBiquadFilter();
        bassBooster.type = "lowshelf";
        bassBooster.frequency.value = 180;
        bassBooster.gain.value = 6; // +6dB de calidez grave

        source.connect(bassBooster);
        bassBooster.connect(audioCtx.destination);
      }
    } catch (audioCtxErr) {
      console.warn('[speechService] Error configurando filtro de micrófono de estudio:', audioCtxErr);
    }

    audioElement.onplay = () => {
      if (sessionId === playSessionCounter) {
        onStart();
      }
    };

    audioElement.onended = () => {
      if (sessionId === playSessionCounter) {
        stopAllAudio();
        onEnd();
      }
    };

    audioElement.onerror = (err) => {
      console.warn('[Neural Audio Error -> Activando fallback nativo WebSpeech]:', err);
      if (sessionId === playSessionCounter) {
        stopAllAudio();
        speakText(clean, {
          onStart,
          onEnd,
          onError,
        });
      }
    };

    if (audioCtx && audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {}
    }

    await audioElement.play();
    return audioElement;
  } catch (err) {
    console.warn('[Neural TTS Fetch Error -> Activando fallback nativo WebSpeech]:', err.message || err);
    if (sessionId === playSessionCounter) {
      stopAllAudio();
      return speakText(clean, {
        onStart,
        onEnd,
        onError,
      });
    }
    return null;
  }
};
