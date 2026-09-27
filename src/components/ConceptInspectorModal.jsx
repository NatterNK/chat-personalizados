import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Search, X, Copy, Check, Sparkles, ArrowRight } from 'lucide-react';
import { inspectConcept } from '../services/gemini';
import { MarkdownRenderer } from './MarkdownRenderer';

const FREQUENT_CONCEPTS = [
  'Aporía',
  'Eudaimonía',
  'Mala fe (Mauvaise foi)',
  'Biopolítica',
  'Imperativo Categórico',
  'Ataraxia',
  'Resentimiento',
  'Alienación',
  'Solipsismo',
  'Teleología',
];

export const ConceptInspectorModal = ({
  isOpen,
  onClose,
  onInsertIntoChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentConcept, setCurrentConcept] = useState('');
  const [definition, setDefinition] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const inputRef = useRef(null);

  // Auto-focus al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setErrorMessage('');
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async (termToSearch) => {
    const term = (termToSearch || searchTerm).trim();
    if (!term || isLoading) return;

    setCurrentConcept(term);
    setIsLoading(true);
    setErrorMessage('');
    setDefinition('');

    try {
      const result = await inspectConcept(term);
      setDefinition(result);
    } catch (err) {
      console.error('[ConceptInspector Error]:', err);
      setErrorMessage(err?.message || 'Error al obtener la definición conceptual.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!definition) return;
    navigator.clipboard.writeText(`Concepto: ${currentConcept}\n\n${definition}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendToChat = () => {
    if (!currentConcept) return;
    onInsertIntoChat?.(`Quiero que examinemos a fondo el concepto de "${currentConcept}" a la luz de mi propia vida y dilemas.`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none">
      {/* Contenedor Modal */}
      <div className="bg-[#0b0e14] border border-[#21262d] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans">
        
        {/* Cabecera del Inspector */}
        <div className="p-4 sm:p-5 bg-[#12161f] border-b border-[#21262d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#58a6ff] shadow-inner">
              <BookOpen className="w-5 h-5 text-[#58a6ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Inspector de Conceptos
                </h3>
                <span className="text-[10px] font-mono font-bold bg-[#1f6feb]/20 text-[#58a6ff] px-2 py-0.5 rounded-full border border-[#1f6feb]/40 uppercase">
                  Glosario Crítico
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Etimología, sentido ético y aterrizaje cotidiano sin jerga innecesaria
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Búsqueda de Término */}
        <div className="p-4 sm:p-5 bg-[#0e1218] border-b border-[#21262d] space-y-3 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative flex items-center gap-2"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ingresa la palabra o concepto que deseas entender (ej. Aporía, Mala fe, Eudaimonía)..."
                disabled={isLoading}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/40 transition-all font-sans disabled:opacity-50"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!searchTerm.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1f6feb] to-[#388bfd] hover:from-[#388bfd] hover:to-[#58a6ff] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-[#1f6feb]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-300' : ''}`} />
              <span className="hidden sm:inline">{isLoading ? 'Consultando...' : 'Definir'}</span>
            </button>
          </form>

          {/* Píldoras Rápidas de Términos Frecuentes */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1">
              SUGERENCIAS:
            </span>
            {FREQUENT_CONCEPTS.map((concept) => (
              <button
                key={concept}
                type="button"
                onClick={() => {
                  setSearchTerm(concept);
                  handleSearch(concept);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg font-mono bg-[#161b22] text-zinc-400 hover:text-zinc-100 hover:bg-[#21262d] border border-[#30363d]/60 transition-all cursor-pointer"
              >
                {concept}
              </button>
            ))}
          </div>
        </div>

        {/* Cuerpo del Resultado */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4 bg-[#0b0e14]">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center animate-fadeIn">
              <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-sans">
                Consultando etimología y sentido ético para <strong className="text-white">"{currentConcept}"</strong>...
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs sm:text-sm animate-fadeIn">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          {!isLoading && definition && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#12161f] border border-[#21262d] shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[#21262d] pb-2.5">
                  <h4 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                    <span>{currentConcept}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                    title="Copiar definición completa"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="select-text">
                  <MarkdownRenderer content={definition} />
                </div>
              </div>

              {/* Botón para debatir este concepto con el Sparring */}
              <div className="p-3.5 rounded-2xl bg-[#162338]/60 border border-[#1f6feb]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-blue-200 font-sans">
                  ¿Deseas profundizar sobre este concepto en tu diálogo activo?
                </span>
                <button
                  type="button"
                  onClick={handleSendToChat}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
                >
                  <span>Debatir este término</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {!isLoading && !definition && !errorMessage && (
            <div className="py-14 text-center space-y-2.5 text-zinc-500">
              <div className="w-12 h-12 rounded-2xl bg-[#161b22] border border-[#21262d] flex items-center justify-center mx-auto text-zinc-400 text-xl">
                📖
              </div>
              <h4 className="text-sm font-semibold text-zinc-300">
                Glosario Filosófico Instantáneo
              </h4>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                Busca cualquier concepto para recibir en segundos su etimología, sentido filosófico y un ejemplo cotidiano sin jerga.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
