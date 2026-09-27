/**
 * Gestor de Conversaciones e Hilos Temáticos (Dialectic Threads)
 * Almacena en localStorage bajo 'dialectic_threads' y 'active_thread_id'
 */

export const THREADS_KEY = 'dialectic_threads';
export const ACTIVE_THREAD_KEY = 'active_thread_id';

const INITIAL_SPARRING_GREETING =
  'Soy tu Sparring Intelectual. No estoy aquí para adularte con elogios condescendientes ni para imponerte dogmas, sino para examinar contigo con rigor y honestidad.\n\nPlantea una duda existencial, un dilema ético, una contradicción que experimentes o un concepto que te inquiete. Analizaremos sus premisas, su genealogía y sus consecuencias prácticas.';

/**
 * Crea un hilo inicial por defecto
 */
const createDefaultThread = () => {
  const now = new Date().toISOString();
  return {
    id: `thread-${Date.now()}`,
    title: 'Indagación Inicial',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        text: INITIAL_SPARRING_GREETING,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  };
};

/**
 * Obtiene todos los hilos guardados desde localStorage
 */
export const getThreads = () => {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[threadStorage] Error leyendo hilos guardados:', e);
  }

  // Si no hay hilos, crear el inicial y persistirlo
  const defaultThread = createDefaultThread();
  const initialList = [defaultThread];
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(initialList));
    localStorage.setItem(ACTIVE_THREAD_KEY, defaultThread.id);
  } catch (e) {}

  return initialList;
};

/**
 * Guarda la lista completa de hilos en localStorage
 */
export const saveThreads = (threads = []) => {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch (e) {
    console.error('[threadStorage] Error guardando hilos:', e);
  }
};

/**
 * Obtiene el ID del hilo activo
 */
export const getActiveThreadId = () => {
  try {
    const activeId = localStorage.getItem(ACTIVE_THREAD_KEY);
    const threads = getThreads();
    if (activeId && threads.some((t) => t.id === activeId)) {
      return activeId;
    }
    return threads[0]?.id || null;
  } catch (e) {
    return null;
  }
};

/**
 * Establece el ID del hilo activo
 */
export const setActiveThreadId = (threadId) => {
  try {
    if (threadId) {
      localStorage.setItem(ACTIVE_THREAD_KEY, threadId);
    } else {
      localStorage.removeItem(ACTIVE_THREAD_KEY);
    }
  } catch (e) {}
};

/**
 * Crea un nuevo hilo con título personalizado
 */
export const createNewThread = (title = 'Nuevo Tema') => {
  const cleanTitle = title.trim() || 'Nuevo Tema';
  const now = new Date().toISOString();
  const newThread = {
    id: `thread-${Date.now()}`,
    title: cleanTitle,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        text: `Tema iniciado: **${cleanTitle}**.\n\n${INITIAL_SPARRING_GREETING}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  };

  const threads = getThreads();
  const updatedThreads = [newThread, ...threads];
  saveThreads(updatedThreads);
  setActiveThreadId(newThread.id);

  return { newThread, threads: updatedThreads };
};

/**
 * Renombra un hilo existente
 */
export const renameThread = (threadId, newTitle) => {
  const cleanTitle = newTitle?.trim();
  if (!cleanTitle || !threadId) return getThreads();

  const threads = getThreads();
  const updated = threads.map((t) => {
    if (t.id === threadId) {
      return {
        ...t,
        title: cleanTitle,
        updatedAt: new Date().toISOString(),
      };
    }
    return t;
  });

  saveThreads(updated);
  return updated;
};

/**
 * Elimina un hilo existente
 */
export const deleteThread = (threadId) => {
  if (!threadId) return { threads: getThreads(), activeId: getActiveThreadId() };

  const threads = getThreads();
  let updated = threads.filter((t) => t.id !== threadId);

  // Si se eliminaron todos, recrear uno por defecto
  let nextActiveId = null;
  if (updated.length === 0) {
    const defaultThread = createDefaultThread();
    updated = [defaultThread];
    nextActiveId = defaultThread.id;
  } else {
    // Si el activo era el eliminado, pasar al primero disponible
    const currentActive = getActiveThreadId();
    if (currentActive === threadId) {
      nextActiveId = updated[0].id;
    } else {
      nextActiveId = currentActive;
    }
  }

  saveThreads(updated);
  setActiveThreadId(nextActiveId);

  return { threads: updated, activeId: nextActiveId };
};

/**
 * Añade un mensaje a un hilo específico y actualiza fecha
 */
export const addMessageToThread = (threadId, message) => {
  const threads = getThreads();
  const updated = threads.map((t) => {
    if (t.id === threadId) {
      return {
        ...t,
        updatedAt: new Date().toISOString(),
        messages: [...(t.messages || []), message],
      };
    }
    return t;
  });

  saveThreads(updated);
  return updated;
};
