import React from 'react';

/**
 * Catálogo visual de avatares iconográficos y tipográficos para los pensadores.
 * Cada personaje tiene un monograma de 3 letras, un icono filosófico y una paleta de color.
 */
const PHILOSOPHER_META = {
  // Filósofos
  socrates: { monogram: 'SOC', icon: '🏛️', gradient: 'from-blue-900/90 to-slate-950', border: 'border-blue-500/40', text: 'text-blue-300' },
  platon: { monogram: 'PLA', icon: '🏺', gradient: 'from-amber-900/90 to-slate-950', border: 'border-amber-500/40', text: 'text-amber-300' },
  aristoteles: { monogram: 'ARI', icon: '📜', gradient: 'from-emerald-900/90 to-slate-950', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  nietzsche: { monogram: 'NIE', icon: '⚡', gradient: 'from-red-900/90 to-slate-950', border: 'border-red-500/40', text: 'text-red-300' },
  marcus_aurelius: { monogram: 'AUR', icon: '👑', gradient: 'from-amber-900/90 to-slate-950', border: 'border-amber-400/40', text: 'text-amber-200' },
  marco_aurelio: { monogram: 'AUR', icon: '👑', gradient: 'from-amber-900/90 to-slate-950', border: 'border-amber-400/40', text: 'text-amber-200' },
  david_hume: { monogram: 'HUM', icon: '🕯️', gradient: 'from-cyan-900/90 to-slate-950', border: 'border-cyan-500/40', text: 'text-cyan-300' },
  hume: { monogram: 'HUM', icon: '🕯️', gradient: 'from-cyan-900/90 to-slate-950', border: 'border-cyan-500/40', text: 'text-cyan-300' },
  immanuel_kant: { monogram: 'KAN', icon: '📐', gradient: 'from-purple-900/90 to-slate-950', border: 'border-purple-500/40', text: 'text-purple-300' },
  kant: { monogram: 'KAN', icon: '📐', gradient: 'from-purple-900/90 to-slate-950', border: 'border-purple-500/40', text: 'text-purple-300' },
  arthur_schopenhauer: { monogram: 'SCH', icon: '🌑', gradient: 'from-zinc-800 to-slate-950', border: 'border-zinc-500/40', text: 'text-zinc-300' },
  schopenhauer: { monogram: 'SCH', icon: '🌑', gradient: 'from-zinc-800 to-slate-950', border: 'border-zinc-500/40', text: 'text-zinc-300' },
  carl_jung: { monogram: 'JUN', icon: '🌀', gradient: 'from-indigo-900/90 to-slate-950', border: 'border-indigo-500/40', text: 'text-indigo-300' },
  jung: { monogram: 'JUN', icon: '🌀', gradient: 'from-indigo-900/90 to-slate-950', border: 'border-indigo-500/40', text: 'text-indigo-300' },
  baruch_spinoza: { monogram: 'SPI', icon: '✨', gradient: 'from-teal-900/90 to-slate-950', border: 'border-teal-500/40', text: 'text-teal-300' },
  spinoza: { monogram: 'SPI', icon: '✨', gradient: 'from-teal-900/90 to-slate-950', border: 'border-teal-500/40', text: 'text-teal-300' },
  albert_camus: { monogram: 'CAM', icon: '☕', gradient: 'from-orange-900/90 to-slate-950', border: 'border-orange-500/40', text: 'text-orange-300' },
  camus: { monogram: 'CAM', icon: '☕', gradient: 'from-orange-900/90 to-slate-950', border: 'border-orange-500/40', text: 'text-orange-300' },
  ludwig_wittgenstein: { monogram: 'WIT', icon: '🔤', gradient: 'from-sky-900/90 to-slate-950', border: 'border-sky-500/40', text: 'text-sky-300' },
  wittgenstein: { monogram: 'WIT', icon: '🔤', gradient: 'from-sky-900/90 to-slate-950', border: 'border-sky-500/40', text: 'text-sky-300' },
  byung_chul_han: { monogram: 'HAN', icon: '⏳', gradient: 'from-rose-900/90 to-slate-950', border: 'border-rose-500/40', text: 'text-rose-300' },
  michel_foucault: { monogram: 'FOU', icon: '👁️', gradient: 'from-violet-900/90 to-slate-950', border: 'border-violet-500/40', text: 'text-violet-300' },
  foucault: { monogram: 'FOU', icon: '👁️', gradient: 'from-violet-900/90 to-slate-950', border: 'border-violet-500/40', text: 'text-violet-300' },
  jean_paul_sartre: { monogram: 'SAR', icon: '🚬', gradient: 'from-yellow-900/90 to-slate-950', border: 'border-yellow-500/40', text: 'text-yellow-300' },
  sartre: { monogram: 'SAR', icon: '🚬', gradient: 'from-yellow-900/90 to-slate-950', border: 'border-yellow-500/40', text: 'text-yellow-300' },
  hannah_arendt: { monogram: 'ARE', icon: '⚖️', gradient: 'from-pink-900/90 to-slate-950', border: 'border-pink-500/40', text: 'text-pink-300' },
  arendt: { monogram: 'ARE', icon: '⚖️', gradient: 'from-pink-900/90 to-slate-950', border: 'border-pink-500/40', text: 'text-pink-300' },
  simone_de_beauvoir: { monogram: 'BEA', icon: '🕊️', gradient: 'from-fuchsia-900/90 to-slate-950', border: 'border-fuchsia-500/40', text: 'text-fuchsia-300' },
  beauvoir: { monogram: 'BEA', icon: '🕊️', gradient: 'from-fuchsia-900/90 to-slate-950', border: 'border-fuchsia-500/40', text: 'text-fuchsia-300' },
  simone_weil: { monogram: 'WEI', icon: '🌾', gradient: 'from-amber-900/90 to-slate-950', border: 'border-amber-500/40', text: 'text-amber-300' },
  weil: { monogram: 'WEI', icon: '🌾', gradient: 'from-amber-900/90 to-slate-950', border: 'border-amber-500/40', text: 'text-amber-300' },
  philippa_foot: { monogram: 'FOO', icon: '🛤️', gradient: 'from-emerald-900/90 to-slate-950', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  foot: { monogram: 'FOO', icon: '🛤️', gradient: 'from-emerald-900/90 to-slate-950', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  martha_nussbaum: { monogram: 'NUS', icon: '🎭', gradient: 'from-blue-900/90 to-slate-950', border: 'border-blue-500/40', text: 'text-blue-300' },
  nussbaum: { monogram: 'NUS', icon: '🎭', gradient: 'from-blue-900/90 to-slate-950', border: 'border-blue-500/40', text: 'text-blue-300' },

  // Físicos y Matemáticos
  einstein: { monogram: 'EIN', icon: '⚛️', gradient: 'from-cyan-900/90 to-slate-950', border: 'border-cyan-500/40', text: 'text-cyan-300' },
  feynman: { monogram: 'FEY', icon: '🥁', gradient: 'from-orange-900/90 to-slate-950', border: 'border-orange-500/40', text: 'text-orange-300' },
  godel: { monogram: 'GÖD', icon: '🔢', gradient: 'from-purple-900/90 to-slate-950', border: 'border-purple-500/40', text: 'text-purple-300' },
  turing: { monogram: 'TUR', icon: '💻', gradient: 'from-emerald-900/90 to-slate-950', border: 'border-emerald-500/40', text: 'text-emerald-300' },
};

const DEFAULT_META = {
  monogram: 'PHI',
  icon: '🏛️',
  gradient: 'from-slate-800 to-slate-950',
  border: 'border-slate-600/40',
  text: 'text-slate-300',
};

const SIZE_CONFIGS = {
  xs: {
    container: 'w-5 h-5 rounded-md',
    monogramText: 'text-[8px]',
    iconText: 'text-[9px]',
    badgeIcon: 'text-[7px]',
  },
  sm: {
    container: 'w-8 h-8 rounded-xl',
    monogramText: 'text-[11px]',
    iconText: 'text-xs',
    badgeIcon: 'text-[9px]',
  },
  md: {
    container: 'w-10 h-10 rounded-xl',
    monogramText: 'text-xs',
    iconText: 'text-base',
    badgeIcon: 'text-[10px]',
  },
  lg: {
    container: 'w-12 h-12 rounded-2xl',
    monogramText: 'text-sm',
    iconText: 'text-xl',
    badgeIcon: 'text-xs',
  },
  xl: {
    container: 'w-14 h-14 rounded-2xl',
    monogramText: 'text-base',
    iconText: 'text-2xl',
    badgeIcon: 'text-sm',
  },
};

/**
 * Genera iniciales a partir del nombre si no se encuentra en el mapa predefinido
 */
const getFallbackMonogram = (name = '') => {
  if (!name) return 'PHI';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }
  return parts.map((p) => p[0]).join('').slice(0, 3).toUpperCase();
};

export const getPhilosopherMonogram = (charId = '', charName = '') => {
  const cleanId = (charId || '').toLowerCase().trim();
  const meta = PHILOSOPHER_META[cleanId];
  if (meta && meta.monogram) return meta.monogram;
  return getFallbackMonogram(charName);
};

export const PhilosopherAvatar = ({
  character = null,
  id = null,
  name = '',
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const charId = (id || character?.id || '').toLowerCase().trim();
  const charName = name || character?.name || '';
  const meta = PHILOSOPHER_META[charId] || DEFAULT_META;
  const monogram = meta !== DEFAULT_META ? meta.monogram : getFallbackMonogram(charName);
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 bg-gradient-to-br ${meta.gradient} border ${meta.border} shadow-inner select-none font-mono font-bold ${meta.text} ${sizeConfig.container} ${className}`}
      title={charName || charId}
    >
      {/* Monograma Tipográfico Principal */}
      <span className={`tracking-wider ${sizeConfig.monogramText}`}>
        {monogram}
      </span>

      {/* Mini Insignia Iconográfica Flotante (Esquina superior/inferior) */}
      {showIcon && meta.icon && size !== 'xs' && (
        <span
          className={`absolute -bottom-1 -right-1 leading-none drop-shadow ${sizeConfig.badgeIcon}`}
          aria-hidden="true"
        >
          {meta.icon}
        </span>
      )}
    </div>
  );
};
