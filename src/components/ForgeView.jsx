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
} from 'lucide-react';
import { PREDEFINED_ROUTES, createCustomRoute } from '../config/routes';
import { getCharacterById } from '../config/characters';
import { sendMessage } from '../services/gemini';
import { playNeuralVoice, stopAllAudio } from '../services/neuralAudio';
import { SpeechRecognizer, isSpeechRecognitionSupported } from '../services/speech';

const STORAGE_KEY = 'forge_active_routes_state';

export const ForgeView = ({
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
  onOpenBrujula,
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
    return getCharacterById(currentStep.characterId);
  }, [currentStep]);

  // Mensajes de la etapa actual
  const currentMessages = useMemo(() => {
    if (!activeRouteId || !activeRouteProgress) return [];
    return activeRouteProgress.stepMessages?.[activeStepIndex] || [];
  }, [activeRouteId, activeRouteProgress, activeStepIndex]);

  // Inicializar saludo del filósofo si la etapa está vacía
  useEffect(() => {
    if (!activeRouteId || !currentStep || !currentStepCharacter) return;

    setRoutesState((prev) => {
      const routeData = prev[activeRouteId] || {
        currentStepIndex: activeStepIndex,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      };

      const existingStepMsgs = routeData.stepMessages?.[activeStepIndex];
      if (!existingStepMsgs || existingStepMsgs.length === 0) {
        const initialMsg = {
          id: `init-forge-${activeRouteId}-${activeStepIndex}`,
          role: 'model',
          text: currentStep.initialGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isGreeting: true,
        };

        const updated = {
          ...routeData,
          stepMessages: {
            ...routeData.stepMessages,
            [activeStepIndex]: [initialMsg],
          },
        };

        // Si autoSpeak está activo, hablar el saludo
        if (autoSpeakEnabled) {
          playNeuralVoice(currentStep.initialGreeting, {
            character: currentStepCharacter,
          });
        }

        return { ...prev, [activeRouteId]: updated };
      }

      return prev;
    });
  }, [activeRouteId, activeStepIndex, currentStep, currentStepCharacter]);

  // Auto-scroll en el chat de la forja
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isProcessing, interimTranscript]);

  // Reconocimiento de voz por micrófono
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;

    const recognizer = new SpeechRecognizer({
      lang: 'es-ES',
      onResult: (text, isFinal) => {
        if (isFinal) {
          setInputText((prev) => (prev ? `${prev} ${text}` : text));
          setInterimTranscript('');
          setIsListening(false);
        } else {
          setInterimTranscript(text);
        }
      },
      onError: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
    });

    recognizerRef.current = recognizer;

    return () => {
      recognizer.abort();
      stopAllAudio();
    };
  }, []);

  const handleToggleListen = () => {
    if (!recognizerRef.current) return;
    if (isListening) {
      recognizerRef.current.stop();
      setIsListening(false);
    } else {
      stopAllAudio();
      setIsListening(true);
      recognizerRef.current.start();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Enviar mensaje en la etapa
  const handleSendMessage = async () => {
    const textToSend = inputText.trim();
    if (!textToSend && !attachedImage) return;

    stopAllAudio();
    setInputText('');
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setIsProcessing(true);

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      image: imageToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Actualizar historial local
    const nextStepMessages = [...currentMessages, userMsg];

    setRoutesState((prev) => {
      const current = prev[activeRouteId] || {
        currentStepIndex: activeStepIndex,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      };

      return {
        ...prev,
        [activeRouteId]: {
          ...current,
          stepMessages: {
            ...current.stepMessages,
            [activeStepIndex]: nextStepMessages,
          },
        },
      };
    });

    // Formatear historial para Gemini
    const historyForGemini = nextStepMessages.slice(0, -1).map((m) => ({
      role: m.role,
      text: m.text,
      image: m.image,
    }));

    const combinedSystemPrompt = `
${currentStepCharacter?.systemPrompt || ''}

---
CONTEXTO DE LA FORJA CONCEPTUAL:
Estás participando en la forja dialéctica estructurada del concepto: "${currentRoute.concept}".
Etapa actual: ${currentStep.stageTitle} (${currentStep.role}).
Misión de esta etapa: ${currentStep.mission}
${currentStep.systemPromptAddendum}

REGLAS DE DIALÉCTICA:
1. Mantén la coherencia con el objetivo de esta etapa específica.
2. Respuestas de 2 a 4 oraciones rigurosas, incisivas y en español contemporáneo.
3. Al finalizar, plantea una pregunta o interpelación que empuje la reflexión hacia el núcleo de la misión.
`;

    try {
      const reply = await sendMessage({
        userInput: textToSend,
        image: imageToSend,
        systemPrompt: combinedSystemPrompt,
        history: historyForGemini,
        philosopherId: currentStepCharacter?.id || 'filosofo',
      });

      const modelMsg = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...nextStepMessages, modelMsg];

      setRoutesState((prev) => {
        const current = prev[activeRouteId] || {
          currentStepIndex: activeStepIndex,
          completedSteps: [],
          stepMessages: {},
          isCompleted: false,
        };

        return {
          ...prev,
          [activeRouteId]: {
            ...current,
            stepMessages: {
              ...current.stepMessages,
              [activeStepIndex]: finalMessages,
            },
          },
        };
      });

      if (autoSpeakEnabled) {
        playNeuralVoice(reply, {
          character: currentStepCharacter,
          onStart: () => setSpeakingMessageId(modelMsg.id),
          onEnd: () => setSpeakingMessageId(null),
          onError: () => setSpeakingMessageId(null),
        });
      }
    } catch (err) {
      console.error('Error en Forja Conceptual Gemini:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reproducir audio bajo demanda
  const handleReplay = (msg) => {
    if (speakingMessageId === msg.id) {
      stopAllAudio();
      setSpeakingMessageId(null);
    } else {
      stopAllAudio();
      playNeuralVoice(msg.text, {
        character: currentStepCharacter,
        onStart: () => setSpeakingMessageId(msg.id),
        onEnd: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    }
  };

  // Avanzar a la siguiente etapa
  const handleAdvanceStep = () => {
    stopAllAudio();
    const nextIndex = activeStepIndex + 1;

    setRoutesState((prev) => {
      const current = prev[activeRouteId] || {
        currentStepIndex: 0,
        completedSteps: [],
        stepMessages: {},
        isCompleted: false,
      };

      const completed = Array.from(new Set([...current.completedSteps, activeStepIndex]));
      const isNowComplete = nextIndex >= (currentRoute?.steps?.length || 4);

      return {
        ...prev,
        [activeRouteId]: {
          ...current,
          completedSteps: completed,
          currentStepIndex: isNowComplete ? current.currentStepIndex : nextIndex,
          isCompleted: isNowComplete ? true : current.isCompleted,
        },
      };
    });

    if (nextIndex < (currentRoute?.steps?.length || 4)) {
      setActiveStepIndex(nextIndex);
    } else {
      setShowSynthesisModal(true);
    }
  };

  // Iniciar una ruta predefinida
  const handleStartRoute = (route) => {
    stopAllAudio();
    setActiveRouteId(route.id);
    const existingProgress = routesState[route.id];
    if (!existingProgress) {
      setRoutesState((prev) => ({
        ...prev,
        [route.id]: {
          currentStepIndex: 0,
          completedSteps: [],
          stepMessages: {},
          isCompleted: false,
        },
      }));
      setActiveStepIndex(0);
    } else {
      setActiveStepIndex(existingProgress.currentStepIndex || 0);
    }
  };

  // Crear e iniciar ruta personalizada
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
      text += `Pensador: ${stepChar?.name || step.characterId} (${step.role})\n`;
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

  // =========================================================================
  // PANTALLA 1: SELECTOR DE RUTAS DIALÉCTICAS
  // =========================================================================
  if (!activeRouteId || !currentRoute) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 bg-[#0b0e14] overflow-y-auto custom-scrollbar p-3 sm:p-5 md:p-6 space-y-6">
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

                    {/* Fila de Filósofos del Itinerario */}
                    <div className="pt-2 border-t border-[#21262d]/60">
                      <span className="text-[10px] font-mono text-zinc-500 block mb-1.5 uppercase">
                        ESTACIONES DEL ITINERARIO:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {route.steps.map((st, i) => {
                          const char = getCharacterById(st.characterId);
                          return (
                            <div
                              key={st.stepNumber}
                              className="flex items-center gap-1 text-[11px] bg-[#161b22] px-2 py-1 rounded-lg border border-[#30363d] text-zinc-300"
                              title={`${st.stageTitle}: ${st.role}`}
                            >
                              <span className="text-zinc-500 font-mono text-[9px]">{i + 1}.</span>
                              <span className="font-medium truncate max-w-[80px]">
                                {char?.name || st.characterId}
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
      {/* 1. Cabecera de la Forja */}
      <div className="p-3 bg-[#12161f] border border-[#21262d] rounded-2xl flex items-center justify-between gap-3 shrink-0 shadow-md select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              setActiveRouteId(null);
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer shrink-0"
            title="Volver al catálogo de rutas"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{currentRoute.icon}</span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">
                {currentRoute.title}
              </h2>
              <span className="hidden sm:inline-block text-[10px] font-mono text-[#58a6ff] bg-[#1f6feb]/20 px-2 py-0.5 rounded-full border border-[#1f6feb]/40">
                {currentRoute.concept}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-sans block truncate">
              {currentStep.stageTitle} — {currentStep.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
            {autoSpeakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
            const isCompleted = activeRouteProgress?.completedSteps?.includes(idx);
            const isActive = activeStepIndex === idx;

            return (
              <button
                key={st.stepNumber}
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
                    {char?.name || st.characterId}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Card de Misión de la Etapa */}
      <div className="bg-[#12161f] border border-[#21262d] rounded-2xl p-3 sm:p-4 flex items-start gap-3.5 shrink-0 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
          {currentStepCharacter?.avatar ? (
            <img
              src={currentStepCharacter.avatar}
              alt={currentStepCharacter.name}
              className="w-full h-full object-cover filter contrast-125 grayscale"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-lg">🏛️</span>
          )}
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-white">
              {currentStepCharacter?.name}
            </span>
            <span className="text-[10px] font-mono font-bold text-[#58a6ff] bg-[#1f6feb]/20 px-2 py-0.5 rounded-full border border-[#1f6feb]/30">
              {currentStep.role}
            </span>
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed select-text">
            🎯 <strong className="text-zinc-100">Misión:</strong> {currentStep.mission}
          </p>
        </div>
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
                <div className="w-8 h-8 rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0 mt-0.5">
                  {currentStepCharacter?.avatar ? (
                    <img
                      src={currentStepCharacter.avatar}
                      alt={currentStepCharacter.name}
                      className="w-full h-full object-cover grayscale contrast-125"
                    />
                  ) : (
                    <span>🏛️</span>
                  )}
                </div>
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
                  <span>{isUser ? 'TÚ' : currentStepCharacter?.name?.toUpperCase()}</span>
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
            <div className="w-8 h-8 rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0">
              <span>🏛️</span>
            </div>
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
              : `Siguiente estación: ${nextStepCharacter?.name || 'Siguiente filósofo'}.`}
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
              <span>Superar Etapa y Pasar a {nextStepCharacter?.name}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* 6. Barra de Entrada de Mensaje */}
      <div className="bg-[#12161f] border border-[#21262d] rounded-2xl p-2 sm:p-2.5 shrink-0">
        {attachedImage && (
          <div className="mb-2 relative inline-block">
            <img src={attachedImage} alt="Adjunto" className="w-16 h-16 object-cover rounded-lg border border-[#30363d]" />
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer"
            title="Adjuntar imagen"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleListen}
            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
              isListening
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                : 'text-zinc-400 hover:text-white bg-[#161b22] border-[#30363d]'
            }`}
            title="Dictar por voz"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Debate con ${currentStepCharacter?.name} sobre ${currentRoute.concept}...`}
            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#58a6ff] transition-all font-sans"
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && !attachedImage) || isProcessing}
            className="p-2 rounded-xl bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-all shadow-md shadow-[#1f6feb]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7. Modal de Síntesis Final de la Forja */}
      {showSynthesisModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn select-none">
          <div className="bg-[#0b0e14] border border-[#21262d] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans text-zinc-100 max-h-[85vh]">
            <div className="p-4 sm:p-5 bg-[#12161f] border-b border-[#21262d] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Síntesis de la Forja Conceptual</h3>
                  <p className="text-xs text-zinc-400">
                    Concepto templado: <span className="text-[#58a6ff] font-semibold">{currentRoute.concept}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSynthesisModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-[#161b22] border border-[#30363d] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              <div className="p-4 rounded-2xl bg-[#12161f] border border-[#21262d] font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap select-text">
                {synthesisSummary}
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-[#12161f] border-t border-[#21262d] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCopySynthesis}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161b22] hover:bg-[#21262d] text-[#58a6ff] border border-[#30363d] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSynthesis ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSynthesis ? 'Copiado al Portapapeles' : 'Copiar Síntesis Completa'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSynthesisModal(false);
                  setActiveRouteId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-all shadow-md cursor-pointer"
              >
                Explorar Otras Rutas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
