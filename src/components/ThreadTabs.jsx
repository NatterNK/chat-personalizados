import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Edit2, Check, MessageSquare, Flame } from 'lucide-react';

export const ThreadTabs = ({
  threads = [],
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onRenameThread,
  onDeleteThread,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const scrollContainerRef = useRef(null);
  const createInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Auto-focus en el input de creación
  useEffect(() => {
    if (isCreating) {
      setTimeout(() => createInputRef.current?.focus(), 80);
    }
  }, [isCreating]);

  // Auto-focus en el input de edición
  useEffect(() => {
    if (editingThreadId) {
      setTimeout(() => editInputRef.current?.focus(), 80);
    }
  }, [editingThreadId]);

  const handleStartCreate = () => {
    setNewTitle('');
    setIsCreating(true);
  };

  const handleConfirmCreate = (e) => {
    e?.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }
    onCreateThread(trimmed);
    setNewTitle('');
    setIsCreating(false);

    // Scroll hacia la izquierda donde se coloca el nuevo hilo
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleStartEdit = (thread, e) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditTitle(thread.title);
  };

  const handleConfirmEdit = (threadId, e) => {
    e?.preventDefault();
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenameThread(threadId, trimmed);
    }
    setEditingThreadId(null);
  };

  const handleDelete = (thread, e) => {
    e.stopPropagation();
    if (window.confirm(`¿Deseas eliminar la consulta "${thread.title}" y su historial?`)) {
      onDeleteThread(thread.id);
    }
  };

  return (
    <div className="w-full bg-[#0d1117] border-b border-[#21262d] px-3 sm:px-6 py-2.5 flex items-center gap-2 select-none shrink-0 shadow-sm">
      {/* Botón Permanente para Crear Nuevo Tema / Hilo */}
      <button
        type="button"
        onClick={handleStartCreate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1f6feb] to-[#388bfd] hover:from-[#388bfd] hover:to-[#58a6ff] text-white text-xs font-semibold shadow-md shadow-[#1f6feb]/20 transition-all cursor-pointer shrink-0"
        title="Crear nueva consulta o hilo temático"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Nuevo Tema</span>
      </button>

      {/* Formulario Inline de Creación Rápida */}
      {isCreating && (
        <form
          onSubmit={handleConfirmCreate}
          className="flex items-center gap-1.5 bg-[#161b22] border border-[#1f6feb] rounded-xl px-2.5 py-1 shrink-0 animate-fadeIn"
        >
          <input
            ref={createInputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título (ej. Moral y limosna, Gaza, El Amor)..."
            className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none w-36 sm:w-56 font-sans"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsCreating(false);
            }}
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 cursor-pointer"
            title="Crear hilo"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            title="Cancelar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Contenedor Deslizable de Pestañas (Scroll Horizontal Móvil) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar scroll-smooth py-0.5"
      >
        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId;
          const isEditing = editingThreadId === thread.id;

          if (isEditing) {
            return (
              <form
                key={thread.id}
                onSubmit={(e) => handleConfirmEdit(thread.id, e)}
                className="flex items-center gap-1.5 bg-[#161b22] border border-[#58a6ff] rounded-xl px-2.5 py-1 shrink-0 animate-fadeIn"
              >
                <input
                  ref={editInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-transparent text-xs text-zinc-100 focus:outline-none w-32 sm:w-48 font-sans"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingThreadId(null);
                  }}
                />
                <button
                  type="submit"
                  className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  title="Guardar nombre"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingThreadId(null)}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            );
          }

          return (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shrink-0 max-w-[200px] sm:max-w-[260px] ${
                isActive
                  ? 'bg-[#162338] border-[#1f6feb] text-white shadow-sm ring-1 ring-[#1f6feb]/40'
                  : 'bg-[#12161f] border-[#21262d] text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22] hover:border-[#30363d]'
              }`}
              title={thread.title}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#58a6ff]' : 'text-zinc-500'}`} />
              
              <span className="truncate flex-1 font-sans">{thread.title}</span>

              {/* Acciones de Pestaña (Renombrar y Eliminar) */}
              <div className="flex items-center gap-1 shrink-0">
                {isActive && (
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(thread, e)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-[#1a2b47] transition-colors"
                    title="Renombrar este tema"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => handleDelete(thread, e)}
                  className={`p-1 rounded transition-colors ${
                    isActive
                      ? 'text-zinc-400 hover:text-red-300 hover:bg-red-950/40'
                      : 'text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100'
                  }`}
                  title="Eliminar tema"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
