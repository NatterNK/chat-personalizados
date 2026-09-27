import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  BookOpen,
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';

export const MessageInputBar = ({
  placeholder = 'Plantea una contradicción, duda existencial o dilema ético...',
  disclaimer = 'El Sparring Indaga sin condescendencia. Contrasta premisas, genealogía y consecuencias prácticas.',
  isListening = false,
  isProcessing = false,
  onToggleListen,
  onSendMessage,
  onOpenConceptInspector,
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
  isSttSupported = true,
  externalInput = '',
  onClearExternalInput,
}) => {
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState('');

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sincronizar input externo si se envió desde el Inspector de Conceptos
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [textInput]);

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
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };
    reader.readAsDataURL(file);
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full space-y-2 select-none">
      {/* Mini preview de imagen si fue adjuntada */}
      {selectedImage && (
        <div className="flex items-center gap-2 p-2 bg-[#12161f] border border-[#21262d] rounded-xl max-w-sm animate-fadeIn">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-[#30363d] shrink-0">
            <img src={selectedImage} alt="Adjunto" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs text-zinc-300 truncate flex-1 font-sans">{imageName || 'Imagen adjunta'}</span>
          <button
            type="button"
            onClick={handleRemoveImage}
            className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Quitar imagen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Contenedor Principal de Entrada */}
      <div className="relative bg-[#12161f] border border-[#21262d] rounded-2xl p-2 sm:p-2.5 shadow-xl focus-within:border-[#1f6feb] focus-within:ring-1 focus-within:ring-[#1f6feb]/30 transition-all">
        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Botón: Inspector de Conceptos (Glosario Rápido) */}
          <button
            type="button"
            onClick={onOpenConceptInspector}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#162338] hover:bg-[#1f304f] border border-[#1f6feb]/40 text-[#58a6ff] hover:text-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
            title="Inspector de Conceptos: Etimología y significado rápido"
          >
            <BookOpen className="w-4 h-4 text-[#58a6ff]" />
            <span className="hidden md:inline">¿Qué significa?</span>
          </button>

          {/* Botón: Adjuntar Imagen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer shrink-0"
            title="Adjuntar imagen para análisis visual"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Botón: Voz (Micrófono) */}
          {isSttSupported && (
            <button
              type="button"
              onClick={onToggleListen}
              disabled={isProcessing}
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/40 animate-pulse'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]'
              } ${isProcessing ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={isListening ? 'Detener dictado' : 'Hablar por micrófono'}
            >
              {isListening ? <Radio className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Campo Textarea Auto-Expandible */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening ? 'Escuchando tu voz...' : placeholder
            }
            disabled={isProcessing}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-36 leading-relaxed font-sans disabled:opacity-50"
          />

          {/* Botón de Enviar */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={(!textInput.trim() && !selectedImage) || isProcessing}
            className="p-2.5 rounded-xl bg-gradient-to-r from-[#1f6feb] to-[#388bfd] hover:from-[#388bfd] hover:to-[#58a6ff] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-[#1f6feb]/20 cursor-pointer shrink-0"
            title="Enviar mensaje (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de Estado Inferior y Disclaimer */}
      <div className="flex items-center justify-between px-2 text-[11px] text-zinc-500 font-sans">
        <span className="truncate max-w-[85%]">{disclaimer}</span>
        
        {/* Toggle de Auto-Lectura por Voz */}
        {onToggleAutoSpeak && (
          <button
            type="button"
            onClick={onToggleAutoSpeak}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
              autoSpeakEnabled
                ? 'bg-[#162338] border-[#1f6feb]/40 text-[#58a6ff]'
                : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-400'
            }`}
            title="Activar o desactivar lectura en voz alta automática"
          >
            {autoSpeakEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span className="text-[10px] hidden sm:inline">{autoSpeakEnabled ? 'Voz activa' : 'Voz silenciada'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
