import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, Volume2, VolumeX, Sparkles, User, ShieldAlert } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

export const ChatTranscript = ({
  messages = [],
  isProcessing = false,
  isSpeaking = false,
  speakingMessageId = null,
  interimTranscript = '',
  onReplayAudio,
}) => {
  const messagesEndRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  // Auto-scroll suave hasta el último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimTranscript, isProcessing]);

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto px-3 sm:px-6 py-4 rounded-2xl bg-[#0b0e14]/90 border border-[#1e2633] shadow-inner custom-scrollbar select-text">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Lista de Mensajes */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isCurrentSpeaking = isSpeaking && speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 w-full ${
                isUser ? 'justify-end' : 'justify-start'
              } animate-fadeIn`}
            >
              {/* Avatar Discreto */}
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-[#162338] border border-[#1f6feb]/50 flex items-center justify-center text-xs font-mono text-[#58a6ff] shrink-0 mt-1 shadow-sm">
                  ⚡
                </div>
              )}

              {/* Burbuja del Mensaje */}
              <div
                className={`group relative max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 transition-all duration-200 shadow-md select-text ${
                  isUser
                    ? 'bg-[#18263d] border border-[#1f6feb]/40 text-blue-50 rounded-tr-sm ml-4 sm:ml-8'
                    : `bg-[#12161f] border ${
                        isCurrentSpeaking
                          ? 'border-[#58a6ff] ring-1 ring-[#58a6ff]/40 shadow-lg shadow-[#1f6feb]/10'
                          : 'border-[#21262d]'
                      } text-zinc-100 rounded-tl-sm mr-4 sm:mr-8`
                }`}
              >
                {/* Header del Mensaje */}
                <div className="flex items-center justify-between gap-3 mb-2 text-[11px] text-zinc-400 font-medium select-none border-b border-white/5 pb-1.5">
                  <div className="flex items-center gap-1.5 font-mono">
                    {isUser ? (
                      <>
                        <User className="w-3 h-3 text-[#58a6ff]" />
                        <span className="text-[#58a6ff] font-semibold">TÚ</span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400 font-bold">⚡</span>
                        <span className="text-zinc-200 font-bold tracking-wider">SPARRING INTELECTUAL</span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {msg.timestamp || 'AHORA'}
                  </span>
                </div>

                {/* Imagen adjunta en el mensaje si existe */}
                {msg.image && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-[#30363d] max-w-sm shadow-md bg-black/40 select-none">
                    <img
                      src={msg.image}
                      alt="Imagen adjunta"
                      className="w-full h-auto max-h-72 object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* Contenido con Renderizado Markdown */}
                {msg.text && (
                  <div className="text-xs sm:text-[14.5px] leading-relaxed break-words font-sans text-zinc-100 select-text cursor-text">
                    <MarkdownRenderer content={msg.text} />
                  </div>
                )}

                {/* Acciones de Mensaje */}
                {msg.text && (
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-end gap-1.5 text-xs select-none">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22] transition-colors cursor-pointer"
                      title="Copiar texto"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {!isUser && onReplayAudio && (
                      <button
                        type="button"
                        onClick={() => onReplayAudio(msg)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-sm ${
                          isCurrentSpeaking
                            ? 'bg-red-950/70 border border-red-500/60 text-red-200 animate-pulse ring-1 ring-red-400/40'
                            : 'bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-zinc-300 hover:text-white'
                        }`}
                        title={isCurrentSpeaking ? 'Detener locución' : 'Escuchar mensaje en voz alta'}
                      >
                        {isCurrentSpeaking ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-red-400" />
                            <span>Detener</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-[#58a6ff]" />
                            <span>Escuchar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-[#1e2633] border border-[#30363d] flex items-center justify-center text-xs font-mono text-zinc-400 shrink-0 mt-1 shadow-sm">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* Transcripción provisional en vivo de la voz del usuario */}
        {interimTranscript && (
          <div className="flex items-start justify-end gap-3 w-full animate-fadeIn">
            <div className="max-w-[85%] rounded-2xl p-4 bg-[#18263d]/60 border border-[#1f6feb]/30 text-blue-200 italic rounded-tr-sm ml-8 text-xs sm:text-sm">
              <span className="font-mono text-[10px] text-[#58a6ff] block mb-1">VOZ EN DIRECTO...</span>
              {interimTranscript}
            </div>
          </div>
        )}

        {/* Indicador sutil de respuesta en progreso */}
        {isProcessing && (
          <div className="flex items-start gap-3 w-full animate-fadeIn select-none">
            <div className="w-8 h-8 rounded-xl bg-[#162338] border border-[#1f6feb]/50 flex items-center justify-center text-xs font-mono text-[#58a6ff] shrink-0 mt-1">
              ⚡
            </div>
            <div className="rounded-2xl px-4 py-3 bg-[#12161f] border border-[#21262d] text-zinc-400 rounded-tl-sm flex items-center gap-2.5 shadow-sm text-xs font-sans">
              <div className="w-4 h-4 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>El Sparring está articulando una réplica con rigor dialéctico...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
