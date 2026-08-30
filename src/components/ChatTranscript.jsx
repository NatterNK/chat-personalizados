import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Copy, Check } from 'lucide-react';
import { PhilosopherAvatar } from './PhilosopherAvatar';

export const ChatTranscript = ({
  messages = [],
  character,
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
    <div className="flex-1 min-h-0 w-full overflow-y-auto px-3 sm:px-6 py-4 rounded-2xl bg-[#0e1217]/80 border border-[#1e2633] shadow-inner custom-scrollbar select-text">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Lista de Mensajes */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isCurrentSpeaking = isSpeaking && speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 w-full ${
                isUser ? 'justify-end' : 'justify-start'
              } animate-fadeIn`}
            >
              {/* Avatar Personaje Tipográfico / Iconográfico */}
              {!isUser && (
                <PhilosopherAvatar character={character} size="sm" className="mt-0.5 shadow-sm" />
              )}

              {/* Burbuja del Mensaje */}
              <div
                className={`group relative max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 transition-all duration-200 shadow-md select-text ${
                  isUser
                    ? 'bg-[#1a2b47] border border-[#1f6feb]/50 text-blue-50 rounded-tr-sm ml-6'
                    : `bg-[#161b22] border ${
                        isCurrentSpeaking
                          ? 'border-[#58a6ff] ring-1 ring-[#58a6ff]/40 shadow-lg shadow-[#1f6feb]/10'
                          : 'border-[#30363d]'
                      } text-zinc-200 rounded-tl-sm mr-6`
                }`}
              >
                {/* Header del Mensaje */}
                <div className="flex items-center justify-between gap-3 mb-1.5 text-[11px] text-zinc-400 font-medium select-none">
                  <span className="font-mono">
                    {isUser ? 'TÚ' : character?.name?.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {msg.timestamp || 'AHORA'}
                  </span>
                </div>

                {/* Imagen adjunta en el mensaje si existe */}
                {msg.image && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-[#30363d] max-w-xs shadow-md bg-black/30 select-none">
                    <img
                      src={msg.image}
                      alt="Imagen adjunta"
                      className="w-full h-auto max-h-64 object-contain rounded-lg"
                    />
                  </div>
                )}

                {/* Texto con wrap y saltos de línea perfectos */}
                {msg.text && (
                  <div className="text-sm sm:text-[15px] leading-relaxed break-words whitespace-pre-wrap font-sans text-zinc-100 select-text cursor-text">
                    {msg.text}
                  </div>
                )}

                {/* Acciones para Mensajes del Personaje */}
                {!isUser && msg.text && (
                  <div className="mt-3 pt-2.5 border-t border-[#30363d]/60 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#21262d] transition-colors cursor-pointer"
                      title="Copiar texto"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onReplayAudio && onReplayAudio(msg)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                        isCurrentSpeaking
                          ? 'bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40 shadow-sm font-semibold'
                          : 'text-zinc-400 hover:text-[#58a6ff] hover:bg-[#21262d]'
                      }`}
                      title={isCurrentSpeaking ? 'Detener reproducción de audio' : 'Escuchar con voz sintetizada'}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isCurrentSpeaking ? 'text-[#58a6ff] animate-pulse' : ''}`} />
                      <span className="text-[11px]">{isCurrentSpeaking ? 'Detener' : 'Escuchar'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Avatar Usuario */}
              {isUser && (
                <div className="w-9 h-9 rounded-xl bg-[#1f6feb]/20 border border-[#1f6feb]/40 flex items-center justify-center text-[#58a6ff] text-xs font-mono font-bold shrink-0 shadow-sm mt-0.5">
                  TÚ
                </div>
              )}
            </div>
          );
        })}

        {/* Transcripción en vivo mientras el usuario habla por micrófono */}
        {interimTranscript && (
          <div className="flex items-start gap-3 w-full justify-end animate-fadeIn">
            <div className="bg-[#1f6feb]/10 border border-dashed border-[#1f6feb]/50 text-blue-200 rounded-2xl rounded-tr-sm p-3.5 max-w-[82%] flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="text-sm font-sans italic break-words">"{interimTranscript}..."</span>
            </div>
          </div>
        )}

        {/* Indicador de carga / Pensando con avatar del pensador */}
        {isProcessing && (
          <div className="flex items-center gap-3 w-full justify-start animate-fadeIn">
            <PhilosopherAvatar character={character} size="sm" />
            <div className="px-4 py-2.5 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce"></div>
            </div>
          </div>
        )}

        {/* Elemento ancla para auto-scroll suave */}
        <div ref={messagesEndRef} className="h-0 w-0" />
      </div>
    </div>
  );
};
