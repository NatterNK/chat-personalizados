import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Play,
  Square,
  Zap,
  Globe,
  Radio,
  X,
  Info,
  Check,
} from 'lucide-react';
import { PhilosopherAvatar } from './PhilosopherAvatar';
import {
  getSpanishVoices,
  getBestVoice,
  getSavedVoicePref,
  saveVoicePref,
  clearVoicePref,
  applyVoicePrefToAllOfGender,
  speakPhilosopherText,
  cancelSpeech,
} from '../services/speech';
import {
  NEURAL_VOICES_CATALOG,
  playNeuralVoice,
  stopNeuralAudio,
  getBestNeuralVoiceForCharacter,
  formatRatePercent,
  formatPitchPercent,
} from '../services/neuralAudio';
import { characters } from '../config/characters';

const FEMALE_KEYWORDS = [
  'elena', 'marta', 'lucia', 'paloma', 'paulina', 'sabina', 'laura', 'monica',
  'victoria', 'carmen', 'soledad', 'francisca', 'mia', 'sofia', 'dalia', 'female', 'mujer', 'zira'
];

const MALE_KEYWORDS = [
  'jorge', 'tomas', 'gonzalo', 'alonso', 'manuel', 'raul', 'carlos', 'diego',
  'miguel', 'alvaro', 'pablo', 'saul', 'enrique', 'antonio', 'luis', 'julio', 'male', 'hombre', 'david'
];

