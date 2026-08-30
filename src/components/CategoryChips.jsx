import React from 'react';
import { PhilosopherAvatar } from './PhilosopherAvatar';

export const CategoryChips = ({
  characters = [],
  selectedId,
  onSelectCharacter,
  disabled = false,
}) => {
  if (!characters || characters.length === 0) {
    return (
      <div className="text-xs text-zinc-500 py-2">
        No se encontraron personajes coincidentes.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar select-none">
      {characters.map((char) => {
        const isSelected = char.id === selectedId;

        return (
          <button
            key={char.id}
            onClick={() => !disabled && onSelectCharacter(char.id)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 shrink-0 ${
              isSelected
                ? 'bg-[#1f6feb] text-white shadow-sm ring-1 ring-[#388bfd]'
                : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white border border-[#30363d]/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Avatar tipográfico miniatura */}
            <PhilosopherAvatar character={char} size="xs" showIcon={false} />

            <span>{char.name}</span>

            {isSelected && (
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
};
