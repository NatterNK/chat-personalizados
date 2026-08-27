import React, { useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Radio, Globe } from 'lucide-react';

const APP_STATES = {
  idle: {
    label: 'Inactivo',
    color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700/50',
    dot: 'bg-zinc-500',
  },
  listening: {
    label: 'Escuchando tu voz...',
    color: 'text-red-300 bg-red-950/40 border-red-500/40',
    dot: 'bg-red-500 animate-ping',
  },
  processing: {
    label: 'Pensando dialéctica...',
    color: 'text-amber-300 bg-amber-950/40 border-amber-500/40',
    dot: 'bg-amber-400 animate-pulse',
  },
  speaking: {
    label: 'Filósofo respondiendo...',
    color: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40',
    dot: 'bg-emerald-400 animate-pulse',
  },
};

export const AudioControls = ({
  appState = 'idle',
  isListening = false,
  isSpeaking = false,
  onToggleListen,
  onCancelSpeech,
  onSendMessage,
  selectedLang = 'es-ES',
  onSelectLang,
  isSttSupported = true,
}) => {
  const [textInput, setTextInput] = useState('');

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed || appState === 'processing') return;

    onSendMessage(trimmed);
    setTextInput('');
  };

  const currentStateInfo = APP_STATES[appState] || APP_STATES.idle;

  return (
    <div className="w-full space-y-3">
      {/* Barra de estado interactiva */}
      <div className="flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all ${currentStateInfo.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${currentStateInfo.dot}`}></span>
            <span>{currentStateInfo.label}</span>
          </div>

          {/* Selector de variante de español */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Globe className="w-3 h-3" />
            <select
              value={selectedLang}
              onChange={(e) => onSelectLang && onSelectLang(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="es-ES" className="bg-zinc-900">es-ES (España)</option>
              <option value="es-CL" className="bg-zinc-900">es-CL (Chile)</option>
              <option value="es-MX" className="bg-zinc-900">es-MX (México)</option>
              <option value="es-AR" className="bg-zinc-900">es-AR (Argentina)</option>
            </select>
          </div>
        </div>

        {/* Botón para detener audio si está hablando */}
        {isSpeaking && (
          <button
            onClick={onCancelSpeech}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs hover:bg-amber-500/30 transition-all"
            title="Interrumpir audio"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Interrumpir audio</span>
          </button>
        )}
      </div>

      {/* Caja de entrada principal con botón de micrófono y texto */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2 shadow-xl focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all"
      >
        {/* Botón de micrófono */}
        {isSttSupported ? (
          <button
            type="button"
            onClick={onToggleListen}
            disabled={appState === 'processing'}
            className={`relative p-3.5 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isListening
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105 animate-pulse ring-2 ring-red-400'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60'
            } ${appState === 'processing' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isListening ? 'Detener grabación (clic para enviar)' : 'Hablar por micrófono'}
          >
            {isListening ? (
              <Radio className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        ) : (
          <div
            className="p-3.5 rounded-xl bg-zinc-800/40 text-zinc-600 border border-zinc-800"
            title="Reconocimiento de voz no soportado en este navegador"
          >
            <MicOff className="w-5 h-5" />
          </div>
        )}

        {/* Campo de texto alternativo */}
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={
            isListening
              ? 'Escuchando tu voz... (o escribe aquí)'
              : 'Escribe tu tesis o pulsa el micrófono para hablar...'
          }
          disabled={appState === 'processing'}
          className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
        />

        {/* Botón de enviar mensaje */}
        <button
          type="submit"
          disabled={!textInput.trim() || appState === 'processing'}
          className="p-3 rounded-xl bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-amber-900/30"
          title="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
