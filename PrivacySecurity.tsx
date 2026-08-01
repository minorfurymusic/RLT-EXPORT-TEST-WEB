import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { 
  ChevronRight, 
  ShieldCheck, 
  Fingerprint, 
  Download, 
  Lock, 
  ArrowLeft,
  CheckCircle2,
  ImageOff,
  RefreshCw,
  FileText,
  Trash2,
  AlertCircle
} from './Icons';
import Modal from './Modal';
import { cn } from '../lib/utils';
import { getErrorLogs, exportErrorReport, clearErrorLogs } from '../lib/logger';

export default function PrivacySecurity() {
  const navigate = useNavigate();
  const { profile, updateProfile, exportData, clearNutritionMediaCache, t } = useHealth();
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showClearMediaModal, setShowClearMediaModal] = useState(false);
  const [showExportFallback, setShowExportFallback] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Diagnostics Logger state
  const [logsCount, setLogsCount] = useState(0);
  const [logsClearedMsg, setLogsClearedMsg] = useState(false);

  useEffect(() => {
    const logs = getErrorLogs();
    setLogsCount(logs.length);
  }, []);

  const handleExportErrorReport = () => {
    exportErrorReport();
  };

  const handleClearErrorLogs = () => {
    clearErrorLogs();
    setLogsCount(0);
    setLogsClearedMsg(true);
    setTimeout(() => setLogsClearedMsg(false), 3000);
  };

  const handleExport = () => {
    const json = exportData();
    setExportJson(json || '');
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
    // Automatically show fallback after a short delay to ensure user sees it if they need it
    setTimeout(() => setShowExportFallback(true), 1500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearMedia = () => {
    clearNutritionMediaCache();
    setShowClearMediaModal(false);
  };

  const toggleBiometrics = () => {
    updateProfile({ biometricEnabled: !profile.biometricEnabled });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950 pb-20"
    >
      <header className="p-6 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="text-xl font-bold">{t('privacy.title')}</h1>
      </header>

      <div className="flex-1 p-6 space-y-8">
        {/* Security Status */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('privacy.secureStatus')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('privacy.localOnly')}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <Lock className="size-4 text-primary mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('privacy.encryption')}
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <RefreshCw className="size-4 text-primary mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('privacy.optimization')}
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
              <ShieldCheck className="size-4 text-emerald-500 mt-0.5" />
              <div className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                {t('privacy.lgpdStatus')}
              </div>
            </div>
          </div>
        </section>

        {/* Access Control */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">{t('privacy.accessControl')}</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <button 
              onClick={toggleBiometrics}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Fingerprint className="size-5" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm">{t('privacy.biometric')}</span>
                  <span className="text-xs text-slate-500">{t('privacy.biometricDesc')}</span>
                </div>
              </div>
              <div className={cn(
                "w-12 h-7 rounded-full p-1 transition-colors",
                profile.biometricEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
              )}>
                <motion.div 
                  animate={{ x: profile.biometricEnabled ? 20 : 0 }}
                  className="size-5 bg-white rounded-full shadow-sm"
                />
              </div>
            </button>
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">{t('privacy.dataManagement')}</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <button 
              id="btn-export-html"
              onClick={handleExport}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                  <Download className="size-5" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm">{t('privacy.export')}</span>
                  <span className="text-xs text-slate-500">{t('privacy.exportDesc')}</span>
                </div>
              </div>
              {showExportSuccess ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : (
                <ChevronRight className="size-5 text-slate-400" />
              )}
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800 mx-6" />

            <button 
              onClick={() => setShowClearMediaModal(true)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <ImageOff className="size-5" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm text-orange-600">{t('privacy.clearCache')}</span>
                  <span className="text-xs text-slate-500">{t('privacy.clearCacheDesc')}</span>
                </div>
              </div>
              <ChevronRight className="size-5 text-slate-400" />
            </button>
          </div>
        </section>

        {/* Diagnostics & Error Report */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">{t('privacy.diagnosticsTitle')}</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <span className="block font-bold text-sm">{t('privacy.loggedErrorsCount')}</span>
                  <span className="text-xs text-slate-500">{t('privacy.logsRetentionInfo')}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {logsCount} {logsCount === 1 ? 'log' : 'logs'}
              </span>
            </div>

            <button 
              id="btn-export-error-logs"
              onClick={handleExportErrorReport}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText className="size-5" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm">{t('privacy.exportErrorLogs')}</span>
                  <span className="text-xs text-slate-500">{t('privacy.exportErrorLogsDesc')}</span>
                </div>
              </div>
              <Download className="size-5 text-indigo-500" />
            </button>

            {logsCount > 0 && (
              <>
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-6" />
                <button 
                  onClick={handleClearErrorLogs}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <Trash2 className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-sm text-rose-600">{t('privacy.clearErrorLogs')}</span>
                      <span className="text-xs text-slate-500">
                        {logsClearedMsg ? t('privacy.errorLogsCleared') : `${logsCount} ${logsCount === 1 ? 'registro' : 'registros'}`}
                      </span>
                    </div>
                  </div>
                  {logsClearedMsg ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : (
                    <ChevronRight className="size-5 text-slate-400" />
                  )}
                </button>
              </>
            )}
          </div>
        </section>

        <Modal 
          isOpen={showClearMediaModal} 
          onClose={() => setShowClearMediaModal(false)}
          title={t('privacy.clearCache')}
        >
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30">
              <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
                {t('privacy.clearCacheModalDesc')}
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearMediaModal(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleClearMedia}
                className="flex-1 py-4 rounded-2xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
              >
                {t('privacy.clearPhotos')}
              </button>
            </div>
          </div>
        </Modal>

        <Modal 
          isOpen={showExportFallback} 
          onClose={() => setShowExportFallback(false)}
          title={t('privacy.exportFallback')}
        >
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
              <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                {t('privacy.exportFallbackDesc')}
              </p>
            </div>
            
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-300 text-[10px] overflow-x-auto max-h-48 font-mono border border-slate-800">
                {exportJson}
              </pre>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent rounded-b-xl pointer-events-none" />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowExportFallback(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('common.close')}
              </button>
              <button 
                onClick={handleCopyCode}
                className={cn(
                  "flex-1 py-4 rounded-2xl font-bold transition-all shadow-lg",
                  copied ? "bg-emerald-500 text-white" : "bg-primary text-white shadow-primary/20"
                )}
              >
                {copied ? t('privacy.codeCopied') : t('privacy.copyCode')}
              </button>
            </div>
          </div>
        </Modal>

        {/* Encryption Badge */}
        <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Lock className="size-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('privacy.encryptedBadge')}</span>
          </div>
          <p className="text-[10px] text-slate-400 text-center max-w-[200px]">
            {t('privacy.privateDesc')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
