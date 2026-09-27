import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  AlertTriangle,
  RotateCcw,
  Shield,
  Trash2,
} from 'lucide-react';
import { ThreadTabs } from './components/ThreadTabs';
import { ChatTranscript } from './components/ChatTranscript';
import { MessageInputBar } from './components/MessageInputBar';
import { ConceptInspectorModal } from './components/ConceptInspectorModal';
import {
  getThreads,
  saveThreads,
  getActiveThreadId,
  setActiveThreadId,
  createNewThread,
  renameThread,
  deleteThread,
  addMessageToThread,
} from './services/threadStorage';
import { sendMessage, getApiKey } from './services/gemini';
import {
  SpeechRecognizer,
  isSpeechRecognitionSupported,
  speakPhilosopherText,
  cancelSpeech,
} from './services/speech';
import {
  playNeuralVoice,
  stopNeuralAudio,
} from './services/neuralAudio';

export default function App() {
  // Estado de hilos temáticos persistentes
  const [threads, setThreads] = useState(() => getThreads());
  const [activeThreadIdState, setActiveThreadIdState] = useState(() => getActiveThreadId());

  // Hilo activo actual
  const currentThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadIdState) || threads[0] || null;
  }, [threads, activeThreadIdState]);

  // Estados de proceso y audio
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [prefilledInput, setPrefilledInput] = useState('');

  // Modal de Inspector de Conceptos
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);

  // Auto-speak opcional
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(() => {
    try {
      return localStorage.getItem('app_auto_speak_enabled') === 'true';
    } catch (e) {
      return false;
    }
  });

  const recognizerRef = useRef(null);
  const currentThreadRef = useRef(currentThread);

  useEffect(() => {
    currentThreadRef.current = currentThread;
  }, [currentThread]);

  // Selección de hilo
  const handleSelectThread = useCallback((threadId) => {
    stopNeuralAudio();
    cancelSpeech();
    setSpeakingMessageId(null);
    setActiveThreadIdState(threadId);
    setActiveThreadId(threadId);
    setErrorMessage('');
  }, []);

  // Crear nuevo hilo
  const handleCreateThread = useCallback((title) => {
    stopNeuralAudio();
    cancelSpeech();
    const { newThread, threads: updatedList } = createNewThread(title);
    setThreads(updatedList);
    setActiveThreadIdState(newThread.id);
    setErrorMessage('');
  }, []);

  // Renombrar hilo
  const handleRenameThread = useCallback((threadId, newTitle) => {
    const updated = renameThread(threadId, newTitle);
    setThreads(updated);
  }, []);

  // Eliminar hilo
  const handleDeleteThread = useCallback((threadId) => {
    stopNeuralAudio();
    cancelSpeech();
    const { threads: updated, activeId } = deleteThread(threadId);
    setThreads(updated);
    setActiveThreadIdState(activeId);
  }, []);

  // Toggle de auto-lectura por voz
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
      }
      return next;
    });
  }, []);

  // Reproducir mensaje específico por voz
  const handleReplayAudio = useCallback(async (message) => {
    if (!message?.text) return;

    if (speakingMessageId === message.id) {
      stopNeuralAudio();
      cancelSpeech();
      setSpeakingMessageId(null);
      return;
    }

    stopNeuralAudio();
    cancelSpeech();
    setSpeakingMessageId(message.id);

    try {
      await playNeuralVoice({
        text: message.text,
        voice: 'es-ES-AlvaroNeural',
        onEnd: () => setSpeakingMessageId(null),
      });
    } catch (e) {
      // Fallback a speech synthesis de navegador
      speakPhilosopherText({
        text: message.text,
        lang: 'es-ES',
        onEnd: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    }
  }, [speakingMessageId]);

  // Enviar mensaje al Sparring Intelectual
  const handleSendMessage = async (textToSend, attachedImage = null) => {
    const trimmed = textToSend?.trim();
    if ((!trimmed && !attachedImage) || isProcessing || !currentThread) return;

    setErrorMessage('');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Crear y registrar mensaje del usuario
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      image: attachedImage,
      timestamp: nowTime,
    };

    const targetThreadId = currentThread.id;
    const threadHistory = [...(currentThread.messages || []), userMsg];

    // Actualizar estado local e historial persistente
    const updatedWithUser = addMessageToThread(targetThreadId, userMsg);
    setThreads(updatedWithUser);
    setIsProcessing(true);

    try {
      // 2. Consultar a Gemini con el system prompt del Sparring Intelectual
      const reply = await sendMessage({
        userInput: trimmed,
        image: attachedImage,
        history: threadHistory,
      });

      const modelMsg = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalUpdated = addMessageToThread(targetThreadId, modelMsg);
      setThreads(finalUpdated);

      // Auto-lectura si está activada
      if (autoSpeakEnabled) {
        handleReplayAudio(modelMsg);
      }
    } catch (err) {
      console.error('[App Error] Falló llamada al Sparring:', err);
      const detail = err?.message || 'Error al comunicarse con la IA.';
      setErrorMessage(`No se pudo recibir réplica del Sparring: ${detail}`);

      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Error de Indagación:** No se pudo completar la réplica.\n\n*Detalle técnico:* ${detail}\n\nVerifica tu conexión y clave de Gemini en el archivo \`.env\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setThreads(addMessageToThread(targetThreadId, errorMsg));
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejo de Reconocimiento de Voz (STT)
  const handleToggleListen = useCallback(() => {
    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    try {
      const recognizer = new SpeechRecognizer({
        lang: 'es-ES',
        onResult: (finalText) => {
          if (finalText?.trim()) {
            handleSendMessage(finalText.trim());
          }
          setIsListening(false);
          setInterimTranscript('');
        },
        onInterim: (text) => setInterimTranscript(text),
        onError: (err) => {
          console.warn('[SpeechRecognizer Error]:', err);
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
    } catch (e) {
      console.error('Error iniciando reconocimiento de voz:', e);
      setIsListening(false);
    }
  }, [isListening, handleSendMessage]);

  const hasApiKey = Boolean(getApiKey());

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07090e] text-zinc-100 font-sans selection:bg-[#1f6feb]/30 selection:text-white">
      {/* 1. Barra Superior Principal (Header Minimalista) */}
      <header className="bg-[#0b0e14] border-b border-[#21262d] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 select-none shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#162338] to-[#1f6feb]/30 border border-[#1f6feb]/50 flex items-center justify-center text-base shadow-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
                Sparring Intelectual
              </h1>
              <span className="text-[10px] font-mono font-bold bg-[#1f6feb]/15 text-[#58a6ff] px-2 py-0.5 rounded-full border border-[#1f6feb]/30 uppercase">
                Dojo Dialéctico
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Indagación reflexiva, mesa de contraste y rigor socrático sin condescendencia
            </p>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2">
          {/* Botón rápido del Inspector de Conceptos */}
          <button
            type="button"
            onClick={() => setIsConceptModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Abrir Glosario / Inspector de Conceptos"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span className="hidden sm:inline">Glosario</span>
          </button>

          {/* Estado de API Key */}
          {!hasApiKey && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium"
              title="Falta configurar VITE_GEMINI_API_KEY en .env"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Sin API Key</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Barra Deslizable de Pestañas Temáticas (Threads) */}
      <ThreadTabs
        threads={threads}
        activeThreadId={currentThread?.id}
        onSelectThread={handleSelectThread}
        onCreateThread={handleCreateThread}
        onRenameThread={handleRenameThread}
        onDeleteThread={handleDeleteThread}
      />

      {/* 3. Área Central: Diálogo del Hilo Activo */}
      <main className="flex-1 min-h-0 w-full flex flex-col max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-2">
        {errorMessage && (
          <div className="mb-3 p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between text-xs text-red-200 animate-fadeIn">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-red-400 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <ChatTranscript
          messages={currentThread?.messages || []}
          isProcessing={isProcessing}
          isSpeaking={Boolean(speakingMessageId)}
          speakingMessageId={speakingMessageId}
          interimTranscript={interimTranscript}
          onReplayAudio={handleReplayAudio}
        />

        {/* 4. Barra Inferior de Entrada */}
        <div className="mt-3 shrink-0">
          <MessageInputBar
            isListening={isListening}
            isProcessing={isProcessing}
            onToggleListen={handleToggleListen}
            onSendMessage={handleSendMessage}
            onOpenConceptInspector={() => setIsConceptModalOpen(true)}
            autoSpeakEnabled={autoSpeakEnabled}
            onToggleAutoSpeak={handleToggleAutoSpeak}
            isSttSupported={isSpeechRecognitionSupported()}
            externalInput={prefilledInput}
            onClearExternalInput={() => setPrefilledInput('')}
          />
        </div>
      </main>

      {/* 5. Modal Inspector de Conceptos */}
      <ConceptInspectorModal
        isOpen={isConceptModalOpen}
        onClose={() => setIsConceptModalOpen(false)}
        onInsertIntoChat={(text) => setPrefilledInput(text)}
      />
    </div>
  );
}
