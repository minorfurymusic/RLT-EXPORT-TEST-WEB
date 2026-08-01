import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Footprints, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus,
  Settings,
  X,
  AlertCircle,
  Phone,
  Zap,
  Activity,
  ChevronRight,
  ChevronLeft
} from './Icons';
import useStepCounter from '../hooks/useStepCounter';
import { useHealth } from '../context/HealthContext';

interface StepCounterProps {
  onClose?: () => void;
  compact?: boolean;
  embedded?: boolean;
}

export default function StepCounter({ onClose, compact = false, embedded = false }: StepCounterProps) {
  const { profile, updateProfile, addRecord, getTodayValue } = useHealth();
  const [showSettings, setShowSettings] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualSteps, setManualSteps] = useState('');
  const [sensitivity, setSensitivity] = useState(5);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const {
    steps,
    isTracking,
    hasSensorSupport,
    error,
    startTracking,
    stopTracking,
    resetSteps,
    addSteps,
    simulateSteps
  } = useStepCounter({
    sensitivity,
    onStep: (total) => {
      // Auto-sync with HealthContext when steps change
      addRecord('steps', total);
    }
  });

  // Get initial steps from HealthContext if available
  const contextSteps = getTodayValue('steps');
  const displaySteps = steps > 0 ? steps : contextSteps;
  const goalProgress = Math.min(100, (displaySteps / profile.stepGoal) * 100);
  const isGoalReached = displaySteps >= profile.stepGoal;

  // Sync with HealthContext on mount and periodically
  useEffect(() => {
    if (steps > 0 && steps !== contextSteps) {
      addRecord('steps', steps);
    }
  }, [steps]);

  // Try to auto-start tracking on mount
  useEffect(() => {
    if (hasSensorSupport && !isTracking) {
      startTracking();
    }
  }, [hasSensorSupport]);

  const handleManualAdd = () => {
    const amount = parseInt(manualSteps, 10);
    if (amount > 0 && amount <= 10000) {
      addSteps(amount);
      addRecord('steps', displaySteps + amount);
      setManualSteps('');
      setShowManualAdd(false);
    }
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja zerar os passos de hoje?')) {
      resetSteps();
      addRecord('steps', 0);
    }
  };

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const getStatusMessage = () => {
    if (error) return error;
    if (!hasSensorSupport) return 'Sensor de movimento não disponível';
    if (isTracking) return 'Rastreando passos em tempo real...';
    return 'Toque para iniciar o rastreamento';
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (compact) {
    // Compact view for embedding in other components
    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${
              isGoalReached ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
            }`}>
              <Footprints className="size-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Passos</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {displaySteps.toLocaleString()} / {profile.stepGoal.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-xs font-bold ${isGoalReached ? 'text-emerald-500' : 'text-blue-500'}`}>
              {Math.round(goalProgress)}%
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full rounded-full ${isGoalReached ? 'bg-emerald-500' : 'bg-blue-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${goalProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    );
  }

  if (embedded) {
    // Embedded view for Exercises component
    return (
      <div 
        onClick={() => onClose && onClose()}
        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/10 shadow-sm group cursor-pointer hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${
              isGoalReached ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
            }`}>
              <Footprints className="size-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Step Goal</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {displaySteps.toLocaleString()} / {profile.stepGoal.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-xs font-bold ${isGoalReached ? 'text-emerald-500' : 'text-amber-500'}`}>
              {Math.round(goalProgress)}%
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isGoalReached ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>
    );
  }

  // Full view
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background-light dark:bg-background-dark"
    >
      {/* Header */}
      <header className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-primary/10">
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft className="size-6 text-slate-600 dark:text-slate-300" />
          </button>
        )}
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">
            Contador de Passos
          </h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-primary"
        >
          <Settings className="size-6" />
        </button>
      </header>

      <main className="p-4 space-y-6">
        {/* Main Step Display */}
        <motion.div 
          className={`relative overflow-hidden rounded-3xl p-8 ${
            isGoalReached 
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 text-center text-white">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Footprints className="size-8" />
              <span className="text-2xl font-bold">{displaySteps.toLocaleString()}</span>
            </div>
            
            <div className="text-white/80 text-lg mb-6">
              de {profile.stepGoal.toLocaleString()} passos
            </div>
            
            {/* Progress Ring */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: 352, strokeDashoffset: 352 }}
                  animate={{ strokeDashoffset: 352 - (352 * goalProgress / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-black">{Math.round(goalProgress)}%</span>
              </div>
            </div>

            {isGoalReached && (
              <motion.div 
                className="bg-white/20 rounded-xl p-3 mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="font-bold">🎉 Meta atingida!</p>
                <p className="text-sm text-white/80">Continue assim!</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Status Card */}
        <div className={`p-4 rounded-2xl border ${
          isTracking 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${
              isTracking 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                : 'bg-slate-100 dark:bg-slate-900/30 text-slate-600'
            }`}>
              {isTracking ? <Activity className="size-5 animate-pulse" /> : <Phone className="size-5" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                isTracking ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {getStatusMessage()}
              </p>
              {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleToggleTracking}
            className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all ${
              isTracking
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {isTracking ? (
              <>
                <Pause className="size-5" />
                Pausar
              </>
            ) : (
              <>
                <Play className="size-5" />
                Iniciar
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 p-4 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <RotateCcw className="size-5" />
            Zerar
          </button>
        </div>

        {/* Manual Entry */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowManualAdd(!showManualAdd)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Plus className="size-5" />
              </div>
              <span className="font-medium text-slate-900 dark:text-slate-100">Adicionar passos manualmente</span>
            </div>
            <ChevronRight className={`size-5 text-slate-400 transition-transform ${showManualAdd ? 'rotate-90' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showManualAdd && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={manualSteps}
                      onChange={(e) => setManualSteps(e.target.value)}
                      placeholder="Quantidade"
                      min="1"
                      max="10000"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleManualAdd}
                      disabled={!manualSteps || parseInt(manualSteps) <= 0}
                      className="px-6 py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Add Buttons */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-slate-100">Adicionar rapidamente</h3>
          <div className="grid grid-cols-4 gap-2">
            {[100, 500, 1000, 2000].map(amount => (
              <button
                key={amount}
                onClick={() => {
                  addSteps(amount);
                  addRecord('steps', displaySteps + amount);
                }}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-primary hover:text-white transition-all"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-start gap-3">
            <Zap className="size-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-300 text-sm">
                Rastreamento em Background
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                {isMobile 
                  ? 'O contador usa o sensor de movimento do seu dispositivo para rastrear passos automaticamente. Para melhor precisão, mantenha o celular no bolso ou na mão enquanto caminha.'
                  : 'Este recurso funciona melhor em dispositivos móveis. Em desktop, você pode usar os botões para adicionar passos manualmente ou simular o rastreamento.'
                }
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal 
            sensitivity={sensitivity}
            onSensitivityChange={setSensitivity}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Settings Modal Component
function SettingsModal({ 
  sensitivity, 
  onSensitivityChange, 
  onClose 
}: { 
  sensitivity: number; 
  onSensitivityChange: (v: number) => void; 
  onClose: () => void; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Configurações</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Sensibilidade do Sensor
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Baixa</span>
              <input
                type="range"
                min="1"
                max="10"
                value={sensitivity}
                onChange={(e) => onSensitivityChange(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-slate-500">Alta</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Sensibilidade atual: {sensitivity}/10
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Sobre o rastreamento</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              O contador de passos usa o acelerômetro do seu dispositivo para detectar movimentos e contar passos. 
              A precisão pode variar dependendo do dispositivo e da forma como você carrega o celular.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { useStepCounter };
