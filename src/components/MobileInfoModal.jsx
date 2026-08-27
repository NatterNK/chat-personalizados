import React from 'react';
import { X, Compass, HelpCircle, BookOpen, ArrowUpRight } from 'lucide-react';

export const MobileInfoModal = ({
  isOpen,
  onClose,
  character,
  onSelectQuestion,
  isProcessing = false,
}) => {
  if (!isOpen || !character) return null;

  const guide = character.criticalGuide;
  const book = character.recommendedBook;
  const avatarImg = character.avatar || character.avatarUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn select-none md:hidden">
      {/* Drawer / Sheet Content */}
      <div className="bg-[#0b0e14] border-t sm:border border-[#21262d] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans text-zinc-100 max-h-[85vh]">
        {/* Cabecera */}
        <div className="p-4 bg-[#12161f] border-b border-[#21262d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0">
              {avatarImg ? (
                <img
                  src={avatarImg}
                  alt={character.name}
                  className="w-full h-full object-cover grayscale contrast-125"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span style={{ display: avatarImg ? 'none' : 'flex' }}>🏛️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{character.name}</h3>
                <span className="text-[10px] font-mono font-bold bg-[#1f6feb]/20 text-[#58a6ff] px-2 py-0.5 rounded-full border border-[#1f6feb]/40">
                  {character.era}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-serif italic truncate max-w-[220px]">
                "{character.quote}"
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Foco Analítico */}
          {guide && (
            <div className="p-3.5 rounded-xl bg-[#12161f] border border-[#21262d] space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#58a6ff] uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>FOCO ANALÍTICO</span>
              </div>
              <h4 className="text-xs font-semibold text-zinc-100 font-sans">
                {guide.foco}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {guide.aprenderás}
              </p>
            </div>
          )}

          {/* Disparadores Críticos */}
          {guide?.preguntas && guide.preguntas.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 px-0.5">
                <HelpCircle className="w-3 h-3 text-[#58a6ff]" />
                <span>DISPARADORES CRÍTICOS (Toca para preguntar)</span>
              </div>
              <div className="space-y-1.5">
                {guide.preguntas.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!isProcessing && onSelectQuestion) {
                        onSelectQuestion(q);
                        onClose();
                      }
                    }}
                    disabled={isProcessing}
                    className="w-full text-left p-2.5 rounded-xl text-xs text-zinc-300 hover:text-[#58a6ff] bg-[#12161f] hover:bg-[#1f6feb]/15 border border-[#21262d] hover:border-[#1f6feb]/40 transition-all flex items-start justify-between gap-2 leading-relaxed"
                  >
                    <span className="flex-1 font-sans">"{q}"</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#58a6ff] shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Biblioteca Esencial de Lecturas */}
          {book && (
            <div className="p-3.5 rounded-xl bg-[#12161f] border border-[#21262d] space-y-1.5">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-[#58a6ff]" />
                <span>BIBLIOTECA ESENCIAL</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-200">
                  {book.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {book.year}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-serif italic leading-relaxed">
                {book.whyRead}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#12161f] border-t border-[#21262d] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-[#1f6feb] text-white hover:bg-[#388bfd] transition-colors"
          >
            Volver al Diálogo
          </button>
        </div>
      </div>
    </div>
  );
};
