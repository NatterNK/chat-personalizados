import React from 'react';
import { UserCheck, Sparkles } from 'lucide-react';

const COLOR_STYLES = {
  amber: {
    active: 'bg-amber-500/20 text-amber-200 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50',
    hover: 'hover:border-amber-500/50 hover:bg-amber-500/10',
    dot: 'bg-amber-400',
  },
  rose: {
    active: 'bg-rose-500/20 text-rose-200 border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50',
    hover: 'hover:border-rose-500/50 hover:bg-rose-500/10',
    dot: 'bg-rose-400',
  },
  emerald: {
    active: 'bg-emerald-500/20 text-emerald-200 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50',
    hover: 'hover:border-emerald-500/50 hover:bg-emerald-500/10',
    dot: 'bg-emerald-400',
  },
};

export const PhilosopherSelector = ({
  philosophers = [],
  selectedId,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
      {philosophers.map((phil) => {
        const isSelected = phil.id === selectedId;
        const style = COLOR_STYLES[phil.color] || COLOR_STYLES.amber;

        return (
          <button
            key={phil.id}
            onClick={() => !disabled && onSelect(phil.id)}
            disabled={disabled}
            className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-2xl text-left border transition-all duration-300 ${
              isSelected
                ? style.active
                : `bg-zinc-900/80 text-zinc-300 border-zinc-800/80 ${style.hover} hover:text-zinc-100`
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="text-2xl filter drop-shadow">{phil.avatar}</div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <span>{phil.name}</span>
                {isSelected && <UserCheck className="w-3.5 h-3.5 opacity-90" />}
              </div>
              <span className="text-[11px] text-zinc-400 font-normal">
                {phil.era}
              </span>
            </div>

            {isSelected && (
              <span
                className={`absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full ${style.dot}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
