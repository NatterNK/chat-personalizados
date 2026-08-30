import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Settings,
  AlertTriangle,
  Key,
  CheckCircle,
  VolumeX,
  Volume2,
  Shield,
  Trash2,
  RotateCcw,
  X,
  Menu,
  Lightbulb,
  Compass,
  BookOpen,
  Flame,
  MessageSquare,
} from 'lucide-react';
import {
  characters,
  CATEGORIES,
  getCharacterById,
  getCharactersByCategory,
} from './config/characters';
import { Sidebar } from './components/Sidebar';
import { CharacterHeader } from './components/CharacterHeader';
import { CategoryChips } from './components/CategoryChips';
import { ChatTranscript } from './components/ChatTranscript';
import { MessageInputBar } from './components/MessageInputBar';
import { BrujulaModal } from './components/BrujulaModal';
import { VoiceConfigModal } from './components/VoiceConfigModal';
import { MobileInfoModal } from './components/MobileInfoModal';
import { ForgeView } from './components/ForgeView';
import { PhilosopherAvatar } from './components/PhilosopherAvatar';
import {
  SpeechRecognizer,
  isSpeechRecognitionSupported,
  speakPhilosopherText,
  cancelSpeech,
  getSavedVoicePref,
} from './services/speech';
import {
  playNeuralVoice,
  stopNeuralAudio,
} from './services/neuralAudio';
import { sendMessage, getApiKey } from './services/gemini';

