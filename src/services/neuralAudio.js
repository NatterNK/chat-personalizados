import { cleanTextForSpeech } from './speechUtils';
import { getSavedVoicePref, speakPhilosopherText, cancelSpeech } from './speech';

/**
 * Catálogo de Voces Neuronales de Estudio (Azure Neural / Edge-TTS)
 */
export const NEURAL_VOICES_CATALOG = [
  // --- VOCES MASCULINAS ---
  {
    id: 'es-ES-AlvaroNeural',
    name: 'Álvaro Neural (España)',
    gender: 'male',
    country: 'España',
    flag: '🇪🇸',
    description: 'Voz profunda, académica y solemne. Ideal para dialéctica clásica y filosofía reflexiva.',
  },
  {
    id: 'es-MX-JorgeNeural',
    name: 'Jorge Neural (México)',
    gender: 'male',
    country: 'México',
    flag: '🇲🇽',
    description: 'Voz cálida, envolvente y elocuente. Excelente para pedagogía y narrativa.',
  },
  {
    id: 'es-AR-TomasNeural',
    name: 'Tomás Neural (Argentina)',
    gender: 'male',
    country: 'Argentina',
    flag: '🇦🇷',
    description: 'Voz articulada, aguda y analítica. Ideal para lógica y crítica.',
  },
  {
    id: 'es-CO-GonzaloNeural',
    name: 'Gonzalo Neural (Colombia)',
    gender: 'male',
    country: 'Colombia',
    flag: '🇨🇴',
    description: 'Voz neutra, fluida y serena. Gran claridad en turnos largos.',
  },
  {
    id: 'es-CL-LorenzoNeural',
    name: 'Lorenzo Neural (Chile)',
    gender: 'male',
    country: 'Chile',
    flag: '🇨🇱',
    description: 'Voz sobria, pausada y natural.',
  },
  {
    id: 'es-ES-AbrilNeural',
    name: 'Abril Neural (España)',
    gender: 'male',
    country: 'España',
    flag: '🇪🇸',
    description: 'Voz joven, enérgica y dinámica.',
  },

  // --- VOCES FEMENINAS ---
  {
    id: 'es-ES-ElviraNeural',
    name: 'Elvira Neural (España)',
    gender: 'female',
    country: 'España',
    flag: '🇪🇸',
    description: 'Voz serena, docta, madura y persuasiva. Perfecta para filósofas y pensadoras.',
  },
  {
    id: 'es-ES-LauraNeural',
    name: 'Laura Neural (España)',
    gender: 'female',
    country: 'España',
    flag: '🇪🇸',
    description: 'Voz lúcida, articulada y reflexiva.',
  },
  {
    id: 'es-MX-DaliaNeural',
    name: 'Dalia Neural (México)',
    gender: 'female',
    country: 'México',
    flag: '🇲🇽',
    description: 'Voz cálida, expresiva y humana.',
  },
  {
    id: 'es-AR-ElenaNeural',
    name: 'Elena Neural (Argentina)',
    gender: 'female',
    country: 'Argentina',
    flag: '🇦🇷',
    description: 'Voz analítica, segura y elegante.',
  },
  {
    id: 'es-CO-SalomeNeural',
    name: 'Salomé Neural (Colombia)',
    gender: 'female',
    country: 'Colombia',
    flag: '🇨🇴',
    description: 'Voz melódica, nítida y precisa.',
  },
  {
    id: 'es-CL-CatalinaNeural',
    name: 'Catalina Neural (Chile)',
    gender: 'female',
    country: 'Chile',
    flag: '🇨🇱',
    description: 'Voz sobria y pausada.',
  },
];

// Instancia singleton de audio HTML5 para control de ciclo de vida
let currentAudio = null;
let currentBlobUrl = null;
let playSessionCounter = 0;

/**
 * Convierte un multiplicador de velocidad (ej. 1.14 o 0.88) a formato porcentaje string (+14% o -12%)
 */
export const formatRatePercent = (rateVal) => {
  if (typeof rateVal === 'string' && rateVal.endsWith('%')) return rateVal;
  const num = typeof rateVal === 'number' ? rateVal : parseFloat(rateVal) || 1.0;
  const percent = Math.round((num - 1.0) * 100);
  return percent >= 0 ? `+${percent}%` : `${percent}%`;
};

/**
 * Convierte un multiplicador de tono (ej. 1.0 o 0.94) a formato Hz string (+0Hz o -6Hz)
 */
