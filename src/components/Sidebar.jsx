import React from 'react';
import {
  Sparkles,
  Landmark,
  Atom,
  Binary,
  Compass,
  ArrowUpRight,
  HelpCircle,
  BookOpen,
  X,
  Flame,
  MessageSquare,
} from 'lucide-react';
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
  activeView = 'dojo',
  onSelectView,
  isProcessing = false,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const guide = activeCharacter?.criticalGuide;
  const book = activeCharacter?.recommendedBook;

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full space-y-4">
      <div className="space-y-4">
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

        {/* MODOS PRINCIPALES DE EXPLORACIÓN */}
        <div className="space-y-1.5 bg-[#12161f] p-1.5 rounded-2xl border border-[#21262d]">
          {/* Modo: Diálogo Libre */}
          <button
            type="button"
            onClick={() => {
              onSelectView?.('dojo');
              onCloseMobile?.();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'dojo'
                ? 'bg-[#1f6feb] text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Dojo Libre</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">24 Pensadores</span>
          </button>

          {/* Modo: La Forja Conceptual */}
          <button
            type="button"
            onClick={() => {
              onSelectView?.('forge');
              onCloseMobile?.();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'forge'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                : 'text-amber-400/90 hover:text-amber-300 hover:bg-[#161b22]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Forja Conceptual</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
              RUTAS
            </span>
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

        {/* Sección de Categorías (Visible cuando se está en modo Dojo) */}
        {activeView === 'dojo' && (
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
        )}

        {/* Panel de Guía de Indagación Crítica + Biblioteca Esencial (En escritorio, modo dojo) */}
        {activeView === 'dojo' && guide && (
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
              <h4 className="text-xs font-bold text-zinc-200 font-sans">
                {guide.foco}
              </h4>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                {guide.aprenderás}
              </p>
            </div>

            {/* Disparadores Críticos de Debate */}
            {guide.preguntas && guide.preguntas.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#21262d]">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  <HelpCircle className="w-3 h-3 text-[#58a6ff]" />
                  <span>DISPARADORES CRÍTICOS:</span>
                </div>

                <div className="space-y-1.5">
                  {guide.preguntas.map((pregunta, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectQuestion?.(pregunta);
                        onCloseMobile?.();
                      }}
                      disabled={isProcessing}
                      className="w-full text-left p-2.5 rounded-xl bg-[#161b22] hover:bg-[#1f6feb]/20 border border-[#30363d] hover:border-[#1f6feb]/50 text-xs text-zinc-300 hover:text-white transition-all duration-150 flex items-start gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-[#58a6ff] text-xs font-mono font-bold group-hover:translate-x-0.5 transition-transform shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-sans leading-snug line-clamp-2">
                        {pregunta}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Biblioteca Esencial de Lecturas */}
            {book && (
              <div className="pt-2 border-t border-[#21262d] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  <span>BIBLIOTECA ESENCIAL:</span>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="text-xs font-bold text-zinc-200 font-sans">
                      {book.title}
                    </h5>
                    {book.year && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        {book.year}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-serif italic">
                    {book.whyRead}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer del sidebar */}
      <div className="pt-4 border-t border-[#21262d] text-center text-xs text-zinc-500 font-mono">
        <p>DIÁLOGOS V2.5 // AGY</p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. SIDEBAR DE ESCRITORIO (md:flex) */}
      <aside className="hidden md:flex flex-col w-80 lg:w-96 bg-[#0e1217] border-r border-[#21262d] p-5 h-full overflow-y-auto custom-scrollbar shrink-0">
        {sidebarContent}
      </aside>

      {/* 2. DRAWER OVERLAY PARA MÓVILES (< md) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          {/* Backdrop con Blur */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Panel Deslizante Lateral */}
          <div className="relative w-4/5 max-w-sm bg-[#0e1217] border-r border-[#21262d] p-4 h-full overflow-y-auto custom-scrollbar flex flex-col z-10 shadow-2xl animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
