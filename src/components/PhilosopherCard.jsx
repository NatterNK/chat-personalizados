import React from 'react';
import { RotateCcw, Quote } from 'lucide-react';

const ACCENT_COLORS = {
  amber: {
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    quoteBg: 'border-amber-500/20 bg-amber-950/20 text-amber-200/90',
    btn: 'hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/30',
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    quoteBg: 'border-rose-500/20 bg-rose-950/20 text-rose-200/90',
    btn: 'hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30',
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    quoteBg: 'border-emerald-500/20 bg-emerald-950/20 text-emerald-200/90',
    btn: 'hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/30',
  },
};

export const PhilosopherCard = ({ philosopher, onResetDialogue, isProcessing }) => {
  if (!philosopher) return null;

  const style = ACCENT_COLORS[philosopher.color] || ACCENT_COLORS.amber;

  return (
    <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Información del filósofo */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="text-3xl p-2 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 shadow-inner flex items-center justify-center">
            {philosopher.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-serif font-semibold text-zinc-100">
                {philosopher.name}
              </h2>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${style.badge}`}
              >
                {philosopher.era}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              {philosopher.title}
            </p>
          </div>
        </div>

        {/* Botón de reinicio */}
        <button
          onClick={onResetDialogue}
          disabled={isProcessing}
          className={`self-end sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-zinc-400 border border-zinc-800 transition-all duration-200 ${style.btn} ${
            isProcessing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title="Reiniciar diálogo y contexto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar debate</span>
        </button>
      </div>

      {/* Cita filosófica destacada */}
      <div
        className={`mt-3.5 pt-3 border-t flex items-start gap-2.5 text-xs italic ${style.quoteBg} px-3.5 py-2.5 rounded-xl border`}
      >
        <Quote className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
        <span className="leading-relaxed">"{philosopher.tagline}"</span>
      </div>
    </div>
  );
};