export const VoiceConfigModal = ({ isOpen, onClose, character }) => {
  const [engineMode, setEngineMode] = useState('neural'); // 'neural' | 'browser'
  const [selectedNeuralVoice, setSelectedNeuralVoice] = useState('es-ES-AlvaroNeural');
  const [allBrowserVoices, setAllBrowserVoices] = useState([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState('');
  
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [genderTab, setGenderTab] = useState('male'); // 'male' | 'female'
  
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bulkSavedSuccess, setBulkSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !character) return;

    const initialGender = character.gender === 'female' ? 'female' : 'male';
    setGenderTab(initialGender);

    const loadVoices = () => {
      const available = getSpanishVoices();
      setAllBrowserVoices(available);

      const savedPref = getSavedVoicePref(character?.id);
      const defaultNeural = getBestNeuralVoiceForCharacter(character);
      const bestBrowser = getBestVoice(character);

      if (savedPref) {
        setEngineMode(savedPref.engineMode || 'neural');
        setSelectedNeuralVoice(savedPref.neuralVoice || defaultNeural);
        setSelectedBrowserVoiceURI(savedPref.voiceURI || bestBrowser?.voiceURI || available[0]?.voiceURI || '');
        setRate(savedPref.rate ?? character?.rate ?? 1.0);
        setPitch(savedPref.pitch ?? character?.pitch ?? 1.0);
        setVolume(savedPref.volume ?? 1.0);
        if (savedPref.genderTab) setGenderTab(savedPref.genderTab);
      } else {
        setEngineMode('neural');
        setSelectedNeuralVoice(defaultNeural);
        setSelectedBrowserVoiceURI(bestBrowser?.voiceURI || available[0]?.voiceURI || '');
        setRate(character?.rate ?? 1.0);
        setPitch(character?.pitch ?? 1.0);
        setVolume(1.0);
      }
    };

    loadVoices();

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (synth) {
      synth.onvoiceschanged = loadVoices;
    }

    setSavedSuccess(false);
    setBulkSavedSuccess(false);
    setIsPlayingTest(false);
  }, [isOpen, character]);

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        stopNeuralAudio();
        cancelSpeech();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Voces neuronales filtradas por pestaña de género
  const filteredNeuralVoices = useMemo(() => {
    return NEURAL_VOICES_CATALOG.filter((v) => v.gender === genderTab);
  }, [genderTab]);

  // Voces de navegador filtradas por género
  const filteredBrowserVoices = useMemo(() => {
    const spanish = allBrowserVoices.filter((v) => v.lang.toLowerCase().startsWith('es'));
    const pool = spanish.length > 0 ? spanish : allBrowserVoices;

    const isFemale = (name) => {
      const n = name.toLowerCase();
      return FEMALE_KEYWORDS.some((kw) => n.includes(kw));
    };

    const isMale = (name) => {
      const n = name.toLowerCase();
      return MALE_KEYWORDS.some((kw) => n.includes(kw));
    };

    const isNeuralOrNatural = (name) => {
      const n = name.toLowerCase();
      return (
        n.includes('natural') ||
        n.includes('neural') ||
        n.includes('google') ||
        n.includes('microsoft') ||
        n.includes('online')
      );
    };

    const byGender = pool.filter((v) => {
      if (genderTab === 'female') {
        return isFemale(v.name) && !isMale(v.name);
      }
      return isMale(v.name) && !isFemale(v.name);
    });

    const candidateList = byGender.length > 0 ? byGender : pool;

    return [...candidateList].sort((a, b) => {
      const aScore = isNeuralOrNatural(a.name) ? 2 : 1;
      const bScore = isNeuralOrNatural(b.name) ? 2 : 1;
      return bScore - aScore;
    });
  }, [allBrowserVoices, genderTab]);

  if (!isOpen || !character) return null;

  // Presets acústicos rápidos
  const handleApplyPreset = (presetType) => {
    if (presetType === 'agil') {
      setRate(1.14);
      setPitch(1.0);
      setVolume(1.0);
    } else if (presetType === 'solemne') {
      setRate(0.88);
      setPitch(0.94);
      setVolume(1.0);
    } else if (presetType === 'neutro') {
      setRate(1.0);
      setPitch(1.0);
      setVolume(1.0);
    }
  };

  const handleTestVoice = async () => {
    if (isPlayingTest) {
      stopNeuralAudio();
      cancelSpeech();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    const testPhrase = `Soy ${character.name}. Esta es la modulación acústica y cadencia configurada para nuestro examen dialéctico.`;

    if (engineMode === 'neural') {
      await playNeuralVoice(testPhrase, {
        character,
        voice: selectedNeuralVoice,
        rate,
        pitch,
        onStart: () => setIsPlayingTest(true),
        onEnd: () => setIsPlayingTest(false),
        onError: () => setIsPlayingTest(false),
      });
    } else {
      speakPhilosopherText(testPhrase, {
        character,
        rate,
        pitch,
        volume,
        customVoiceURI: selectedBrowserVoiceURI,
        onStart: () => setIsPlayingTest(true),
        onEnd: () => setIsPlayingTest(false),
        onError: () => setIsPlayingTest(false),
      });
    }
  };

  const handleSave = () => {
    const chosenBrowserVoice = allBrowserVoices.find((v) => v.voiceURI === selectedBrowserVoiceURI);
    const chosenNeural = NEURAL_VOICES_CATALOG.find((v) => v.id === selectedNeuralVoice);

    saveVoicePref(character.id, {
      engineMode,
      neuralVoice: selectedNeuralVoice,
      neuralVoiceName: chosenNeural?.name || '',
      voiceURI: selectedBrowserVoiceURI,
      voiceName: chosenBrowserVoice?.name || '',
      rate,
      pitch,
      volume,
      genderTab,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleApplyToAllOfGender = () => {
    const chosenBrowserVoice = allBrowserVoices.find((v) => v.voiceURI === selectedBrowserVoiceURI);
    const chosenNeural = NEURAL_VOICES_CATALOG.find((v) => v.id === selectedNeuralVoice);

    const pref = {
      engineMode,
      neuralVoice: selectedNeuralVoice,
      neuralVoiceName: chosenNeural?.name || '',
      voiceURI: selectedBrowserVoiceURI,
      voiceName: chosenBrowserVoice?.name || '',
      rate,
      pitch,
      volume,
      genderTab,
    };
    applyVoicePrefToAllOfGender(genderTab, pref, characters);
    setBulkSavedSuccess(true);
    setTimeout(() => {
      setBulkSavedSuccess(false);
    }, 2500);
  };

  const handleReset = () => {
    clearVoicePref(character.id);
    const defaultNeural = getBestNeuralVoiceForCharacter(character);
    const bestBrowser = getBestVoice(character);

    setEngineMode('neural');
    setSelectedNeuralVoice(defaultNeural);
    setSelectedBrowserVoiceURI(bestBrowser?.voiceURI || allBrowserVoices[0]?.voiceURI || '');
    setRate(character.rate ?? 1.0);
    setPitch(character.pitch ?? 1.0);
    setVolume(1.0);
    setGenderTab(character.gender === 'female' ? 'female' : 'male');
    setSavedSuccess(false);
    setBulkSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn select-none">
      <div className="bg-[#0b0e14] border border-[#21262d] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans text-zinc-100 max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-4 sm:p-5 bg-[#12161f] border-b border-[#21262d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <PhilosopherAvatar character={character} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Voz Neuronal & Modulación</h3>
                <span className="text-[10px] font-mono font-bold bg-[#1f6feb]/20 text-[#58a6ff] px-2 py-0.5 rounded-full border border-[#1f6feb]/40">
                  {character.name}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Voces humanas de estudio (Azure / Edge TTS) con fallback nativo
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopNeuralAudio();
              cancelSpeech();
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Selector de Motor: Neuronal de Estudio vs Navegador */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#58a6ff]" />
                MOTOR DE SÍNTESIS DE VOZ:
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#12161f] p-1 rounded-xl border border-[#21262d]">
              <button
                type="button"
                onClick={() => setEngineMode('neural')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  engineMode === 'neural'
                    ? 'bg-gradient-to-r from-[#1f6feb] to-[#388bfd] text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🎙️ Neuronal de Estudio</span>
              </button>
              <button
                type="button"
                onClick={() => setEngineMode('browser')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  engineMode === 'browser'
                    ? 'bg-[#1f6feb] text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]'
                }`}
              >
                <span>🔊 Local (Navegador)</span>
              </button>
            </div>
          </div>

          {/* Pestañas de Género */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
              <span>👤 GÉNERO DE LA VOZ:</span>
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#12161f] p-1 rounded-xl border border-[#21262d]">
              <button
                type="button"
                onClick={() => {
                  setGenderTab('male');
                  if (engineMode === 'neural') {
                    const firstMale = NEURAL_VOICES_CATALOG.find((v) => v.gender === 'male');
                    if (firstMale) setSelectedNeuralVoice(firstMale.id);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  genderTab === 'male'
                    ? 'bg-[#1f6feb] text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]'
                }`}
              >
                <span>👨 Voces Masculinas</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGenderTab('female');
                  if (engineMode === 'neural') {
                    const firstFemale = NEURAL_VOICES_CATALOG.find((v) => v.gender === 'female');
                    if (firstFemale) setSelectedNeuralVoice(firstFemale.id);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  genderTab === 'female'
                    ? 'bg-[#1f6feb] text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]'
                }`}
              >
                <span>👩 Voces Femeninas</span>
              </button>
            </div>
          </div>

          {/* Selector de Voz Neuronal vs Navegador */}
          {engineMode === 'neural' ? (
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
                <span>🌟 VOCES NEURONALES AZURE / EDGE DISPONIBLES:</span>
                <span className="text-[10px] text-[#58a6ff] font-mono">24kHz MP3 HD</span>
              </label>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {filteredNeuralVoices.map((v) => {
                  const isSelected = selectedNeuralVoice === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedNeuralVoice(v.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-[#10243e] border-[#1f6feb] text-white shadow-md ring-1 ring-[#1f6feb]/50'
                          : 'bg-[#12161f] border-[#21262d] text-zinc-300 hover:bg-[#161b22] hover:border-[#30363d]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>{v.flag}</span>
                          <span>{v.name}</span>
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono text-[#58a6ff] font-bold bg-[#1f6feb]/20 px-2 py-0.5 rounded-full border border-[#1f6feb]/40">
                            SELECCIONADA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-snug">
                        {v.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
                <span>🎙️ VOCES LOCALES DEL NAVEGADOR:</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {filteredBrowserVoices.length} detectadas
                </span>
              </label>

              <select
                value={selectedBrowserVoiceURI}
                onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/40 transition-all font-sans cursor-pointer"
              >
                {filteredBrowserVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI} className="bg-[#161b22] text-zinc-100">
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Presets Acústicos Rápidos */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>PRESETS ACÚSTICOS RÁPIDOS:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('agil')}
                className="p-2.5 rounded-xl bg-[#161b22] hover:bg-[#1f6feb]/20 border border-[#30363d] hover:border-[#1f6feb]/50 text-left transition-all group cursor-pointer"
                title="Cadencia rápida y ágil (+14%)"
              >
                <div className="text-xs font-bold text-zinc-200 group-hover:text-[#58a6ff] flex items-center gap-1">
                  <span>⚡ Fluido</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {formatRatePercent(1.14)} / {formatPitchPercent(1.0)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('solemne')}
                className="p-2.5 rounded-xl bg-[#161b22] hover:bg-[#1f6feb]/20 border border-[#30363d] hover:border-[#1f6feb]/50 text-left transition-all group cursor-pointer"
                title="Cadencia pausada y reflexiva (-12%)"
              >
                <div className="text-xs font-bold text-zinc-200 group-hover:text-[#58a6ff] flex items-center gap-1">
                  <span>🏛️ Solemne</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {formatRatePercent(0.88)} / {formatPitchPercent(0.94)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('neutro')}
                className="p-2.5 rounded-xl bg-[#161b22] hover:bg-[#1f6feb]/20 border border-[#30363d] hover:border-[#1f6feb]/50 text-left transition-all group cursor-pointer"
                title="Cadencia estándar equilibrada (0%)"
              >
                <div className="text-xs font-bold text-zinc-200 group-hover:text-[#58a6ff] flex items-center gap-1">
                  <span>🎯 Neutro</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {formatRatePercent(1.0)} / {formatPitchPercent(1.0)}
                </div>
              </button>
            </div>
          </div>

          {/* Sliders de Ajuste Fino */}
          <div className="space-y-4 bg-[#12161f] p-4 rounded-xl border border-[#21262d]">
            {/* Slider: Velocidad / Cadencia (0.6x - 1.6x) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#58a6ff]" />
                  Velocidad / Cadencia (Rate):
                </span>
                <span className="font-mono text-xs text-[#58a6ff] font-bold bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">
                  {Number(rate).toFixed(2)}x ({formatRatePercent(rate)})
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.02"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#1f6feb]"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-0.5">
                <span>0.60x (-40%)</span>
                <span>1.00x (0%)</span>
                <span>1.60x (+60%)</span>
              </div>
            </div>

            {/* Slider: Tono / Grave-Agudo (0.6 - 1.4) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  Tono / Timbre (Pitch):
                </span>
                <span className="font-mono text-xs text-purple-400 font-bold bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">
                  {Number(pitch).toFixed(2)} ({formatPitchPercent(pitch)})
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.02"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-0.5">
                <span>0.60 (-40Hz)</span>
                <span>1.00 (+0Hz)</span>
                <span>1.40 (+40Hz)</span>
              </div>
            </div>
          </div>

          {/* Botón de Prueba en Tiempo Real */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestVoice}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                isPlayingTest
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                  : 'bg-[#161b22] hover:bg-[#21262d] text-[#58a6ff] border-[#30363d] hover:border-[#1f6feb]/50'
              }`}
            >
              {isPlayingTest ? (
                <>
                  <Square className="w-4 h-4 text-red-400 fill-current" />
                  <span>Detener Prueba</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-[#58a6ff] fill-current" />
                  <span>
                    🔊 Probar {engineMode === 'neural' ? 'Voz Neuronal de Estudio' : 'Voz de Navegador'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Notificación de aplicación masiva */}
          {bulkSavedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Configuración aplicada a todos los pensadores de género {genderTab === 'female' ? 'femenino' : 'masculino'}.</span>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="p-4 sm:p-5 bg-[#12161f] border-t border-[#21262d] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22] border border-[#30363d] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Restablecer a valores sugeridos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToAllOfGender}
              className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-[#58a6ff] hover:bg-[#161b22] border border-[#30363d] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Aplicar esta voz a todos los personajes del mismo género"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">A todos ({genderTab === 'female' ? 'Mujeres' : 'Hombres'})</span>
              <span className="sm:hidden">A todos</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopNeuralAudio();
                cancelSpeech();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-all shadow-md shadow-[#1f6feb]/20 flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Guardado</span>
                </>
              ) : (
                <span>Guardar Ajustes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
