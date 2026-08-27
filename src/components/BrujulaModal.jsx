import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Compass, X, Search, BookOpen, ArrowRight, Sparkles, HelpCircle, Flame, Lightbulb } from 'lucide-react';
import { characters } from '../config/characters';

/**
 * 1. DICCIONARIO DE EXPANSIÓN SEMÁNTICA (THESAURUS)
 * Mapea términos cotidianos y emociones humanas hacia conceptos filosóficos equivalentes.
 */
const SEMANTIC_CLUSTERS = {
  felicidad: ['eudaimonia', 'beatitud', 'ataraxia', 'placer', 'alegria', 'bienestar', 'plenitud', 'gozo', 'serenidad', 'deseo', 'sentido', 'florecimiento', 'paz mental', 'paz'],
  tristeza: ['depresion', 'vacio', 'desanimo', 'angustia', 'pesimismo', 'sufrimiento', 'pasiones tristes', 'dolor', 'duelo', 'desengano', 'malheur', 'melancolia'],
  amor: ['afecto', 'pareja', 'relaciones', 'erotismo', 'eros', 'alteridad', 'empatia', 'compasion', 'soledad', 'cuidado', 'mujer', 'vulnerabilidad'],
  exito: ['productividad', 'rendimiento', 'dinero', 'trabajo', 'fracaso', 'autoexplotacion', 'ambicion', 'reconocimiento', 'burnout', 'progreso', 'empleo'],
  culpa: ['remordimiento', 'perdon', 'responsabilidad', 'mala fe', 'deber', 'moral', 'pecado', 'juicio', 'mauvaise foi', 'arrepentimiento', 'etica'],
  muerte: ['finitud', 'duelo', 'perdida', 'mortalidad', 'tiempo', 'destino', 'desdicha', 'transitoriedad', 'suicidio', 'morir'],
  rabia: ['ira', 'resentimiento', 'odio', 'venganza', 'fuerza', 'rebelion', 'injusticia', 'indignacion', 'violencia', 'bronca', 'enfado'],
  ansiedad: ['estres', 'control', 'incertidumbre', 'futuro', 'cansancio', 'miedo', 'angustia', 'preocupacion', 'panico', 'fatiga', 'insomnio'],
  verdad: ['mentira', 'engano', 'posverdad', 'realidad', 'hechos', 'dogmatismo', 'certeza', 'escepticismo', 'claridad', 'sesgos', 'ilusion', 'conocimiento'],
  sociedad: ['politica', 'poder', 'ley', 'justicia', 'estado', 'instituciones', 'normas', 'disciplina', 'opresion', 'biopolitica', 'vigilancia', 'cliches', 'feminismo', 'genero', 'democracia'],
};

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'a', 'al', 'en', 'para', 'por', 'con', 'sin', 'sobre', 'hacia', 'desde', 'hasta',
  'que', 'como', 'cuando', 'donde', 'porque', 'quiero', 'ser', 'estar', 'hacer', 'tener', 'saber',
  'sentir', 'decir', 'poder', 'pensar', 'me', 'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'yo',
  'el', 'ella', 'nosotros', 'ellos', 'muy', 'mas', 'menos', 'tan', 'tanto', 'mucho', 'poco',
  'todo', 'nada', 'algo', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas'
]);

const QUICK_CHIPS = [
  { label: '#Felicidad y Plenitud', query: 'felicidad eudaimonia ataraxia placer beatitud serenidad' },
  { label: '#Cansancio y Trabajo', query: 'cansancio trabajo rendimiento autoexplotacion burnout' },
  { label: '#Culpa y Moral', query: 'culpa moral remordimiento etica virtud juicio deber' },
  { label: '#Ansiedad y Control', query: 'ansiedad estres control incertidumbre miedo ataraxia' },
  { label: '#Feminismo y Género', query: 'feminismo genero opresion alteridad mujer situacion' },
  { label: '#Poder y Sociedad', query: 'sociedad poder vigilancia biopolitica normas instituciones' },
  { label: '#Libertad y Elección', query: 'libertad eleccion mala fe proyecto angustia responsabilidad' },
  { label: '#Amor y Duelo', query: 'amor duelo afectos compasion vulnerabilidad relaciones' },
  { label: '#Mente y Sombra', query: 'mente sombra inconsciente arquetipos proyeccion mascara' },
  { label: '#Verdad y Lenguaje', query: 'verdad lenguaje juegos de lenguaje claridad escepticismo' },
];

const normalizeText = (text = '') => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
};

