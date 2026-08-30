import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Flame,
  Compass,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Copy,
  Check,
  Send,
  Mic,
  Image as ImageIcon,
  X,
  Shield,
  HelpCircle,
  BookOpen,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { PREDEFINED_ROUTES, createCustomRoute } from '../config/routes';
import { getCharacterById } from '../config/characters';
import { sendMessage } from '../services/gemini';
import { playNeuralVoice, stopAllAudio } from '../services/neuralAudio';
import { SpeechRecognizer, isSpeechRecognitionSupported } from '../services/speech';
import { PhilosopherAvatar } from './PhilosopherAvatar';

const STORAGE_KEY = 'forge_active_routes_state';

export const ForgeView = ({
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
  onOpenBrujula,
  onSelectView,
  onSelectCharacter,
  onClose,
}) => {
  // Estado de rutas y progreso
  const [routesState, setRoutesState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [activeRouteId, setActiveRouteId] = useState(() => {
    try {
      const saved = localStorage.getItem('forge_selected_route_id');
      return saved || null;
    } catch (e) {
      return null;
    }
  });

  const [customConceptInput, setCustomConceptInput] = useState('');
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Estados de diálogo de la etapa
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognizerRef = useRef(null);

  // Guardar estado en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routesState));
    } catch (e) {}
  }, [routesState]);

  useEffect(() => {
    try {
      if (activeRouteId) {
        localStorage.setItem('forge_selected_route_id', activeRouteId);
      } else {
        localStorage.removeItem('forge_selected_route_id');
      }
    } catch (e) {}
  }, [activeRouteId]);

  // Obtener la ruta activa actual
  const currentRoute = useMemo(() => {
    if (!activeRouteId) return null;
    const predefined = PREDEFINED_ROUTES.find((r) => r.id === activeRouteId);
    if (predefined) return predefined;
    return routesState[activeRouteId]?.customRoute || null;
  }, [activeRouteId, routesState]);

  // Progreso de la ruta activa
  const activeRouteProgress = useMemo(() => {
    if (!activeRouteId) return null;
    return (
      routesState[activeRouteId] || {
        currentStepIndex: 0,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      }
    );
  }, [activeRouteId, routesState]);

  // Sincronizar activeStepIndex con el progreso
  useEffect(() => {
    if (activeRouteProgress) {
      setActiveStepIndex(activeRouteProgress.currentStepIndex || 0);
    }
  }, [activeRouteId]);

  // Paso actual de la ruta
  const currentStep = useMemo(() => {
    if (!currentRoute || !currentRoute.steps) return null;
    return currentRoute.steps[activeStepIndex] || currentRoute.steps[0];
  }, [currentRoute, activeStepIndex]);

  // Personaje actual de la etapa
  const currentStepCharacter = useMemo(() => {
    if (!currentStep) return null;
    return (
      getCharacterById(currentStep.characterId) || {
        id: currentStep.characterId,
        name: currentStep.characterName || 'Pensador',
        era: 'Filosofía Clásica',
        avatar: '',
        gender: 'male',
      }
    );
  }, [currentStep]);

  // Mensajes de la etapa actual
  const currentMessages = useMemo(() => {
    if (!activeRouteId || !activeRouteProgress) return [];
    return activeRouteProgress.stepMessages?.[activeStepIndex] || [];
  }, [activeRouteId, activeRouteProgress, activeStepIndex]);

  // Inicializar saludo del filósofo si la etapa está vacía
  useEffect(() => {
    if (!activeRouteId || !currentStep || !currentStepCharacter) return;

    const existingMsgs = routesState[activeRouteId]?.stepMessages?.[activeStepIndex];
    if (!existingMsgs || existingMsgs.length === 0) {
      const greetingMsg = {
        id: `greeting-${activeRouteId}-step-${activeStepIndex}-${Date.now()}`,
        role: 'model',
        text: currentStep.initialGreeting || currentStepCharacter.greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setRoutesState((prev) => {
        const routeProg = prev[activeRouteId] || {
          currentStepIndex: activeStepIndex,
          completedSteps: [],
          stepMessages: {},
          isCompleted: false,
        };
        const updatedStepMessages = {
          ...routeProg.stepMessages,
          [activeStepIndex]: [greetingMsg],
        };
        return {
          ...prev,
          [activeRouteId]: {
            ...routeProg,
            stepMessages: updatedStepMessages,
          },
        };
      });

      if (autoSpeakEnabled) {
        handleSpeak(greetingMsg);
      }
    }
  }, [activeRouteId, activeStepIndex, currentStep, currentStepCharacter]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isProcessing, interimTranscript]);

  // Reproducción de audio neuronal
  const handleSpeak = useCallback(
    async (message) => {
      if (!message || !message.text || !currentStepCharacter) return;
      stopAllAudio();
      setSpeakingMessageId(message.id);

      await playNeuralVoice({
        text: message.text,
        character: currentStepCharacter,
        onStart: () => setSpeakingMessageId(message.id),
        onEnd: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    },
    [currentStepCharacter]
  );

  const handleReplay = (msg) => {
    if (speakingMessageId === msg.id) {
      stopAllAudio();
      setSpeakingMessageId(null);
    } else {
      handleSpeak(msg);
    }
  };

  // Reconocimiento de Voz
  const handleToggleListen = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Tu navegador no soporta entrada de voz nativa.');
      return;
    }

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
    } else {
      stopAllAudio();
      setSpeakingMessageId(null);

      const recognizer = new SpeechRecognizer({
        lang: 'es-ES',
        onResult: (finalText) => {
          setInputText((prev) => (prev ? `${prev} ${finalText}` : finalText));
          setInterimTranscript('');
        },
        onInterim: (interim) => {
          setInterimTranscript(interim);
        },
        onError: (err) => {
          console.error('Speech recognition error:', err);
          setIsListening(false);
          setInterimTranscript('');
        },
        onEnd: () => {
          setIsListening(false);
          setInterimTranscript('');
        },
      });

      recognizerRef.current = recognizer;
      recognizer.start();
      setIsListening(true);
    }
  };

  // Adjuntar imagen
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedImage(ev.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Enviar mensaje en la etapa
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if ((!textToSend && !attachedImage) || isProcessing || !currentStepCharacter) return;

    stopAllAudio();
    setSpeakingMessageId(null);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      image: attachedImage || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Actualizar historial local
    const updatedMessages = [...currentMessages, userMessage];
    setRoutesState((prev) => {
      const routeProg = prev[activeRouteId] || {
        currentStepIndex: activeStepIndex,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      };
      return {
        ...prev,
        [activeRouteId]: {
          ...routeProg,
          stepMessages: {
            ...routeProg.stepMessages,
            [activeStepIndex]: updatedMessages,
          },
        },
      };
    });

    setInputText('');
    setAttachedImage(null);
    setIsProcessing(true);

    try {
      // Inyectar el system prompt de la etapa de la forja
      const stagePrompt = `\n[INSTRUCCIÓN CRÍTICA DE LA FORJA CONCEPTUAL - ETAPA ${activeStepIndex + 1}/4]\nTema/Concepto: "${currentRoute.concept}".\nRol de esta etapa: ${currentStep.role}.\nMisión analítica: ${currentStep.mission}.\n${currentStep.systemPromptAddendum}\nConduce la respuesta con rigor, manteniendo tu estilo característico pero enfocado en cumplir la misión de esta etapa dialéctica.`;

      // Historial para Gemini
      const historyForApi = updatedMessages.map((m) => ({
        role: m.role,
        text: m.text,
        image: m.image,
      }));

      const replyText = await sendMessage(
        textToSend || 'Examina esta imagen a la luz de nuestra indagación.',
        currentStepCharacter,
        historyForApi.slice(0, -1),
        attachedImage,
        stagePrompt
      );

      const aiMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setRoutesState((prev) => {
        const routeProg = prev[activeRouteId];
        const msgs = [...(routeProg.stepMessages[activeStepIndex] || []), aiMessage];
        return {
          ...prev,
          [activeRouteId]: {
            ...routeProg,
            stepMessages: {
              ...routeProg.stepMessages,
              [activeStepIndex]: msgs,
            },
          },
        };
      });

      if (autoSpeakEnabled) {
        handleSpeak(aiMessage);
      }
    } catch (err) {
      console.error('Error enviando mensaje en la forja:', err);
      const errMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'Ocurrió una turbulencia en la conexión dialéctica. Por favor, reformula tu planteamiento o verifica tu API Key de Gemini.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setRoutesState((prev) => ({
        ...prev,
        [activeRouteId]: {
          ...prev[activeRouteId],
          stepMessages: {
            ...prev[activeRouteId].stepMessages,
            [activeStepIndex]: [...(prev[activeRouteId].stepMessages[activeStepIndex] || []), errMessage],
          },
        },
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Avanzar a la siguiente etapa
  const handleAdvanceStep = () => {
    stopAllAudio();
    const nextIdx = activeStepIndex + 1;
    const isCompletedNow = nextIdx >= currentRoute.steps.length;

    setRoutesState((prev) => {
      const currentProg = prev[activeRouteId] || {
        currentStepIndex: 0,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      };

      const completed = Array.from(new Set([...currentProg.completedSteps, activeStepIndex]));

      return {
        ...prev,
        [activeRouteId]: {
          ...currentProg,
          currentStepIndex: isCompletedNow ? activeStepIndex : nextIdx,
          completedSteps: completed,
          isCompleted: isCompletedNow || currentProg.isCompleted,
        },
      };
    });

    if (isCompletedNow) {
      setShowSynthesisModal(true);
    } else {
      setActiveStepIndex(nextIdx);
    }
  };

  // Seleccionar ruta para iniciar
  const handleStartRoute = (route) => {
    stopAllAudio();
    setActiveRouteId(route.id);
    const existing = routesState[route.id];
    setActiveStepIndex(existing?.currentStepIndex || 0);
  };

  // Crear ruta personalizada desde el input
  const handleCreateCustomRoute = (e) => {
    e.preventDefault();
    if (!customConceptInput.trim()) return;

    stopAllAudio();
    const customRoute = createCustomRoute(customConceptInput.trim());
    setCustomConceptInput('');

    setRoutesState((prev) => ({
      ...prev,
      [customRoute.id]: {
        customRoute,
        currentStepIndex: 0,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      },
    }));

    setActiveRouteId(customRoute.id);
    setActiveStepIndex(0);
  };

  // Reiniciar la ruta actual
  const handleResetCurrentRoute = () => {
    if (!window.confirm(`¿Deseas reiniciar la Forja de "${currentRoute?.concept}" desde la Etapa 1?`)) {
      return;
    }
    stopAllAudio();
    setRoutesState((prev) => ({
      ...prev,
      [activeRouteId]: {
        ...(prev[activeRouteId]?.customRoute ? { customRoute: prev[activeRouteId].customRoute } : {}),
        currentStepIndex: 0,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      },
    }));
    setActiveStepIndex(0);
    setShowSynthesisModal(false);
  };

  // Generar texto de síntesis final
  const synthesisSummary = useMemo(() => {
    if (!currentRoute) return '';
    let text = `🧭 SÍNTESIS DE LA FORJA CONCEPTUAL: ${currentRoute.concept.toUpperCase()}\n\n`;
    currentRoute.steps.forEach((step, idx) => {
      const stepChar = getCharacterById(step.characterId);
      const msgs = activeRouteProgress?.stepMessages?.[idx] || [];
      const userQuestions = msgs.filter((m) => m.role === 'user').map((m) => m.text);
      const lastReply = msgs.filter((m) => m.role === 'model').slice(-1)[0]?.text || '';

      text += `--- [ETAPA ${idx + 1}: ${step.stageTitle.toUpperCase()}] ---\n`;
      text += `Pensador: ${stepChar?.name || step.characterName || step.characterId} (${step.role})\n`;
      text += `Misión: ${step.mission}\n`;
      if (userQuestions.length > 0) {
        text += `Reflexión del usuario: "${userQuestions[userQuestions.length - 1]}"\n`;
      }
      if (lastReply) {
        text += `Conclusión dialéctica: "${lastReply.slice(0, 280)}..."\n\n`;
      }
    });
    return text;
  }, [currentRoute, activeRouteProgress]);

  const handleCopySynthesis = () => {
    navigator.clipboard.writeText(synthesisSummary);
    setCopiedSynthesis(true);
    setTimeout(() => setCopiedSynthesis(false), 2000);
  };

  const handleReturnToDojo = () => {
    stopAllAudio();
    if (onSelectView) {
      onSelectView('dojo');
    } else if (onClose) {
      onClose();
    }
  };

  // =========================================================================
  // PANTALLA 1: SELECTOR DE RUTAS DIALÉCTICAS
  // =========================================================================
  if (!activeRouteId || !currentRoute) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 bg-[#0b0e14] overflow-y-auto custom-scrollbar p-3 sm:p-5 md:p-6 space-y-5">
        
        {/* Barra Superior Fija de Retorno al Dojo Libre */}
        <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-[#12161f] border border-[#21262d] rounded-2xl shrink-0 shadow-md select-none">
          <button
            type="button"
            onClick={handleReturnToDojo}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-[#161b22] hover:bg-[#1f6feb] border border-[#30363d] hover:border-[#1f6feb] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Volver a la vista de chat libre con los pensadores"
          >
            <ArrowLeft className="w-4 h-4 text-[#58a6ff]" />
            <span>← Volver al Dojo Libre (Chat)</span>
          </button>

          <button
            type="button"
            onClick={onOpenBrujula}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-[#161b22] hover:bg-amber-950/40 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Abrir brújula de búsqueda dialéctica"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Brújula Dialéctica</span>
          </button>
        </div>

        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-[#10243e] via-[#12161f] to-[#1a1528] border border-[#1f6feb]/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-[#1f6feb]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1f6feb]/20 border border-[#1f6feb]/40 text-xs font-mono text-[#58a6ff]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>MÓDULO DE RUTAS DIALÉCTICAS</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              La Forja Conceptual
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              No examines tus ideas con un solo pensador. Somételas a un <strong className="text-white font-semibold">itinerario estructurado de 4 estaciones</strong>: desde la demolición de la falsa certeza (Sócrates) hasta la estructuración de la esencia, la delimitación crítica y el compromiso vital.
            </p>
          </div>
        </div>

        {/* Input para Forjar Concepto Propio */}
        <div className="bg-[#12161f] border border-[#21262d] rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>¿TIENES UN DILEMA O CONCEPTO PERSONAL?</span>
          </div>

          <form onSubmit={handleCreateCustomRoute} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={customConceptInput}
              onChange={(e) => setCustomConceptInput(e.target.value)}
              placeholder="Escribe tu concepto: ej. El amor líquido, El éxito laboral, La soledad..."
              className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#58a6ff] transition-all font-sans"
            />
            <button
              type="submit"
              disabled={!customConceptInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1f6feb] to-[#388bfd] hover:from-[#388bfd] hover:to-[#58a6ff] text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-[#1f6feb]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Forjar mi Ruta</span>
            </button>
          </form>
        </div>

        {/* Grid de Rutas Clásicas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#58a6ff]" />
              <span>RUTAS DIALÉCTICAS FUNDAMENTALES ({PREDEFINED_ROUTES.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PREDEFINED_ROUTES.map((route) => {
              const progress = routesState[route.id];
              const completedCount = progress?.completedSteps?.length || 0;
              const isCompleted = progress?.isCompleted;

              return (
                <div
                  key={route.id}
                  className="bg-[#12161f] border border-[#21262d] hover:border-[#1f6feb]/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-xl hover:shadow-[#1f6feb]/5 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{route.icon}</span>
                        <span className="text-[10px] font-mono font-bold bg-[#161b22] text-[#58a6ff] px-2 py-0.5 rounded-full border border-[#30363d]">
                          {route.tag}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span className="text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETA
                        </span>
                      ) : completedCount > 0 ? (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/30">
                          PASO {progress.currentStepIndex + 1}/4
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#58a6ff] transition-colors">
                        {route.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {route.description}
                      </p>
                    </div>

                    {/* Fila de Filósofos del Itinerario con Avatares Tipográficos */}
                    <div className="pt-2 border-t border-[#21262d]/60">
                      <span className="text-[10px] font-mono text-zinc-500 block mb-1.5 uppercase">
                        ESTACIONES DEL ITINERARIO:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {route.steps.map((st, i) => {
                          const char = getCharacterById(st.characterId);
                          const charName = char?.name || st.characterName || st.characterId;
                          return (
                            <div
                              key={st.stepNumber || i}
                              className="flex items-center gap-1.5 text-[11px] bg-[#161b22] px-2 py-1 rounded-lg border border-[#30363d] text-zinc-300"
                              title={`${st.stageTitle}: ${st.role}`}
                            >
                              <PhilosopherAvatar character={char} id={st.characterId} size="xs" showIcon={false} />
                              <span className="font-medium truncate max-w-[80px]">
                                {charName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartRoute(route)}
                    className="w-full py-2 px-3 rounded-xl bg-[#161b22] hover:bg-[#1f6feb] text-zinc-200 hover:text-white border border-[#30363d] hover:border-[#1f6feb] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group-hover:shadow-md"
                  >
                    <span>{completedCount > 0 ? 'Continuar Forja' : 'Iniciar Itinerario'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANTALLA 2: RUTA ACTIVA POR ETAPAS
  // =========================================================================
  const totalSteps = currentRoute.steps.length;
  const isLastStep = activeStepIndex === totalSteps - 1;
  const nextStepCharacter = !isLastStep ? getCharacterById(currentRoute.steps[activeStepIndex + 1]?.characterId) : null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#0b0e14] overflow-hidden p-2 sm:p-4 space-y-3">
      
      {/* 1. Cabecera y Navegación de la Forja (Mobile & Desktop Friendly) */}
      <div className="p-2.5 sm:p-3 bg-[#12161f] border border-[#21262d] rounded-2xl flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-md select-none">
        <div className="flex items-center gap-2 min-w-0">
          {/* Botón Volver al Dojo Libre */}
          <button
            type="button"
            onClick={handleReturnToDojo}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-[#161b22] hover:bg-[#1f6feb] border border-[#30363d] hover:border-[#1f6feb] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Volver a la vista principal de chat libre"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volver al Dojo</span>
            <span className="sm:hidden">Dojo</span>
          </button>

          {/* Botón Selector de Rutas */}
          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              setActiveRouteId(null);
            }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer shrink-0"
            title="Cambiar de ruta dialéctica"
          >
            <Compass className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span className="hidden md:inline ml-1.5">Otras Rutas</span>
          </button>

          <div className="min-w-0 pl-1 border-l border-[#30363d]/60">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{currentRoute.icon}</span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">
                {currentRoute.title}
              </h2>
            </div>
            <span className="text-[10px] text-zinc-400 font-sans block truncate">
              {currentStep.stageTitle} — {currentStep.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle Auto-Voz */}
          <button
            type="button"
            onClick={onToggleAutoSpeak}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              autoSpeakEnabled
                ? 'bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/50'
                : 'bg-[#161b22] text-zinc-400 border-[#30363d]'
            }`}
            title={autoSpeakEnabled ? 'Voz activada' : 'Voz silenciada'}
          >
            {autoSpeakEnabled ? <Volume2 className="w-4 h-4 text-[#58a6ff]" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          {/* Reiniciar Ruta */}
          <button
            type="button"
            onClick={handleResetCurrentRoute}
            className="p-2 rounded-xl text-zinc-400 hover:text-red-300 bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer"
            title="Reiniciar esta forja desde el paso 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Stepper Horizontal Responsive */}
      <div className="bg-[#12161f] border border-[#21262d] rounded-2xl p-2.5 sm:p-3 shrink-0 select-none">
        <div className="grid grid-cols-4 gap-2">
          {currentRoute.steps.map((st, idx) => {
            const char = getCharacterById(st.characterId);
            const charName = char?.name || st.characterName || st.characterId;
            const isCompleted = activeRouteProgress?.completedSteps?.includes(idx);
            const isActive = activeStepIndex === idx;

            return (
              <button
                key={st.stepNumber || idx}
                type="button"
                onClick={() => {
                  stopAllAudio();
                  setActiveStepIndex(idx);
                }}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#10243e] border-[#1f6feb] shadow-md ring-1 ring-[#1f6feb]/40'
                    : isCompleted
                    ? 'bg-[#0e1726] border-emerald-500/40 text-zinc-200'
                    : 'bg-[#161b22] border-[#30363d]/70 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isActive ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#58a6ff] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-pulse" />
                    </div>
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="min-w-0 hidden sm:block">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">
                    Paso {idx + 1}
                  </div>
                  <div className="text-xs font-bold text-zinc-100 truncate">
                    {charName}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Card de Misión de la Etapa + Acción para Saltar a su Chat Libre */}
      <div className="bg-[#12161f] border border-[#21262d] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <PhilosopherAvatar character={currentStepCharacter} size="lg" />

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {currentStepCharacter?.name || currentStep.characterName}
              </h3>
              {currentStepCharacter?.era && (
                <span className="text-[10px] font-mono text-zinc-400 bg-[#161b22] px-2 py-0.5 rounded-full border border-[#30363d]">
                  {currentStepCharacter.era}
                </span>
              )}
              <span className="text-[10px] font-mono font-bold text-[#58a6ff] bg-[#1f6feb]/20 px-2 py-0.5 rounded-full border border-[#1f6feb]/30">
                {currentStep.role}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed select-text">
              🎯 <strong className="text-zinc-100">Misión:</strong> {currentStep.mission}
            </p>
          </div>
        </div>

        {/* Botón para saltar directo a su chat libre */}
        {onSelectCharacter && (
          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              onSelectCharacter(currentStepCharacter.id || currentStep.characterId);
            }}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-[#161b22] hover:bg-[#1f6feb]/20 text-[#58a6ff] hover:text-white border border-[#30363d] hover:border-[#1f6feb] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
            title={`Iniciar diálogo libre e ilimitado con ${currentStepCharacter?.name}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comenzar diálogo con {currentStepCharacter?.name?.split(' ')[0]}</span>
          </button>
        )}
      </div>

      {/* 4. Chat de la Etapa */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto px-3 py-4 rounded-2xl bg-[#0e1217]/80 border border-[#1e2633] shadow-inner custom-scrollbar space-y-4">
        {currentMessages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSpeaking = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 w-full ${
                isUser ? 'justify-end' : 'justify-start'
              } animate-fadeIn`}
            >
              {!isUser && (
                <PhilosopherAvatar character={currentStepCharacter} size="sm" className="mt-0.5 shadow-sm" />
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 shadow-md select-text ${
                  isUser
                    ? 'bg-[#1a2b47] border border-[#1f6feb]/50 text-blue-50 rounded-tr-sm ml-6'
                    : `bg-[#161b22] border ${
                        isSpeaking
                          ? 'border-[#58a6ff] ring-1 ring-[#58a6ff]/40 shadow-lg shadow-[#1f6feb]/10'
                          : 'border-[#30363d]'
                      } text-zinc-200 rounded-tl-sm mr-6`
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-zinc-400 font-mono select-none">
                  <span>
                    {isUser ? 'TÚ' : (currentStepCharacter?.name || currentStep.characterName || 'FILÓSOFO').toUpperCase()}
                  </span>
                  <span>{msg.timestamp || 'AHORA'}</span>
                </div>

                {msg.image && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-[#30363d] max-w-xs shadow-md">
                    <img src={msg.image} alt="Adjunto" className="w-full h-auto max-h-48 object-contain" />
                  </div>
                )}

                <div className="text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap font-sans text-zinc-100 select-text cursor-text">
                  {msg.text}
                </div>

                {!isUser && msg.text && (
                  <div className="mt-2.5 pt-2 border-t border-[#30363d]/60 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleReplay(msg)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                        isSpeaking
                          ? 'bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40'
                          : 'text-zinc-400 hover:text-[#58a6ff]'
                      }`}
                      title={isSpeaking ? 'Detener voz' : 'Escuchar respuesta'}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                      <span>{isSpeaking ? 'Detener' : 'Escuchar'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {interimTranscript && (
          <div className="flex items-start gap-3 w-full justify-end animate-fadeIn">
            <div className="bg-[#1f6feb]/10 border border-dashed border-[#1f6feb]/50 text-blue-200 rounded-2xl rounded-tr-sm p-3 max-w-[80%] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="text-xs italic break-words">"{interimTranscript}..."</span>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2.5 w-full justify-start animate-fadeIn">
            <PhilosopherAvatar character={currentStepCharacter} size="sm" />
            <div className="px-3 py-2 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-[#58a6ff] rounded-full animate-bounce"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-0 w-0" />
      </div>

      {/* 5. Barra de Transición de Etapa */}
      <div className="p-2.5 bg-[#12161f] border border-[#21262d] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 shadow-md">
        <div className="text-xs text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isLastStep
              ? 'Has alcanzado la última estación de la forja.'
              : `Siguiente estación: ${nextStepCharacter?.name || currentRoute.steps[activeStepIndex + 1]?.characterName || 'Siguiente filósofo'}.`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdvanceStep}
          disabled={isProcessing || currentMessages.length < 2}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#1f6feb] to-[#388bfd] hover:from-[#388bfd] hover:to-[#58a6ff] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#1f6feb]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {isLastStep ? (
            <>
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>Finalizar y Forjar Síntesis</span>
            </>
          ) : (
            <>
              <span>Superar Etapa y Pasar a {nextStepCharacter?.name || currentRoute.steps[activeStepIndex + 1]?.characterName || 'Siguiente filósofo'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* 6. Barra de Entrada para la Etapa */}
      <div className="bg-[#12161f] border border-[#21262d] rounded-2xl p-2 sm:p-2.5 shadow-lg shrink-0">
        {attachedImage && (
          <div className="mb-2 p-2 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between max-w-xs">
            <img src={attachedImage} alt="Adjunto" className="w-16 h-16 object-cover rounded-lg border border-[#30363d]" />
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22] rounded-xl transition-colors cursor-pointer shrink-0"
            title="Adjuntar imagen"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleListen}
            disabled={isProcessing}
            className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161b22]'
            }`}
            title={isListening ? 'Detener micrófono' : 'Hablar por micrófono'}
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Debate con ${currentStepCharacter?.name}: ${currentStep.role}...`}
            disabled={isProcessing}
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !attachedImage) || isProcessing}
            className="p-2.5 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-sm"
            title="Enviar réplica"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 7. Modal de Síntesis Final */}
      {showSynthesisModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-[#0b0e14] border border-[#21262d] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans text-zinc-100 max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-[#12161f] border-b border-[#21262d] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    ¡Forja Dialéctica Completada!
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {currentRoute.title} — {currentRoute.concept}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowSynthesisModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
              <div className="p-4 rounded-2xl bg-[#161b22] border border-[#30363d] space-y-2">
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                  Has templado tu comprensión de <strong>"{currentRoute.concept}"</strong> superando las 4 etapas dialécticas:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
                  {currentRoute.steps.map((st, i) => {
                    const char = getCharacterById(st.characterId);
                    return (
                      <div key={st.stepNumber || i} className="flex items-center gap-1.5 text-zinc-400 bg-[#0d1117] p-2 rounded-xl border border-[#21262d]">
                        <PhilosopherAvatar character={char} id={st.characterId} size="xs" showIcon={false} />
                        <span className="truncate">{char?.name || st.characterName || st.characterId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-zinc-400 block mb-2 font-bold">
                  DOCUMENTO DE SÍNTESIS CRÍTICA:
                </label>
                <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar select-text">
                  {synthesisSummary}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#12161f] border-t border-[#21262d] flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={handleCopySynthesis}
                className="px-4 py-2.5 rounded-xl bg-[#161b22] hover:bg-[#1f6feb]/20 text-[#58a6ff] hover:text-white border border-[#30363d] hover:border-[#1f6feb] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                {copiedSynthesis ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSynthesis ? 'Copiado al Portapapeles' : 'Copiar Síntesis Completa'}</span>
              </button>

              <button
                onClick={() => {
                  setShowSynthesisModal(false);
                  handleReturnToDojo();
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                Volver al Dojo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