export const formatPitchPercent = (pitchVal) => {
  if (typeof pitchVal === 'string' && (pitchVal.endsWith('Hz') || pitchVal.endsWith('%'))) return pitchVal;
  const num = typeof pitchVal === 'number' ? pitchVal : parseFloat(pitchVal) || 1.0;
  const percent = Math.round((num - 1.0) * 100);
  return percent >= 0 ? `+${percent}Hz` : `${percent}Hz`;
};

/**
 * Detiene cualquier audio en curso (tanto HTML5 Audio como Web Speech API) y libera recursos
 */
export const stopAllAudio = () => {
  // Incrementar contador para invalidar peticiones en vuelo
  playSessionCounter++;

  // 1. Detener audio HTML5
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch (e) {}
    currentAudio = null;
  }

  // 2. Liberar blob URL
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch (e) {}
    currentBlobUrl = null;
  }

  // 3. Detener síntesis nativa del navegador
  cancelSpeech();
};

export const stopNeuralAudio = stopAllAudio;

/**
 * Obtiene la mejor voz neuronal configurada para un pensador
 */
export const getBestNeuralVoiceForCharacter = (character) => {
  if (!character) return 'es-ES-AlvaroNeural';

  const savedPref = character.id ? getSavedVoicePref(character.id) : null;
  if (savedPref?.neuralVoice) {
    return savedPref.neuralVoice;
  }

  if (character.neuralVoice) {
    return character.neuralVoice;
  }

  const gender = character.gender || 'male';
  if (gender === 'female') {
    return 'es-ES-ElviraNeural';
  }
  return 'es-ES-AlvaroNeural';
};

/**
 * Reproduce texto con Voz Neuronal Humana (Azure / Edge TTS) mediante la API Serverless
 * Si falla, aplica fallback automático blindado a la Web Speech API nativa sin solapamiento
 */
export const playNeuralVoice = async (
  text,
  {
    character = null,
    voice = null,
    rate = null,
    pitch = null,
    onStart = () => {},
    onEnd = () => {},
    onError = () => {},
  } = {}
) => {
  // Limpiar cualquier audio previo
  stopAllAudio();
  const currentSessionId = playSessionCounter;

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    onEnd();
    return null;
  }

  const savedPref = character?.id ? getSavedVoicePref(character.id) : null;
  const targetVoice = voice || savedPref?.neuralVoice || character?.neuralVoice || getBestNeuralVoiceForCharacter(character);
  const targetRate = formatRatePercent(rate ?? savedPref?.rate ?? character?.rate ?? 1.0);
  const targetPitch = formatPitchPercent(pitch ?? savedPref?.pitch ?? character?.pitch ?? 1.0);

  try {
    const controller = new AbortController();
    const fetchTimer = setTimeout(() => controller.abort(), 9000);

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanText,
        voice: targetVoice,
        rate: targetRate,
        pitch: targetPitch,
      }),
      signal: controller.signal,
    });

    clearTimeout(fetchTimer);

    // Si otra reproducción se inició mientras se hacía el fetch, descartar este resultado
    if (currentSessionId !== playSessionCounter) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`TTS API respondió con status: ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Blob de audio vacío recibido del servidor.');
    }

    // Doble chequeo de sesión antes de crear el objeto Audio
    if (currentSessionId !== playSessionCounter) {
      return null;
    }

    const audioUrl = URL.createObjectURL(blob);
    currentBlobUrl = audioUrl;

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onplay = () => {
      if (currentSessionId === playSessionCounter) {
        onStart();
      }
    };

    audio.onended = () => {
      if (currentSessionId === playSessionCounter) {
        stopAllAudio();
        onEnd();
      }
    };

    audio.onerror = (e) => {
      console.warn('[Neural Audio Error -> Fallback nativo]:', e);
      if (currentSessionId === playSessionCounter) {
        stopAllAudio();
        // Fallback a Web Speech API garantizando cero solapamiento
        speakPhilosopherText(cleanText, {
          character,
          rate: typeof rate === 'number' ? rate : 1.0,
          pitch: typeof pitch === 'number' ? pitch : 1.0,
          onStart,
          onEnd,
          onError,
        });
      }
    };

    await audio.play();
    return audio;
  } catch (err) {
    console.warn('[Neural TTS Falló -> Activando Fallback Nativo WebSpeech]:', err.message);
    if (currentSessionId === playSessionCounter) {
      stopAllAudio();
      // Fallback nativo garantizando cero solapamiento
      return speakPhilosopherText(cleanText, {
        character,
        rate: typeof rate === 'number' ? rate : 1.0,
        pitch: typeof pitch === 'number' ? pitch : 1.0,
        onStart,
        onEnd,
        onError,
      });
    }
    return null;
  }
};