export const BrujulaModal = ({ isOpen, onClose, onSelectMatch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState(null);
  const inputRef = useRef(null);

  // Auto-focus al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setActiveChip(null);
    }
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChipClick = (chip) => {
    if (activeChip === chip.label) {
      setActiveChip(null);
      setSearchQuery('');
    } else {
      setActiveChip(chip.label);
      setSearchQuery(chip.label.replace('#', ''));
    }
  };

  /**
   * 2. ALGORITMO DE COINCIDENCIA PONDERADA Y TOKENIZACIÓN CON EXPANSIÓN SEMÁNTICA
   */
  const matchedCharacters = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = normalizeText(rawQuery);

    // Si no hay búsqueda, mostramos una selección curada inicial
    if (!normalizedQuery) {
      const featuredIds = [
        'platon',
        'aristoteles',
        'byung_chul_han',
        'martha_nussbaum',
        'simone_de_beauvoir',
        'philippa_foot',
        'socrates',
        'nietzsche',
        'carl_jung',
        'hannah_arendt',
      ];
      return featuredIds
        .map((id) => characters.find((c) => c && c.id === id))
        .filter(Boolean)
        .map((char, index) => ({
          character: char,
          matchScore: 99 - index * 2,
          suggestedQuestion: char.criticalGuide?.preguntas?.[0] || '¿Cómo comenzamos este examen?',
        }));
    }

    // Tokenizar y filtrar stop-words
    const rawTokens = normalizedQuery
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

    // Si la consulta fue solo stop-words, usar las palabras tal cual
    const baseTokens = rawTokens.length > 0 ? rawTokens : normalizedQuery.split(/\s+/).filter(Boolean);

    // Expandir tokens con el diccionario semántico
    const directTokensSet = new Set(baseTokens);
    const expandedTokensSet = new Set();

    baseTokens.forEach((token) => {
      for (const [clusterKey, synonyms] of Object.entries(SEMANTIC_CLUSTERS)) {
        const normKey = normalizeText(clusterKey);
        const matchesKey = token === normKey || normKey.includes(token) || token.includes(normKey);
        const matchesSynonym = synonyms.some((syn) => {
          const normSyn = normalizeText(syn);
          return token === normSyn || normSyn.includes(token) || token.includes(normSyn);
        });

        if (matchesKey || matchesSynonym) {
          expandedTokensSet.add(normKey);
          synonyms.forEach((syn) => expandedTokensSet.add(normalizeText(syn)));
        }
      }
    });

    const directTokens = Array.from(directTokensSet);
    const expandedTokens = Array.from(expandedTokensSet);

    // Calcular puntuación ponderada para cada personaje
    const scored = characters.map((char) => {
      let score = 0;
      const normalizedName = normalizeText(char.name);
      const normalizedTitle = normalizeText(char.title);
      const normalizedQuote = normalizeText(char.quote);
      const normalizedFoco = normalizeText(char.criticalGuide?.foco || '');
      const normalizedAprenderas = normalizeText(char.criticalGuide?.aprenderás || '');
      const normalizedWhy = normalizeText(char.thematicAngles?.why || '');
      const normalizedBook = normalizeText(
        `${char.recommendedBook?.title || ''} ${char.recommendedBook?.whyRead || ''}`
      );
      const normalizedQuestions = (char.criticalGuide?.preguntas || [])
        .map((q) => normalizeText(q))
        .join(' ');
      const tags = (char.tags || []).map((t) => normalizeText(t));

      // a) Coincidencia directa en Nombre o Título (+15 pts)
      directTokens.forEach((token) => {
        if (normalizedName.includes(token)) score += 25;
        if (normalizedTitle.includes(token)) score += 15;
      });

      // b) Coincidencia en 'tags' (+30 pts por coincidencia)
      tags.forEach((tag) => {
        directTokens.forEach((token) => {
          if (tag === token) {
            score += 30;
          } else if (tag.includes(token) || token.includes(tag)) {
            score += 20;
          }
        });

        // Coincidencias semánticas ampliadas en tags (+15 pts)
        expandedTokens.forEach((expToken) => {
          if (tag === expToken) {
            score += 15;
          } else if (tag.includes(expToken)) {
            score += 10;
          }
        });
      });

      // c) Coincidencia en 'thematicAngles.why' (+25 pts)
      directTokens.forEach((token) => {
        if (normalizedWhy.includes(token)) score += 25;
      });
      expandedTokens.forEach((expToken) => {
        if (normalizedWhy.includes(expToken)) score += 12;
      });

      // d) Coincidencia en 'criticalGuide.foco' o 'aprenderas' (+20 pts)
      directTokens.forEach((token) => {
        if (normalizedFoco.includes(token)) score += 20;
        if (normalizedAprenderas.includes(token)) score += 18;
        if (normalizedQuestions.includes(token)) score += 15;
        if (normalizedQuote.includes(token)) score += 15;
        if (normalizedBook.includes(token)) score += 15;
      });
      expandedTokens.forEach((expToken) => {
        if (normalizedFoco.includes(expToken)) score += 10;
        if (normalizedAprenderas.includes(expToken)) score += 10;
        if (normalizedQuestions.includes(expToken)) score += 8;
        if (normalizedQuote.includes(expToken)) score += 8;
      });

      // Selección de la pregunta más afín al tema
      let bestQuestion = char.criticalGuide?.preguntas?.[0] || '¿Cómo examinamos este dilema?';
      if (char.criticalGuide?.preguntas && char.criticalGuide.preguntas.length > 0) {
        let maxQScore = -1;
        char.criticalGuide.preguntas.forEach((q) => {
          const normQ = normalizeText(q);
          let qScore = 0;
          directTokens.forEach((token) => {
            if (normQ.includes(token)) qScore += 15;
          });
          expandedTokens.forEach((expToken) => {
            if (normQ.includes(expToken)) qScore += 8;
          });
          if (qScore > maxQScore) {
            maxQScore = qScore;
            bestQuestion = q;
          }
        });
      }

      return {
        character: char,
        score,
        suggestedQuestion: bestQuestion,
      };
    });

    const filtered = scored.filter((item) => item.score > 0);
    filtered.sort((a, b) => b.score - a.score);

    if (filtered.length === 0) {
      return [];
    }

    // Calcular match percentage normalizado (entre 75% y 99%)
    const maxScore = filtered[0]?.score || 1;
    return filtered.slice(0, 4).map((item, idx) => {
      const ratio = item.score / maxScore;
      const matchPercentage = Math.min(99, Math.max(75, Math.round(75 + ratio * 24) - idx * 2));
      return {
        character: item.character,
        matchScore: matchPercentage,
        suggestedQuestion: item.suggestedQuestion,
      };
    });
  }, [searchQuery]);

  /**
   * 4. ESTADO VACÍO INTELIGENTE (NO RESULTS FALLBACK)
   * Si no hay coincidencias exactas, selecciona los 4 pensadores con mayor intensidad analítica.
   */
  const fallbackTopCharacters = useMemo(() => {
    const list = [...characters].filter(Boolean);
    list.sort((a, b) => (b.analyticalIntensity || 0) - (a.analyticalIntensity || 0));
    return list.slice(0, 4).map((char, index) => ({
      character: char,
      matchScore: 99 - index * 2,
      suggestedQuestion: char.criticalGuide?.preguntas?.[0] || '¿Cómo comenzamos este examen?',
    }));
  }, []);

  if (!isOpen) return null;

  const isSearchActive = searchQuery.trim().length > 0;
  const hasMatches = matchedCharacters.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn select-none">
      {/* Contenedor Modal */}
      <div className="bg-[#0b0e14] border border-[#21262d] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-[#12161f] border-b border-[#21262d] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#58a6ff] shadow-inner">
              <Compass className="w-5 h-5 animate-pulse text-[#58a6ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  BRÚJULA DIALÉCTICA
                </h2>
                <span className="text-[10px] font-mono font-bold bg-[#1f6feb]/20 text-[#58a6ff] px-2 py-0.5 rounded-full border border-[#1f6feb]/40 uppercase">
                  MOTOR IA
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Encuentra al pensador indicado para tu dilema, emoción o concepto en lenguaje cotidiano
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Búsqueda Reactiva & Chips */}
        <div className="p-4 sm:p-5 bg-[#0e1218] border-b border-[#21262d] space-y-3 shrink-0">
          {/* Input de Búsqueda */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveChip(null);
              }}
              placeholder="Describe tu emoción o dilema (ej. quiero ser feliz, culpa por descansar, tristeza, éxito)..."
              className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/40 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveChip(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Píldoras / Chips de Acceso Rápido */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#58a6ff]" />
              TEMAS UNIVERSALES:
            </span>
            {QUICK_CHIPS.map((chip) => {
              const isSelected = activeChip === chip.label;
              return (
                <button
                  key={chip.label}
                  onClick={() => handleChipClick(chip)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-mono transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1f6feb] text-white font-semibold shadow-md shadow-[#1f6feb]/30 border border-[#58a6ff]'
                      : 'bg-[#161b22] text-zinc-400 hover:text-zinc-200 hover:bg-[#21262d] border border-[#30363d]/60'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listado de Recomendaciones */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar bg-[#0b0e14]">
          {/* Caso 1: Búsqueda sin coincidencias directas -> Mensaje amigable + Fallback inteligente */}
          {isSearchActive && !hasMatches ? (
            <div className="space-y-5">
              <div className="text-center py-6 px-4 rounded-2xl bg-[#12161f] border border-[#21262d] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center mx-auto text-amber-400">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  No encontramos una coincidencia exacta para ese término.
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Prueba explorando estos temas universales en las píldoras superiores o consulta a los filósofos con <strong className="text-[#58a6ff]">mayor intensidad analítica</strong> sugeridos a continuación:
                </p>
              </div>

              {/* Render de los pensadores de máxima intensidad analítica como sugerencia */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-[#58a6ff]" />
                  <span>SUGERENCIA POR MÁXIMA INTENSIDAD ANALÍTICA:</span>
                </div>

                {fallbackTopCharacters.map(({ character: char, matchScore, suggestedQuestion }) => (
                  <CharacterCard
                    key={char.id}
                    char={char}
                    matchScore={matchScore}
                    suggestedQuestion={suggestedQuestion}
                    onSelectMatch={onSelectMatch}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Caso 2: Coincidencias encontradas o lista por defecto */
            matchedCharacters.map(({ character: char, matchScore, suggestedQuestion }) => (
              <CharacterCard
                key={char.id}
                char={char}
                matchScore={matchScore}
                suggestedQuestion={suggestedQuestion}
                onSelectMatch={onSelectMatch}
              />
            ))
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-3 sm:p-4 bg-[#12161f] border-t border-[#21262d] flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
          <span>Presiona ESC para cerrar</span>
          <span>18 PENSADORES CALIBRADOS // ONLINE</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Subcomponente de Tarjeta de Personaje para la Brújula Dialéctica
 */
const CharacterCard = ({ char, matchScore, suggestedQuestion, onSelectMatch }) => {
  const avatarImg = char.avatar || char.avatarUrl;
  const whyDebate = char.thematicAngles?.why || char.criticalGuide?.aprenderás;
  const book = char.recommendedBook;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#12161f] border border-[#21262d] hover:border-[#1f6feb]/50 transition-all duration-200 space-y-4 shadow-lg shadow-black/40 group">
      {/* Fila Superior: Avatar + Nombre + Afinidad */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0">
            {avatarImg ? (
              <img
                src={avatarImg}
                alt={char.name}
                className="w-full h-full object-cover filter contrast-125 grayscale group-hover:grayscale-0 transition-all duration-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              className="text-xl"
              style={{ display: avatarImg ? 'none' : 'flex' }}
            >
              🏛️
            </span>
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white font-sans truncate">
                {char.name}
              </h3>
              <span className="text-[11px] font-mono text-zinc-500 truncate">
                • {char.era}
              </span>
            </div>
            <p className="text-xs text-[#58a6ff] font-sans truncate">
              {char.title}
            </p>
          </div>
        </div>

        {/* Tag de Afinidad */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1f6feb]/15 border border-[#1f6feb]/40 text-[#58a6ff] font-mono text-xs font-bold shadow-sm">
          <Flame className="w-3.5 h-3.5 text-[#58a6ff]" />
          <span>{matchScore}% MATCH</span>
        </div>
      </div>

      {/* Bloque: ¿Por qué debatir este tema con él/ella? */}
      {whyDebate && (
        <div className="space-y-1 bg-[#161b22]/70 p-3 rounded-xl border border-[#30363d]/50">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1">
            <span>💡 ¿POR QUÉ ESTE AUTOR?</span>
          </div>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            {whyDebate}
          </p>
        </div>
      )}

      {/* Disparador Sugerido */}
      {suggestedQuestion && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3 text-[#58a6ff]" />
            <span>DISPARADOR SUGERIDO:</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0b0e14] border border-[#21262d] text-xs text-zinc-300 font-serif italic leading-relaxed">
            "{suggestedQuestion}"
          </div>
        </div>
      )}

      {/* Bloque Visual: LECTURA DE REFERENCIA */}
      {book && (
        <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d]/60 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#58a6ff] uppercase font-bold tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>LECTURA DE REFERENCIA:</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {book.year}
            </span>
          </div>
          <div className="text-xs font-bold text-zinc-200 font-sans">
            {book.title} <span className="text-zinc-400 font-normal">— {book.author}</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-serif italic leading-relaxed">
            {book.whyRead}
          </p>
        </div>
      )}

      {/* Botón de Acción Principal */}
      <button
        onClick={() => onSelectMatch(char, suggestedQuestion)}
        className="w-full py-2.5 px-4 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#1f6feb]/20 hover:shadow-[#1f6feb]/40 cursor-pointer"
      >
        <span>Comenzar debate con {char.name}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
