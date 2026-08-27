import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Mic, MicOff, Send, Radio, Image as ImageIcon, Sliders, X, Sparkles, Volume2, VolumeX } from 'lucide-react';

export const MessageInputBar = ({
  placeholder = 'Escribe un mensaje...',
  disclaimer = 'La IA puede generar reflexiones imprevisibles.',
  isListening = false,
  isProcessing = false,
  onToggleListen,
  onSendMessage,
  onOpenVoiceConfig,
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
  isSttSupported = true,
  externalInput = '',
  onClearExternalInput,
}) => {
  const [textInput, setTextInput] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // base64 string
  const [imageName, setImageName] = useState('');

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const toolsMenuRef = useRef(null);

  // Sincronizar input externo si el usuario hizo clic en una pregunta sugerida
  useEffect(() => {
    if (externalInput) {
      setTextInput(externalInput);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      onClearExternalInput?.();
    }
  }, [externalInput, onClearExternalInput]);

  // Auto-ajustar altura del textarea según el contenido
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [textInput]);

  // Cerrar menú de herramientas al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target.result);
      setIsToolsOpen(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };
    reader.readAsDataURL(file);

    // Limpiar input file para permitir subir el mismo archivo nuevamente si se desea
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageName('');
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = textInput.trim();
    if ((!trimmed && !selectedImage) || isProcessing) return;

    onSendMessage(trimmed, selectedImage);
    setTextInput('');
    setSelectedImage(null);
    setImageName('');
    setIsToolsOpen(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    // Enviar con Enter simple, permitir salto de línea con Shift + Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full select-none shrink-0 relative">
      <div className="max-w-4xl mx-auto w-full space-y-1.5 px-3 sm:px-6 relative">
        {/* Menú Popover de Herramientas (+) */}
        {isToolsOpen && (
          <div
            ref={toolsMenuRef}
            className="absolute left-6 bottom-full mb-3 z-30 bg-[#12161f] border border-[#30363d] rounded-2xl shadow-2xl p-2 w-72 space-y-1 animate-fadeIn text-zinc-200 font-sans"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 py-1.5 font-bold flex items-center gap-1.5 border-b border-[#21262d]">
              <Sparkles className="w-3 h-3 text-[#58a6ff]" />
              <span>HERRAMIENTAS DE DIÁLOGO</span>
            </div>

            {/* Opción 1: Configurar Voz */}
            <button
              type="button"
              onClick={() => {
                setIsToolsOpen(false);
                onOpenVoiceConfig?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left hover:bg-[#161b22] hover:text-[#58a6ff] transition-colors cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#58a6ff]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">Configurar Voz y Presets</span>
                <span className="text-[10px] text-zinc-400 block">Timbre, tono y velocidad</span>
              </div>
            </button>

            {/* Opción 2: Toggle Auto-Lectura */}
            <button
              type="button"
              onClick={() => {
                onToggleAutoSpeak?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left hover:bg-[#161b22] transition-colors cursor-pointer"
            >
              <div className={`p-1.5 rounded-lg border ${
                autoSpeakEnabled
                  ? 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40'
                  : 'bg-[#161b22] text-zinc-400 border-[#30363d]'
              }`}>
                {autoSpeakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold block">Auto-Lectura de Voz</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    autoSpeakEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {autoSpeakEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 block">
                  {autoSpeakEnabled ? 'Reproduce respuestas automáticamente' : 'Solo lectura de texto'}
                </span>
              </div>
            </button>

            {/* Opción 3: Adjuntar Imagen */}
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left hover:bg-[#161b22] hover:text-[#58a6ff] transition-colors cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#58a6ff]">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">Adjuntar Imagen</span>
                <span className="text-[10px] text-zinc-400 block">Análisis visual multimodal</span>
              </div>
            </button>
          </div>
        )}

        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Contenedor Principal de Entrada */}
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col bg-[#12161f] border border-[#21262d] rounded-2xl p-2 sm:p-2.5 shadow-xl focus-within:border-[#1f6feb]/60 focus-within:ring-1 focus-within:ring-[#1f6feb]/30 transition-all"
        >
          {/* Miniatura de Imagen Adjunta si existe */}
          {selectedImage && (
            <div className="mb-2 px-1 flex items-center gap-2">
              <div className="relative group inline-block rounded-xl overflow-hidden border border-[#30363d] bg-[#0b0e14] shadow-md">
                <img
                  src={selectedImage}
                  alt="Vista previa adjunta"
                  className="h-16 w-24 sm:h-20 sm:w-28 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
                  title="Eliminar imagen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs text-zinc-400 space-y-0.5">
                <div className="text-[11px] font-mono text-[#58a6ff] font-semibold">
                  📸 IMAGEN ADJUNTA
                </div>
                <div className="truncate max-w-[200px] text-zinc-300 font-sans">{imageName}</div>
                <div className="text-[10px] text-zinc-500 font-mono">Lista para examinar</div>
              </div>
            </div>
          )}

          {/* Fila del Input y Botones */}
          <div className="flex items-end gap-2 w-full">
            {/* Botón (+) para Menú de Herramientas */}
            <button
              type="button"
              onClick={() => setIsToolsOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition-all cursor-pointer mb-0.5 ${
                isToolsOpen
                  ? 'bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40 rotate-45'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#161b22]'
              }`}
              title="Herramientas y opciones"
            >
              <PlusCircle className="w-5 h-5 transition-transform duration-200" />
            </button>

            {/* Botón Rápido Toggle Auto-Voz */}
            <button
              type="button"
              onClick={onToggleAutoSpeak}
              className={`p-2 rounded-xl transition-all cursor-pointer mb-0.5 ${
                autoSpeakEnabled
                  ? 'bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#161b22]'
              }`}
              title={
                autoSpeakEnabled
                  ? 'Auto-Lectura activada: la IA hablará automáticamente (clic para silenciar)'
                  : 'Auto-Lectura silenciada (clic para activar voz automática)'
              }
            >
              {autoSpeakEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>

            {/* Textarea multilínea con auto-resize y soporte Shift+Enter */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? '🎙️ Escuchando tu voz... (habla con libertad)'
                  : placeholder
              }
              disabled={isProcessing}
              className="flex-1 bg-transparent px-2 py-1.5 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 font-sans resize-none max-h-36 overflow-y-auto custom-scrollbar leading-relaxed"
            />

            {/* Botón Toggle de Micrófono (STT) */}
            {isSttSupported ? (
              <button
                type="button"
                onClick={onToggleListen}
                disabled={isProcessing}
                className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer mb-0.5 ${
                  isListening
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse ring-2 ring-red-400'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#161b22] border border-transparent hover:border-[#30363d]'
                }`}
                title={
                  isListening
                    ? 'Detener escucha (Micrófono activo)'
                    : 'Hablar por micrófono (STT)'
                }
              >
                {isListening ? (
                  <Radio className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            ) : null}

            {/* Botón Enviar */}
            <button
              type="submit"
              disabled={(!textInput.trim() && !selectedImage) || isProcessing}
              className="p-2.5 rounded-xl bg-[#1f6feb] text-white hover:bg-[#388bfd] disabled:opacity-30 disabled:hover:bg-[#1f6feb] transition-all shrink-0 cursor-pointer shadow-md shadow-[#1f6feb]/20 mb-0.5"
              title="Enviar mensaje (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Disclaimer / Aviso al pie */}
        <p className="text-[11px] text-zinc-500 text-center font-mono">
          {disclaimer}
        </p>
      </div>
    </div>
  );
};
