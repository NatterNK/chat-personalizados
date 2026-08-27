import React from 'react';
import { Sparkles, Landmark, Atom, Binary, Compass, ArrowUpRight, HelpCircle, BookOpen, X } from 'lucide-react';
import { CATEGORIES } from '../config/characters';

const ICONS_MAP = {
  Landmark: Landmark,
  Atom: Atom,
  Binary: Binary,
};

export const Sidebar = ({
  activeCategory = 'filosofos',
  onSelectCategory,
  activeCharacter = null,
  onSelectQuestion,
  onOpenBrujula,
  isProcessing = false,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const guide = activeCharacter?.criticalGuide;
  const book = activeCharacter?.recommendedBook;

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full space-y-5">
      <div className="space-y-5">
        {/* Logo superior con botón de cerrar en móvil */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#58a6ff] shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white font-sans">
              Diálogos
            </span>
          </div>

          {/* Botón cerrar en móvil */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors"
            title="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botón Destacado: BRÚJULA DIALÉCTICA */}
        <button
          onClick={() => {
            onOpenBrujula?.();
            onCloseMobile?.();
          }}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#10243e] to-[#12161f] hover:from-[#1f6feb]/25 hover:to-[#161b22] border border-[#1f6feb]/40 hover:border-[#58a6ff] text-[#58a6ff] transition-all duration-200 shadow-md group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-[#58a6ff] group-hover:rotate-45 transition-transform duration-300" />
            <span className="font-sans">Brújula Dialéctica</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40">
            IA
          </span>
        </button>

        {/* Sección de Categorías */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-1.5">
            CATEGORÍAS
          </h3>

          <nav className="space-y-1.5">
            {CATEGORIES.map((cat) => {
              const IconComponent = ICONS_MAP[cat.iconName] || Landmark;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#10243e] text-[#58a6ff] border border-[#1f6feb]/40 shadow-inner'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]/70'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#58a6ff]' : 'text-zinc-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Panel de Guía de Indagación Crítica + Biblioteca Esencial (En escritorio) */}
        {guide && (
          <div className="hidden md:block p-4 sm:p-5 rounded-2xl bg-[#12161f] border border-[#21262d] space-y-3.5 shadow-lg shadow-black/30">
            {/* Header del Foco */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#58a6ff] bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#58a6ff]" />
                FOCO ANALÍTICO
              </span>
            </div>

            {/* Foco y Qué aprenderás */}
            <div className="space-y-1.5">
              <h4 className="text-xs sm:text-[13px] font-semibold text-zinc-100 font-sans leading-snug">
                {guide.foco}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {guide.aprenderás}
              </p>
            </div>

            {/* Preguntas Sugeridas / Disparadores como tarjetas completas */}
            {guide.preguntas && guide.preguntas.length > 0 && (
              <div className="pt-2.5 border-t border-[#21262d] space-y-2">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 px-0.5">
                  <HelpCircle className="w-3 h-3 text-[#58a6ff]" />
                  <span>DISPARADORES CRÍTICOS</span>
                </div>
                <div className="space-y-2">
                  {guide.preguntas.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!isProcessing && onSelectQuestion) {
                          onSelectQuestion(q);
                          onCloseMobile?.();
                        }
                      }}
                      disabled={isProcessing}
                      className="w-full text-left p-3 rounded-xl text-xs text-zinc-300 hover:text-[#58a6ff] bg-[#161b22] hover:bg-[#1f6feb]/15 border border-[#30363d]/60 hover:border-[#1f6feb]/40 transition-all duration-150 group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-start justify-between gap-2 leading-relaxed whitespace-normal shadow-sm"
                      title="Haz clic para cargar esta pregunta en el debate"
                    >
                      <span className="flex-1 font-sans">"{q}"</span>
                      <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-[#58a6ff] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Biblioteca Esencial de Lecturas */}
            {book && (
              <div className="pt-2.5 border-t border-[#21262d] space-y-2">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 px-0.5">
                  <BookOpen className="w-3 h-3 text-[#58a6ff]" />
                  <span>BIBLIOTECA ESENCIAL</span>
                </div>
                <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d]/60 space-y-1.5 shadow-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-200 font-sans leading-snug">
                      {book.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {book.year}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-serif italic leading-relaxed">
                    {book.whyRead}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Indicador de estado terminal inferior */}
      <div className="pt-4 mt-6 border-t border-[#1e2633]/60 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1f6feb] glow-blue" />
          <span className="text-[10px] font-mono text-zinc-500">v2.5 // ONLINE</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Sidebar para Escritorio (Fijo) */}
      <aside className="hidden md:flex w-80 min-w-[320px] bg-[#0b0e14] border-r border-[#1e2633] flex-col justify-between p-4 sm:p-5 select-none shrink-0 overflow-y-auto custom-scrollbar">
        {sidebarContent}
      </aside>

      {/* 2. Drawer para Móvil (Overlay deslizante) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex select-none">
          {/* Backdrop semitransparente */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={onCloseMobile}
          />

          {/* Panel deslizante */}
          <div className="relative z-10 w-[85%] max-w-xs bg-[#0b0e14] border-r border-[#21262d] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar animate-slideRight shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
