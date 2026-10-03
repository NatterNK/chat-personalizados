import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, X, Play, Square, Settings, Check, Sparkles } from 'lucide-react';
import {
  getSpanishVoices,
  getSpeechSettings,
  saveSpeechSettings,
  playNeuralVoice,
  speakText,
  stopAllAudio,
} from '../services/speechService';

const SAMPLE_PHRASE =
  'Soy tu Sparring Intelectual. El rigor dialéctico exige examinar nuestras certezas antes de defenderlas.';

export const VoiceSettingsModal = ({ isOpen, onClose, onSettingsChange }) => {
  const [voices, setVoices] = useState([]);
  const [settings, setSettings] = useState(() => getSpeechSettings());
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  // Cargar voces en español al abrir
  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => {
        const esVoices = getSpanishVoices();
        setVoices(esVoices);
      };

      loadVoices();
      setSettings(getSpeechSettings());

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      stopAllAudio();
      setIsPlayingSample(false);
    }
  }, [isOpen]);

  // Manejo de teclas Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSpeechSettings(next);
    onSettingsChange?.(next);
  };

  const handleTestVoice = async () => {
    if (isPlayingSample) {
      stopAllAudio();
      setIsPlayingSample(false);
      return;
    }

    setIsPlayingSample(true);

    try {
      if (settings.useNeuralVoice !== false) {
        await playNeuralVoice(SAMPLE_PHRASE, {
          voice: settings.voiceURI || 'es-ES-AlvaroNeural',
          rate: '-10%',
          pitch: '-5Hz',
          onStart: () => setIsPlayingSample(true),
          onEnd: () => setIsPlayingSample(false),
          onError: () => setIsPlayingSample(false),
        });
      } else {
        speakText(SAMPLE_PHRASE, {
          customSettings: settings,
          onStart: () => setIsPlayingSample(true),
          onEnd: () => setIsPlayingSample(false),
          onError: () => setIsPlayingSample(false),
        });
      }
    } catch (err) {
      console.warn('Error al probar voz:', err);
      setIsPlayingSample(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none">
      <div className="bg-[#0b0e14] border border-[#21262d] w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans">
        
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-[#12161f] border-b border-[#21262d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#162338] border border-[#1f6feb]/40 flex items-center justify-center text-[#58a6ff]">
              <Volume2 className="w-5 h-5 text-[#58a6ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Configuración de Audio
                </h3>
                <span className="text-[10px] font-mono font-bold bg-[#1f6feb]/20 text-[#58a6ff] px-2 py-0.5 rounded-full border border-[#1f6feb]/40 uppercase">
                  Voz Neural
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Narrador reflexivo solemne (Microsoft Edge-TTS) y Web Speech
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido / Opciones de Configuración */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* Tarjeta Destacada: Voz Neural Solemne */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#162338] to-[#12161f] border border-[#1f6feb]/40 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-200 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>NARRADOR SOLEMNE RECOMENDADO</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40">
                Azure Neural
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              <strong>Álvaro Neural (España)</strong> con pitch de <span className="font-mono text-[#58a6ff]">-5Hz</span> y velocidad de <span className="font-mono text-[#58a6ff]">-10%</span> para un tono grave, reposado y académico de narrador de ensayo.
            </p>
          </div>

          {/* 1. Selector de Voz */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider block">
              Voz del Narrador
            </label>
            <select
              value={settings.voiceURI || 'es-ES-AlvaroNeural'}
              onChange={(e) => updateSetting('voiceURI', e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-[#58a6ff] cursor-pointer font-sans"
            >
              <option value="es-ES-AlvaroNeural">
                ⚡ Álvaro Neural (Grave & Solemne - Recomendado)
              </option>
              <option value="es-MX-JorgeNeural">
                ⚡ Jorge Neural (México - Cálido)
              </option>
              <option value="es-ES-ElviraNeural">
                ⚡ Elvira Neural (España - Femenina Solemne)
              </option>
              {voices.map((v) => (
                <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                  {v.name} ({v.lang}) {v.localService ? '• Local' : '• Red'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Slider de Velocidad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              <span>Velocidad de Lectura</span>
              <span className="text-[#58a6ff] font-sans font-bold text-sm">
                {Number(settings.rate).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={settings.rate}
              onChange={(e) => updateSetting('rate', parseFloat(e.target.value))}
              className="w-full accent-[#1f6feb] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>0.8x (Reflexivo)</span>
              <span>1.0x (Estándar)</span>
              <span>1.3x (Dinámico)</span>
            </div>
          </div>

          {/* 3. Switch de Lectura Automática */}
          <div className="p-3.5 rounded-2xl bg-[#12161f] border border-[#21262d] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-semibold text-white block">
                Lectura automática (AutoSpeak)
              </span>
              <span className="text-[11px] text-zinc-400 block leading-tight">
                Reproducir con voz neural cada nueva réplica generada por el Sparring
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={Boolean(settings.autoSpeak)}
                onChange={(e) => updateSetting('autoSpeak', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#161b22] border border-[#30363d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1f6feb] peer-checked:border-[#1f6feb]"></div>
            </label>
          </div>

          {/* 4. Botón de Muestra / Prueba */}
          <div className="pt-2 border-t border-[#21262d] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestVoice}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isPlayingSample
                  ? 'bg-red-950/60 border border-red-500/50 text-red-200 animate-pulse'
                  : 'bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-zinc-200 hover:text-white'
              }`}
            >
              {isPlayingSample ? <Square className="w-4 h-4 text-red-400 fill-current" /> : <Play className="w-4 h-4 text-[#58a6ff] fill-current" />}
              <span>{isPlayingSample ? 'Detener muestra' : 'Probar voz neural'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer"
            >
              Guardar y Cerrar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
