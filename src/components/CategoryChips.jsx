import React from 'react';

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
            {/* Miniatura circular del retrato real */}
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#161b22] border border-white/20 shrink-0 flex items-center justify-center">
              {char.avatar ? (
                <img
                  src={char.avatar}
                  alt={char.name}
                  className="w-full h-full object-cover grayscale contrast-125"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-[10px]">🏛️</span>
              )}
            </div>

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