function App() {
  // Personaje inicial seguro por defecto
  const defaultCharacter = useMemo(() => {
    if (Array.isArray(characters) && characters.length > 0) {
      return characters.find((c) => c && c.id === 'nietzsche') || characters[0];
    }
    if (characters && typeof characters === 'object') {
      const list = Array.isArray(characters.filosofos)
        ? characters.filosofos
        : Object.values(characters).flat();
      if (list.length > 0) return list.find((c) => c && c.id === 'nietzsche') || list[0];
    }
    return null;
  }, []);

  // Estado de navegación por categorías y búsqueda
  const [activeCategory, setActiveCategory] = useState('filosofos');
  const [activeView, setActiveView] = useState(() => {
    try {
      return localStorage.getItem('app_active_view') || 'dojo';
    } catch (e) {
      return 'dojo';
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => defaultCharacter?.id || 'nietzsche');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBrujulaOpen, setIsBrujulaOpen] = useState(false);
  const [isVoiceConfigOpen, setIsVoiceConfigOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);

  const handleSelectView = useCallback((view) => {
    stopNeuralAudio();
    cancelSpeech();
    setActiveView(view);
    try {
      localStorage.setItem('app_active_view', view);
    } catch (e) {}
  }, []);

  const handleSelectRouteFromBrujula = useCallback((routeId) => {
    setIsBrujulaOpen(false);
    handleSelectView('forge');
    try {
      localStorage.setItem('active_route_id', routeId);
      localStorage.setItem('forge_selected_route_id', routeId);
    } catch (e) {}
  }, [handleSelectView]);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(() => {
    try {
      return localStorage.getItem('app_auto_speak_enabled') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [prefilledInput, setPrefilledInput] = useState('');

  // Personaje activo blindado
  const activeCharacter = useMemo(() => {
    return getCharacterById(selectedId) || defaultCharacter;
  }, [selectedId, defaultCharacter]);

  // Estados de diálogo y audio
  const [messages, setMessages] = useState([]);
  const [appState, setAppState] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [selectedLang, setSelectedLang] = useState('es-ES');
  const [errorMessage, setErrorMessage] = useState('');

  const handleToggleAutoSpeak = useCallback(() => {
    setAutoSpeakEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('app_auto_speak_enabled', String(next));
      } catch (e) {}
      if (!next) {
        stopNeuralAudio();
        cancelSpeech();
        setSpeakingMessageId(null);
        setAppState((curr) => (curr === 'speaking' ? 'idle' : curr));
      }
      return next;
    });
  }, []);

  // Referencias atómicas para evitar cierres obsoletos (stale closures)
  const activeCharacterRef = useRef(activeCharacter);
  const messagesRef = useRef(messages);
  const recognizerRef = useRef(null);

  useEffect(() => {
    activeCharacterRef.current = activeCharacter;
  }, [activeCharacter]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const hasApiKey = Boolean(getApiKey());

  const getFormattedTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Carga el historial persistente desde localStorage para un personaje
   */
  const loadCharacterHistory = useCallback((character) => {
    if (!character || !character.id) return [];
    const key = `dialogos_history_${character.id}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`[Storage] Error al leer historial de ${character.id}:`, err);
    }

    // Saludo inicial por defecto si no existe historial previo
    return [
      {
        id: `init-${Date.now()}`,
        role: 'model',
        text: character.greeting || character.initialMessage || 'Saludos. ¿Qué dilema examinamos hoy?',
        timestamp: getFormattedTime(),
        isGreeting: true,
      },
    ];
  }, []);

  /**
   * Guarda el historial de mensajes de un personaje en localStorage
   */
  const saveCharacterHistory = (characterId, messagesToSave) => {
    if (!characterId) return;
    try {
      localStorage.setItem(`dialogos_history_${characterId}`, JSON.stringify(messagesToSave));
    } catch (err) {
      console.warn(`[Storage] Error al guardar historial de ${characterId}:`, err);
    }
  };

  /**
   * Cambia de personaje activo y carga su memoria persistente
   */
  const handleSelectCharacter = useCallback(
    (newId) => {
      cancelSpeech();
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }

      const newChar = getCharacterById(newId) || defaultCharacter;
      if (!newChar) return;

      setSelectedId(newChar.id);
      activeCharacterRef.current = newChar;

      // Asegurar que la categoría activa coincida con el personaje seleccionado
      if (newChar.category && newChar.category !== activeCategory) {
        setActiveCategory(newChar.category);
      }

      setAppState('idle');
      setInterimTranscript('');
      setSpeakingMessageId(null);
      setErrorMessage('');
      setPrefilledInput('');

      // Cargar memoria persistente desde localStorage
      const loadedMessages = loadCharacterHistory(newChar);
      setMessages(loadedMessages);
      messagesRef.current = loadedMessages;
    },
    [activeCategory, defaultCharacter, loadCharacterHistory]
  );

  /**
   * Acción ejecutada al seleccionar una recomendación desde la Brújula Dialéctica
   */
  const handleSelectBrujulaMatch = useCallback(
    (char, suggestedQuestion) => {
      handleSelectCharacter(char.id);
      if (suggestedQuestion) {
        setPrefilledInput(suggestedQuestion);
      }
      setIsBrujulaOpen(false);
    },
    [handleSelectCharacter]
  );

  // Inicializar al montar
  useEffect(() => {
    handleSelectCharacter(selectedId);
  }, []);

  /**
   * Reinicia la sesión del personaje activo y limpia su localStorage
   */
  const handleResetSession = () => {
    stopNeuralAudio();
    cancelSpeech();
    if (recognizerRef.current) {
      recognizerRef.current.abort();
    }

    const key = `dialogos_history_${activeCharacter.id}`;
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    const freshGreeting = [
      {
        id: `init-${Date.now()}`,
        role: 'model',
        text: activeCharacter.greeting || activeCharacter.initialMessage,
        timestamp: getFormattedTime(),
        isGreeting: true,
      },
    ];

    setMessages(freshGreeting);
    messagesRef.current = freshGreeting;
    saveCharacterHistory(activeCharacter.id, freshGreeting);
    setAppState('idle');
    setInterimTranscript('');
    setSpeakingMessageId(null);
    setPrefilledInput('');
  };

  /**
   * Sintetiza la voz del personaje activo mediante Voz Neuronal Humana (Azure / Edge TTS) con fallback nativo
   */
  const speakMessage = useCallback(
    (text, messageId = null) => {
      const currentChar = activeCharacterRef.current;
      stopNeuralAudio();
      cancelSpeech();
      setAppState('speaking');
      if (messageId) setSpeakingMessageId(messageId);

      const savedPref = currentChar?.id ? getSavedVoicePref(currentChar.id) : null;
      const isBrowserMode = savedPref?.engineMode === 'browser';

      if (isBrowserMode) {
        speakPhilosopherText(text, {
          philosopher: currentChar,
          character: currentChar,
          rate: savedPref?.rate ?? currentChar?.rate ?? 1.0,
          pitch: savedPref?.pitch ?? currentChar?.pitch ?? 1.0,
          volume: savedPref?.volume ?? 1.0,
          lang: selectedLang,
          customVoiceURI: savedPref?.voiceURI,
          onStart: () => {
            setAppState('speaking');
            if (messageId) setSpeakingMessageId(messageId);
          },
          onEnd: () => {
            setAppState('idle');
            setSpeakingMessageId(null);
          },
          onError: () => {
            setAppState('idle');
            setSpeakingMessageId(null);
          },
        });
      } else {
        playNeuralVoice(text, {
          character: currentChar,
          voice: savedPref?.neuralVoice || currentChar?.neuralVoice,
          rate: savedPref?.rate ?? currentChar?.rate ?? 1.0,
          pitch: savedPref?.pitch ?? currentChar?.pitch ?? 1.0,
          onStart: () => {
            setAppState('speaking');
            if (messageId) setSpeakingMessageId(messageId);
          },
          onEnd: () => {
            setAppState('idle');
            setSpeakingMessageId(null);
          },
          onError: () => {
            setAppState('idle');
            setSpeakingMessageId(null);
          },
        });
      }
    },
    [selectedLang]
  );

  /**
   * Envía un mensaje a Gemini manteniendo el historial persistente y soporte multimodal
   */
  const handleSendMessage = useCallback(
    async (textToSend, imageToSend = null) => {
      const cleanText = textToSend?.trim();
      if (!cleanText && !imageToSend) return;

      const currentChar = activeCharacterRef.current;
      const currentMessages = messagesRef.current;

      // Interrumpir cualquier audio en curso
      stopNeuralAudio();
      cancelSpeech();
      if (recognizerRef.current && appState === 'listening') {
        recognizerRef.current.abort();
      }
      setAppState('processing');
      setErrorMessage('');

      // Registrar mensaje del usuario con imagen si existe
      const userMsgId = `user-${Date.now()}`;
      const userMessage = {
        id: userMsgId,
        role: 'user',
        text: cleanText || '',
        image: imageToSend || null,
        timestamp: getFormattedTime(),
      };

      const nextMessages = [...currentMessages, userMessage];
      setMessages(nextMessages);
      messagesRef.current = nextMessages;
      if (currentChar?.id) {
        saveCharacterHistory(currentChar.id, nextMessages);
      }

      // Preparar historial para la llamada a Gemini
      const historyForGemini = nextMessages.slice(0, -1).map((m) => ({
        role: m.role,
        text: m.text,
        image: m.image,
      }));

      try {
        const reply = await sendMessage({
          userInput: cleanText,
          image: imageToSend,
          systemPrompt: currentChar?.systemPrompt,
          history: historyForGemini,
          philosopherId: currentChar?.id || 'filosofo',
        });

        // Registrar respuesta del personaje
        const modelMsgId = `model-${Date.now()}`;
        const modelMessage = {
          id: modelMsgId,
          role: 'model',
          text: reply,
          timestamp: getFormattedTime(),
        };

        const finalMessages = [...nextMessages, modelMessage];
        setMessages(finalMessages);
        messagesRef.current = finalMessages;
        if (currentChar?.id) {
          saveCharacterHistory(currentChar.id, finalMessages);
        }

        // Sintetizar voz si Auto-Lectura está activa
        if (autoSpeakEnabled) {
          speakMessage(reply, modelMsgId);
        } else {
          setAppState('idle');
        }
      } catch (err) {
        console.error('Error durante el turno dialéctico:', err);
        setErrorMessage(err.message || 'Error al conectar con la API de Gemini.');
        setAppState('idle');
      }
    },
    [appState, autoSpeakEnabled, selectedLang, speakMessage]
  );

  // Configuración del motor STT (Web Speech API)
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;

    const recognizer = new SpeechRecognizer({
      lang: selectedLang,
      onStart: () => {
        cancelSpeech();
        setAppState('listening');
        setErrorMessage('');
      },
      onInterim: (interim, accumulated) => {
        const liveText = accumulated ? (interim ? `${accumulated} ${interim}` : accumulated) : interim;
        setInterimTranscript(liveText);
      },
      onResult: (finalText) => {
        setInterimTranscript('');
        if (finalText) {
          setPrefilledInput((prev) => (prev ? `${prev} ${finalText}` : finalText));
        }
      },
      onError: (err) => {
        if (err !== 'no-speech' && err !== 'aborted') {
          setErrorMessage(`Error de micrófono: ${err}`);
        }
        setAppState('idle');
        setInterimTranscript('');
      },
      onEnd: () => {
        setAppState('idle');
        setInterimTranscript('');
      },
    });

    recognizerRef.current = recognizer;

    return () => {
      recognizer.abort();
      stopNeuralAudio();
      cancelSpeech();
    };
  }, [selectedLang]);

  const handleToggleListen = () => {
    if (!recognizerRef.current) return;

    if (appState === 'listening') {
      recognizerRef.current.stop();
      setAppState('idle');
    } else {
      stopNeuralAudio();
      cancelSpeech();
      setAppState('listening');
      recognizerRef.current.start();
    }
  };

  const handleReplayAudio = (msg) => {
    if (speakingMessageId === msg.id && appState === 'speaking') {
      stopNeuralAudio();
      cancelSpeech();
      setAppState('idle');
      setSpeakingMessageId(null);
    } else {
      speakMessage(msg.text, msg.id);
    }
  };

  // Filtrado de personajes por categoría y búsqueda
  const currentCategoryCharacters = useMemo(() => {
    let list = getCharactersByCategory(activeCategory) || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => c && c.name && c.name.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, searchQuery]);

  if (!activeCharacter) {
    return (
      <div className="flex h-screen w-screen bg-[#0b0e14] text-[#e6edf3] items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#1f6feb] border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-zinc-400">Cargando pensadores...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-screen bg-[#0d1117] text-[#e6edf3] font-sans overflow-hidden">
      
      {/* 1. BARRA LATERAL IZQUIERDA CON GUÍA DE INDAGACIÓN CRÍTICA (Escritorio + Drawer Móvil) */}
      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={(catId) => {
          setActiveCategory(catId);
          setSearchQuery('');
          const firstInCat = getCharactersByCategory(catId)[0];
          if (firstInCat) {
            handleSelectCharacter(firstInCat.id);
          }
        }}
        activeCharacter={activeCharacter}
        onSelectQuestion={(q) => setPrefilledInput(q)}
        onOpenBrujula={() => setIsBrujulaOpen(true)}
        activeView={activeView}
        onSelectView={handleSelectView}
        isProcessing={appState === 'processing'}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* 2. PANEL PRINCIPAL (100dvh) */}
      <main className="flex-1 flex flex-col h-full min-h-0 bg-[#0b0e14] overflow-hidden p-2 sm:p-4 md:p-5 space-y-2 sm:space-y-3 md:space-y-4">
        {activeView === 'forge' ? (
          <ForgeView
            autoSpeakEnabled={autoSpeakEnabled}
            onToggleAutoSpeak={handleToggleAutoSpeak}
            onOpenBrujula={() => setIsBrujulaOpen(true)}
            onSelectView={handleSelectView}
            onSelectCharacter={(charId) => {
              handleSelectCharacter(charId);
              handleSelectView('dojo');
            }}
            onClose={() => handleSelectView('dojo')}
          />
        ) : (
          <>
            {/* ========================================================= */}
            {/* A. BARRA SUPERIOR RESPONSIVE PARA MÓVILES (< md)          */}
            {/* ========================================================= */}
            <div className="md:hidden flex items-center justify-between gap-2 p-2 bg-[#12161f] border border-[#21262d] rounded-2xl shrink-0 shadow-lg select-none">
              {/* Lado izquierdo: Botón Menú (Drawer) + Avatar & Nombre */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer shrink-0"
                  title="Abrir menú de categorías y forja"
                >
                  <Menu className="w-4 h-4 text-[#58a6ff]" />
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  <PhilosopherAvatar character={activeCharacter} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs font-bold text-zinc-100 truncate">
                        {activeCharacter?.name}
                      </h2>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-pulse shrink-0" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 block truncate">
                      {activeCharacter?.era}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lado derecho: Toggle Auto-Voz + Reiniciar Diálogo + Info Analítica + Config */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Toggle Auto-Voz en Móvil */}
                <button
                  type="button"
                  onClick={handleToggleAutoSpeak}
                  className={`p-2 rounded-xl transition-all border cursor-pointer ${
                    autoSpeakEnabled
                      ? 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/50'
                      : 'bg-[#161b22] text-zinc-400 border-[#30363d]'
                  }`}
                  title={autoSpeakEnabled ? 'Voz activada' : 'Voz silenciada'}
                >
                  {autoSpeakEnabled ? (
                    <Volume2 className="w-4 h-4 text-[#58a6ff]" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {/* Botón Reiniciar Diálogo Actual en Móvil */}
                <button
                  type="button"
                  onClick={handleResetSession}
                  disabled={appState === 'processing'}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-300 hover:bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer disabled:opacity-40"
                  title={`Reiniciar diálogo con ${activeCharacter?.name}`}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Botón Info / Foco Analítico en Móvil */}
                <button
                  type="button"
                  onClick={() => setIsMobileInfoOpen(true)}
                  className="p-2 rounded-xl text-amber-400 hover:text-amber-300 bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer"
                  title="Ver foco analítico y biblioteca de lecturas"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>

                {/* Botón Ajustes */}
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer"
                  title="Configuración"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* B. BARRA SUPERIOR PARA ESCRITORIO (>= md)                  */}
            {/* ========================================================= */}
            <div className="hidden md:block space-y-3 shrink-0 select-none">
              <div className="flex items-center justify-between gap-3">
                {/* Input de Búsqueda */}
                <div className="relative w-full max-w-xs sm:max-w-sm">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar personaje..."
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-9 pr-3.5 py-1.5 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#1f6feb] transition-colors font-sans"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Acciones de la Barra Superior */}
                <div className="flex items-center gap-2">
                  {/* Botón Reiniciar Diálogo Activo */}
                  <button
                    onClick={handleResetSession}
                    disabled={appState === 'processing'}
                    className="p-2 text-zinc-400 hover:text-red-300 hover:bg-[#161b22] border border-[#30363d] rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                    title={`Reiniciar conversación con ${activeCharacter?.name}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-xs font-mono hidden lg:inline">Reiniciar</span>
                  </button>

                  {/* Indicador de Gemini */}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono">
                    {hasApiKey ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-zinc-300">GEMINI // READY</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300">SIN API KEY</span>
                      </>
                    )}
                  </div>

                  {/* Botón de Ajustes */}
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#161b22] border border-[#30363d] rounded-xl transition-colors cursor-pointer"
                    title="Configuración del sistema"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chips horizontales de personajes (Móvil y Escritorio) */}
            <div className="shrink-0">
              <CategoryChips
                characters={currentCategoryCharacters}
                selectedId={selectedId}
                onSelectCharacter={handleSelectCharacter}
                disabled={appState === 'processing'}
              />
            </div>

            {/* Alerta de Error si ocurre */}
            {errorMessage && (
              <div className="w-full bg-red-950/40 border border-red-500/40 text-red-200 text-xs rounded-xl p-2.5 flex items-center justify-between gap-2 shrink-0 animate-fadeIn max-w-4xl mx-auto">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-zinc-400 hover:text-white px-2 py-0.5 text-xs rounded"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Cabecera del Personaje Activo (Visible en Escritorio) */}
            <div className="hidden md:block shrink-0 max-w-4xl mx-auto w-full px-3 sm:px-6">
              <CharacterHeader
                character={activeCharacter}
                onResetSession={handleResetSession}
                isProcessing={appState === 'processing'}
                autoSpeakEnabled={autoSpeakEnabled}
                onToggleAutoSpeak={handleToggleAutoSpeak}
              />
            </div>

            {/* Cuerpo del Chat / Transcripción del Debate (Flex-1 con Ancho Óptimo) */}
            <ChatTranscript
              messages={messages}
              character={activeCharacter}
              isProcessing={appState === 'processing'}
              isSpeaking={appState === 'speaking'}
              speakingMessageId={speakingMessageId}
              interimTranscript={interimTranscript}
              onReplayAudio={handleReplayAudio}
            />

            {/* Barra Inferior de Entrada (Fija y Centrada) */}
            <div className="shrink-0 pt-0.5">
              <MessageInputBar
                placeholder={activeCharacter.placeholder}
                disclaimer={activeCharacter.disclaimer}
                isListening={appState === 'listening'}
                isProcessing={appState === 'processing'}
                onToggleListen={handleToggleListen}
                onSendMessage={handleSendMessage}
                onOpenVoiceConfig={() => setIsVoiceConfigOpen(true)}
                autoSpeakEnabled={autoSpeakEnabled}
                onToggleAutoSpeak={handleToggleAutoSpeak}
                isSttSupported={isSpeechRecognitionSupported()}
                externalInput={prefilledInput}
                onClearExternalInput={() => setPrefilledInput('')}
              />
            </div>
          </>
        )}

      </main>

      {/* Modal / Drawer de Información para Móviles */}
      <MobileInfoModal
        isOpen={isMobileInfoOpen}
        onClose={() => setIsMobileInfoOpen(false)}
        character={activeCharacter}
        onSelectQuestion={(q) => setPrefilledInput(q)}
        isProcessing={appState === 'processing'}
      />

      {/* Modal de Configuración General */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-[#30363d] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
              <h3 className="font-semibold text-base text-zinc-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#58a6ff]" />
                Configuración del Sistema
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-zinc-300">
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Idioma de Reconocimiento y Voz:</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none"
                >
                  <option value="es-ES">Español (España - es-ES)</option>
                  <option value="es-CL">Español (Chile - es-CL)</option>
                  <option value="es-MX">Español (México - es-MX)</option>
                  <option value="es-AR">Español (Argentina - es-AR)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Estado de API Key:</label>
                <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl font-mono text-[11px] flex items-center justify-between">
                  <span>VITE_GEMINI_API_KEY</span>
                  <span className="text-emerald-400 font-bold">
                    {hasApiKey ? 'CONFIGURADA' : 'NO DETECTADA'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#21262d]">
                <button
                  onClick={() => {
                    characters.forEach((c) => localStorage.removeItem(`dialogos_history_${c.id}`));
                    handleResetSession();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Borrar memoria de todos los personajes</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1f6feb] text-white hover:bg-[#388bfd] text-xs font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de la Brújula Dialéctica */}
      <BrujulaModal
        isOpen={isBrujulaOpen}
        onClose={() => setIsBrujulaOpen(false)}
        onSelectMatch={handleSelectBrujulaMatch}
        onSelectRoute={handleSelectRouteFromBrujula}
      />

      {/* Modal de Configuración Manual de Voz */}
      <VoiceConfigModal
        isOpen={isVoiceConfigOpen}
        onClose={() => setIsVoiceConfigOpen(false)}
        character={activeCharacter}
      />

    </div>
  );
}

export default App;
