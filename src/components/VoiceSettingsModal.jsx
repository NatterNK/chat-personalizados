import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, X, Play, Square, Settings, Check } from 'lucide-react';
import {
  getSpanishVoices,
  getSpeechSettings,
  saveSpeechSettings,
  speakText,
  cancelSpeech,
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
      cancelSpeech();
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

  const handleTestVoice = () => {
    if (isPlayingSample) {
      cancelSpeech();
      setIsPlayingSample(false);
      return;
    }

    setIsPlayingSample(true);
    speakText(SAMPLE_PHRASE, {
      customSettings: settings,
      onStart: () => setIsPlayingSample(true),
      onEnd: () => setIsPlayingSample(false),
      onError: () => setIsPlayingSample(false),
    });
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
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Configuración de Voz (TTS)
              </h3>
              <p className="text-xs text-zinc-400">
                Ajustes de locución, velocidad y lectura automática
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
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* 1. Selector de Voz en Español */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider block">
              Voz del Navegador (Español)
            </label>
            <select
              value={settings.voiceURI}
              onChange={(e) => updateSetting('voiceURI', e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-[#58a6ff] cursor-pointer font-sans"
            >
              <option value="">Predeterminada del sistema (Automática)</option>
              {voices.map((v) => (
                <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                  {v.name} ({v.lang}) {v.localService ? '• Local' : '• Red'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500">
              {voices.length} {voices.length === 1 ? 'voz detectada' : 'voces detectadas'} en español en este dispositivo.
            </p>
          </div>

          {/* 2. Slider de Velocidad (Rate) */}
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
              max="1.4"
              step="0.05"
              value={settings.rate}
              onChange={(e) => updateSetting('rate', parseFloat(e.target.value))}
              className="w-full accent-[#1f6feb] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>0.8x (Pausado)</span>
              <span>1.0x (Normal)</span>
              <span>1.4x (Dinámico)</span>
            </div>
          </div>

          {/* 3. Switch de Lectura Automática */}
          <div className="p-3.5 rounded-2xl bg-[#12161f] border border-[#21262d] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-semibold text-white block">
                Lectura automática
              </span>
              <span className="text-[11px] text-zinc-400 block leading-tight">
                Reproducir en voz alta cada nueva réplica generada por el Sparring
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
              <span>{isPlayingSample ? 'Detener muestra' : 'Probar voz'}</span>
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
