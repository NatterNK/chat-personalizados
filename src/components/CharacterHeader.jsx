import React from 'react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';

export const CharacterHeader = ({
  character,
  onResetSession,
  isProcessing = false,
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
}) => {
  if (!character) return null;

  const intensity = character.analyticalIntensity || 85;
  const avatarImage = character.avatar || character.avatarUrl;

  return (
    <div className="w-full bg-[#12161f] border border-[#21262d] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-black/40">
      {/* Lado izquierdo: Avatar + Nombre + Estado + Cita Completa */}
      <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
        {/* Avatar Frame con retrato fotográfico real */}
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0 shadow-inner mt-0.5 sm:mt-0">
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={character.name}
              className="w-full h-full object-cover filter contrast-125 brightness-95 grayscale hover:grayscale-0 transition-all duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className="text-2xl"
            style={{ display: avatarImage ? 'none' : 'flex' }}
          >
            🏛️
          </span>
        </div>

        {/* Info, Estado y Cita Completa sin Truncar */}
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100 font-sans tracking-tight">
              {character.name}
            </h2>
            <span className="font-mono text-xs font-bold text-[#58a6ff] flex items-center gap-1.5 shrink-0 bg-[#1f6feb]/15 px-2.5 py-0.5 rounded-full border border-[#1f6feb]/30">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-pulse"></span>
              ACTIVO
            </span>
          </div>

          {/* Cita Completa con salto de línea natural y tipografía editorial */}
          <p className="text-xs sm:text-sm text-zinc-400 font-serif italic whitespace-normal leading-relaxed">
            "{character.quote}"
          </p>
        </div>
      </div>

      {/* Lado derecho: Control de Auto-Lectura + Intensidad Analítica + Botón Reset */}
      <div className="flex items-center gap-3 sm:gap-4 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#21262d] w-full md:w-auto justify-between md:justify-end">
        {/* Toggle de Auto-Lectura */}
        <button
          type="button"
          onClick={onToggleAutoSpeak}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            autoSpeakEnabled
              ? 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/50 shadow-sm'
              : 'bg-[#161b22] text-zinc-400 hover:text-zinc-200 border-[#30363d]'
          }`}
          title={
            autoSpeakEnabled
              ? 'Auto-Lectura activada: la IA hablará automáticamente (clic para silenciar)'
              : 'Auto-Lectura silenciada: la IA responderá solo con texto (clic para activar voz automática)'
          }
        >
          {autoSpeakEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-[#58a6ff]" />
              <span className="font-mono text-[11px]">Voz ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-zinc-500" />
              <span className="font-mono text-[11px]">Voz OFF</span>
            </>
          )}
        </button>

        {/* Intensidad Analítica */}
        <div className="flex flex-col items-start md:items-end gap-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            INTENSIDAD ANALÍTICA{' '}
            <span className="text-[#58a6ff] font-bold">{intensity}%</span>
          </div>
          <div className="w-28 sm:w-40 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1f6feb] transition-all duration-500 rounded-full"
              style={{ width: `${intensity}%` }}
            />
          </div>
        </div>

        {/* Botón discreto para reiniciar sesión */}
        <button
          onClick={onResetSession}
          disabled={isProcessing}
          className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Reiniciar sesión de este personaje"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
