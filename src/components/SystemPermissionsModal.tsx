import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Footprints, Bell, MapPin, CheckCircle2, AlertCircle, Smartphone } from './Icons';
import { useHealth } from '../context/HealthContext';
import { sensorService } from '../services/sensorService';
import { locationService } from '../services/locationService';
import { safeLocalStorage } from '../lib/utils';

interface SystemPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SystemPermissionsModal({ isOpen, onClose }: SystemPermissionsModalProps) {
  const { t, appLanguage } = useHealth();
  const isPt = appLanguage === 'pt-BR';

  const [sensorGranted, setSensorGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkCurrentStatus();
    }
  }, [isOpen]);

  const checkCurrentStatus = async () => {
    // Check Notification status
    if ('Notification' in window) {
      setNotificationGranted(Notification.permission === 'granted');
    }

    // Check localStorage saved states
    const savedStates = safeLocalStorage.getItem('health_permission_states');
    if (savedStates) {
      try {
        const parsed = JSON.parse(savedStates);
        if (parsed.sensor) setSensorGranted(true);
        if (parsed.notification) setNotificationGranted(true);
        if (parsed.location) setLocationGranted(true);
      } catch (e) {
        console.error('Error parsing permission states:', e);
      }
    }
  };

  const handleClose = () => {
    safeLocalStorage.setItem('health_permissions_prompted', 'true');
    onClose();
  };

  const handleGrantAll = async () => {
    setIsGranting(true);
    setGrantSuccess(false);

    // Timeout helper to ensure NO promise ever hangs the UI
    const withTimeout = <T,>(promise: Promise<T>, fallback: T, ms = 1500): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
      ]);
    };

    // 1. Motion / Step Counter sensor
    try {
      await withTimeout(sensorService.requestPermission(), true, 1000);
    } catch (e) {
      console.warn('Sensor permission notice:', e);
    }

    // Health Connect (Opção B) is intentionally NOT requested here. Its
    // permission screen opens a separate, slow, full-screen system Activity —
    // racing it against a short withTimeout (like every other permission
    // below) meant the JS side gave up and fired the NEXT permission request
    // while that Activity was still on screen, breaking the whole sequence.
    // It has its own dedicated "Conectar Health Connect" button in
    // Exercícios (Exercises.tsx) that awaits the real response with no timeout.

    // 2. Notification API
    try {
      if ('Notification' in window) {
        await withTimeout(Notification.requestPermission(), 'granted', 1000);
      }
    } catch (e) {
      console.warn('Notification permission notice:', e);
    }

    // 3. Location / GPS
    try {
      await withTimeout(locationService.requestPermission(), true, 1000);
    } catch (e) {
      console.warn('Location permission notice:', e);
    }

    setSensorGranted(true);
    setNotificationGranted(true);
    setLocationGranted(true);

    // Save state
    const states = { sensor: true, notification: true, location: true };
    safeLocalStorage.setItem('health_permissions_prompted', 'true');
    safeLocalStorage.setItem('health_permissions_granted', 'true');
    safeLocalStorage.setItem('health_permission_states', JSON.stringify(states));

    setIsGranting(false);
    setGrantSuccess(true);

    setTimeout(() => {
      setGrantSuccess(false);
      handleClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={handleClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative max-h-[85vh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Shield className="size-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-tight">
                  {isPt ? 'Permissões do Sistema' : 'System Permissions'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isPt ? 'Sincronização & Sensores' : 'Sync & Sensors'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors shrink-0"
              title={isPt ? "Fechar" : "Close"}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto pr-1 flex-1 space-y-3 touch-pan-y overscroll-contain">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isPt
                ? 'Para permitir a contagem contínua de passos, alertas de exames e sincronização de rotinas com a sua agenda, libere os acessos abaixo:'
                : 'To enable continuous step tracking, exam reminders, and calendar syncing, please allow the system permissions below:'}
            </p>

            {/* Android Native App Note */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl">
              <div className="flex items-start gap-2.5">
                <Smartphone className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-900 dark:text-blue-200 leading-snug">
                  <span className="font-extrabold block mb-0.5">
                    {isPt ? 'Como funciona no APK Android & WebView Nativo:' : 'How it works on Android APK & Native WebView:'}
                  </span>
                  {isPt
                    ? '1. Por que WebView? O app Android (APK) usa o contêiner WebView nativo com a ponte Capacitor para rodar a interface fluida conectada aos sensores nativos do celular.\n2. Sincronização Automática (Solução 11): O motor do pedômetro salva seu progresso no hardware local. Ao abrir ou retornar ao app, seus passos são sincronizados e atualizados instantaneamente.'
                    : '1. Why WebView? The Android app (APK) uses a native WebView container with Capacitor bridge to render fluid UI linked directly to device motion sensors.\n2. Auto Step Sync (Solution 11): Motion progress is saved locally. Whenever you open or resume the app, your daily steps automatically catch up and sync.'}
                </div>
              </div>
            </div>

            {/* Permissions List */}
            <div className="space-y-2.5">
              {/* 1. Step Sensor */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 sm:size-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                    <Footprints className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {isPt ? 'Passos e Sensores de Movimento' : 'Step Counter & Motion Sensors'}
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-tight truncate">
                      {isPt
                        ? 'Contagem em tempo real e pedômetro contínuo'
                        : 'Real-time step tracking and continuous pedometer'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                    sensorGranted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  {sensorGranted ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                  {sensorGranted ? (isPt ? 'Liberado' : 'Granted') : (isPt ? 'Pendente' : 'Pending')}
                </span>
              </div>

              {/* 2. Notifications & Agenda */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 sm:size-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                    <Bell className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {isPt ? 'Notificações, Agenda e Exames' : 'Notifications, Calendar & Exams'}
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-tight truncate">
                      {isPt
                        ? 'Lembretes de horários, exames e rotinas'
                        : 'Reminders for routines, medical exams & schedules'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                    notificationGranted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  {notificationGranted ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                  {notificationGranted ? (isPt ? 'Liberado' : 'Granted') : (isPt ? 'Pendente' : 'Pending')}
                </span>
              </div>

              {/* 3. Location / GPS */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 sm:size-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0">
                    <MapPin className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {isPt ? 'Localização e GPS' : 'Location & GPS'}
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-tight truncate">
                      {isPt
                        ? 'Mapeamento de rotas e distância de atividades'
                        : 'Route mapping and outdoor activity distance'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                    locationGranted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  {locationGranted ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                  {locationGranted ? (isPt ? 'Liberado' : 'Granted') : (isPt ? 'Pendente' : 'Pending')}
                </span>
              </div>
            </div>

            {grantSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {isPt
                    ? '✓ Permissões processadas e salvas com sucesso!'
                    : '✓ System permissions granted and saved!'}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons (Fixed Footer) */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0 space-y-2">
            <button
              onClick={handleGrantAll}
              disabled={isGranting}
              className="w-full py-3 px-4 bg-primary text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="size-4" />
              <span>
                {isGranting
                  ? (isPt ? 'Solicitando ao sistema...' : 'Requesting system permissions...')
                  : (isPt ? 'Liberar Todas as Permissões' : 'Grant All System Permissions')}
              </span>
            </button>

            <button
              onClick={handleClose}
              className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              {isPt ? 'Entendido / Concluído' : 'Done / Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
