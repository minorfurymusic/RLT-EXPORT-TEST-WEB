import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { Shield, AlertCircle, Sparkles, ArrowLeft, Heart, Zap, Lock, CheckCircle2 } from './Icons';
import RltLogo from './RltLogo';

export default function Login() {
  const { appLanguage, connectGoogleCalendar } = useHealth();
  const [step, setStep] = useState<'welcome' | 'auth'>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isPt = appLanguage === 'pt-BR';

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await connectGoogleCalendar();
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(
        isPt
          ? 'Falha ao autenticar com a Conta Google. Por favor, tente novamente.'
          : 'Failed to authenticate with Google Account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 select-none max-w-md mx-auto relative overflow-hidden border-x border-slate-200 dark:border-slate-800">
      {/* Decorative Gradient Background Spheres */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 'welcome' ? (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full space-y-8 relative z-10 my-auto"
          >
            {/* Logo Badge & Branding */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <RltLogo size="xl" className="shadow-2xl shadow-indigo-500/30" />
                <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  v1.0
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  {isPt 
                    ? 'Quer começar a ter uma vida mais saudável?' 
                    : 'Ready to start living a healthier life?'}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                  {isPt
                    ? 'Com o RLT 1.0 (Real Life Track), você monitora sua nutrição, treinos, hidratação e métricas de saúde em tempo real com facilidade e privacidade.'
                    : 'With RLT 1.0 (Real Life Track), track your nutrition, workouts, hydration, and health metrics in real time with privacy.'}
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="size-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {isPt ? 'Nutrição e hidratação guiadas por metas' : 'Goal-driven nutrition & hydration'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Zap className="size-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {isPt ? 'Diagnósticos biofísicos com Inteligência Artificial' : 'AI-powered biophysical diagnostics'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                  <Lock className="size-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {isPt ? 'Dados blindados e 100% sob seu controle (LGPD)' : 'Encrypted data fully under your control'}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-3">
              <button
                id="btn-start-welcome"
                onClick={() => setStep('auth')}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="size-5" />
                <span>{isPt ? 'Sim, Quero Começar Agora' : 'Yes, Start My Journey Now'}</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full space-y-8 relative z-10 my-auto"
          >
            {/* Top Back Navigation */}
            <button
              onClick={() => setStep('welcome')}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>{isPt ? 'Voltar' : 'Back'}</span>
            </button>

            {/* App Branding Header */}
            <div className="flex flex-col items-center text-center space-y-3">
              <RltLogo size="lg" className="shadow-xl shadow-indigo-500/20" />
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  RLT - Real Life Track 1.0
                </h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isPt ? 'Conecte sua conta para sincronizar seus dados' : 'Connect your account to sync your health data'}
                </p>
              </div>
            </div>

            {/* Security Notice Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0">
                  <Shield className="size-4.5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isPt ? 'Autenticação Segura com o Google' : 'Secure Google Authentication'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isPt
                      ? 'Garantimos a privacidade total dos seus registros segundo a LGPD com sincronização local do seu Calendário.'
                      : 'We guarantee total privacy of your records under LGPD with local synchronization.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-4 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <button
                id="btn-google-login"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="size-5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="size-5" viewBox="0 0 24 24" width="24" height="24">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path
                        d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48c0,-0.65 -0.06,-1.27 -0.17,-1.9z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12,20.5c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.3,0.98c-2.37,0 -4.38,-1.6 -5.1,-3.75H2.84v2.66C4.33,18.57 7.92,20.5 12,20.5z"
                        fill="#34A853"
                      />
                      <path
                        d="M6.9,13c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7c0,-0.59 0.1,-1.16 0.28,-1.7V6.94H2.84C2.23,8.16 1.88,9.54 1.88,11c0,1.46 0.35,2.84 0.96,4.06L6.9,13z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12,5.18c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,2.44 14.43,1.5 12,1.5C7.92,1.5 4.33,3.43 2.84,6.94L6.9,10c0.72,-2.15 2.73,-3.75 5.1,-3.75z"
                        fill="#EA4335"
                      />
                    </g>
                  </svg>
                )}
                <span>
                  {isPt ? 'Entrar com o Google' : 'Sign in with Google'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer copyright */}
      <div className="absolute bottom-6 text-center text-[11px] text-slate-400 dark:text-slate-600 font-mono">
        RLT - REAL LIFE TRACK v1.0
      </div>
    </div>
  );
}
