import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { ChevronRight, Camera, Trash2, ImageIcon, X, Plus, User, Info, Target, Settings, Check, Beef, Droplets, Footprints, Flame, Walk, Stethoscope, Medication, Utensils, Lightbulb, FitnessCenter, Moon, Sun, FileText, Lock, Globe, HelpCircle, Download, Smartphone, CheckCircle2, Key, LogOut, Eye, EyeOff, AlertCircle } from './Icons';
import { Palette } from 'lucide-react';
import { cn, safeLocalStorage } from '../lib/utils';
import { UserProfile, HealthGoal } from '../types';
import { AI_PROVIDER_PRESETS, type AIProviderId } from '../lib/aiProviders';
import HealthConditionsManager from './HealthConditionsManager';
import Modal from './Modal';

export default function Profile() {
  const navigate = useNavigate();
  const { profile, updateProfile, goals, updateGoal, avatar, setAvatar, darkMode, toggleDarkMode, exportData, t, isAiConfigured, appLanguage, logout, aiProviderConfig, saveAiProviderConfig, openPermissionsModal } = useHealth();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isMobileSetupOpen, setIsMobileSetupOpen] = useState(false);
  const [showExportFallback, setShowExportFallback] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(aiProviderConfig?.provider || 'gemini');
  const [keyValue, setKeyValue] = useState(aiProviderConfig?.apiKey || '');
  const [baseUrlValue, setBaseUrlValue] = useState(aiProviderConfig?.baseUrl || '');
  const [modelValue, setModelValue] = useState(aiProviderConfig?.model || '');
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState(false);
  const [isKeyExpanded, setIsKeyExpanded] = useState(false);

  useEffect(() => {
    setSelectedProvider(aiProviderConfig?.provider || 'gemini');
    setKeyValue(aiProviderConfig?.apiKey || '');
    setBaseUrlValue(aiProviderConfig?.baseUrl || '');
    setModelValue(aiProviderConfig?.model || '');
  }, [aiProviderConfig]);

  const selectedPreset = AI_PROVIDER_PRESETS[selectedProvider];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        setIsAvatarModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setIsAvatarModalOpen(false);
  };

  const handleTakePhoto = () => {
    const simulatedPhoto = "https://picsum.photos/seed/user/400/400";
    setAvatar(simulatedPhoto);
    setIsAvatarModalOpen(false);
  };

  const handleExport = () => {
    const json = exportData();
    setExportJson(json || '');
    // Automatically show fallback after a short delay to ensure user sees it if they need it
    setTimeout(() => setShowExportFallback(true), 1500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col min-h-full bg-white dark:bg-slate-950 pb-20"
    >
      <header className="p-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronRight className="size-6 rotate-180" />
        </button>
        <h1 className="text-xl font-bold">{t('profile.title')}</h1>
      </header>

      <div className="flex-1 p-6 flex flex-col items-center">
        <div className="relative group">
          <div className="size-40 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={t('profile.title')} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ImageIcon className="size-16" />
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsAvatarModalOpen(true)}
            className="absolute bottom-2 right-2 size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 transition-transform hover:scale-110 active:scale-90"
          >
            <Camera className="size-5" />
          </button>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold">{profile.name}</h2>
          <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>
          <button 
            onClick={() => setIsEditProfileModalOpen(true)}
            className="mt-4 px-6 py-2 bg-slate-100 dark:bg-slate-900 rounded-full font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {t('common.edit')}
          </button>
        </div>

        <div className="w-full mt-12 space-y-6">
          {/* Personal Information */}
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Info className="size-4" />
                {t('profile.personalInfo')}
              </h3>
              <button 
                onClick={() => setIsPersonalInfoModalOpen(true)}
                className="text-xs text-primary font-bold"
              >
                {t('common.edit')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard 
                label={t('common.weight')} 
                value={profile.units === 'metric' ? `${profile.weight} kg` : `${(profile.weight * 2.20462).toFixed(1)} lbs`} 
              />
              <InfoCard 
                label={t('common.height')} 
                value={profile.units === 'metric' ? `${profile.height} cm` : `${(profile.height / 2.54).toFixed(1)} in`} 
              />
              <InfoCard label={t('common.age')} value={`${profile.age} ${t('common.years')}`} />
              <InfoCard label={t('common.sex')} value={profile.sex ? t(`common.sex.${profile.sex.toLowerCase()}`) : t('common.na')} />
            </div>
          </section>

          {/* Health Goals */}
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Target className="size-4" />
                {t('profile.healthGoals')}
              </h3>
              <button 
                onClick={() => setIsGoalsModalOpen(true)}
                className="text-xs text-primary font-bold"
              >
                {t('common.manage')}
              </button>
            </div>
            <div className="space-y-3">
              {goals.filter(g => g.selected).map(goal => (
                <div key={goal.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm">{goal.title}</span>
                    <span className="text-xs text-slate-500">
                      {goal.type === 'numeric' && `${goal.targetValue}${goal.unit}`}
                      {goal.type === 'time' && `${t('common.targetTime')}: ${goal.timeValue}`}
                      {goal.type === 'options' && goal.selectedOption}
                      {goal.type === 'toggle' && t('common.active')}
                      {goal.type === 'input' && t('common.record')}
                    </span>
                  </div>
                  {goal.type === 'numeric' && goal.current !== undefined && goal.target !== undefined && (
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Account Settings */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
              <Settings className="size-4" />
              {t('profile.settings')}
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <button 
                onClick={openPermissionsModal}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 transition-colors group border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
                    <Smartphone className="size-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-primary text-sm block">
                      {appLanguage === 'pt-BR' ? 'Permissões e Acessos do Sistema' : 'System Permissions & Access'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {appLanguage === 'pt-BR' ? 'Contador de passos, Notificações da Agenda e GPS' : 'Step counter, Agenda Notifications & GPS'}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-black text-primary bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm">
                  {appLanguage === 'pt-BR' ? 'Liberar' : 'Grant'}
                </div>
              </button>

              <button 
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary text-sm">
                    {darkMode ? t('common.lightMode') : t('common.darkMode')}
                  </span>
                </div>
                <div className={cn(
                  "w-10 h-6 rounded-full p-1 transition-colors",
                  darkMode ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                )}>
                  <motion.div 
                    animate={{ x: darkMode ? 16 : 0 }}
                    className="size-4 bg-white rounded-full shadow-sm"
                  />
                </div>
              </button>

              <button 
                onClick={() => updateProfile({ units: profile.units === 'metric' ? 'imperial' : 'metric' })}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    <Settings className="size-4" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary text-sm">
                    {t('common.units')}: {profile.units === 'metric' ? t('common.metric') : t('common.imperial')}
                  </span>
                </div>
                <div className="text-xs font-bold text-primary">
                  {t('common.switchTo', { unit: profile.units === 'metric' ? t('common.imperial') : t('common.metric') })}
                </div>
              </button>

              <button 
                onClick={() => navigate('/profile/privacy')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    <Lock className="size-4" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary text-sm">
                    {t('profile.privacy')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/profile/language')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    <Globe className="size-4" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary text-sm">
                    {t('profile.language')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/profile/personalize')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-accent transition-colors">
                    <Palette className="size-4" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-accent text-sm">
                    {t('profile.personalize')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>

              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/35">
                <button 
                  onClick={() => setIsKeyExpanded(!isKeyExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 group-hover:text-primary transition-colors">
                      <Key className="size-4" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary text-sm">
                      {appLanguage === 'pt-BR' ? 'Assistente de IA' : 'AI Assistant'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">
                      {isAiConfigured ? (aiProviderConfig ? AI_PROVIDER_PRESETS[aiProviderConfig.provider].label : '') : (appLanguage === 'pt-BR' ? 'Não configurado' : 'Not configured')}
                    </span>
                    <ChevronRight className={cn("size-4 text-slate-400 transition-transform duration-200", isKeyExpanded && "rotate-90")} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isKeyExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 space-y-4"
                    >
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {appLanguage === 'pt-BR'
                          ? 'O RLT usa a IA que você escolher aqui pra tudo: Cérebro (chat), Smart Scan de exames e análises de nutrição/exercícios. Qualquer provedor com chave de API funciona — a chave fica só no seu dispositivo.'
                          : 'RLT uses whichever AI you pick here for everything: the Cérebro chat, exam Smart Scan, and nutrition/exercise analysis. Any provider with an API key works — the key stays only on your device.'
                        }
                      </p>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                          {appLanguage === 'pt-BR' ? 'Provedor' : 'Provider'}
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {Object.values(AI_PROVIDER_PRESETS).map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setSelectedProvider(preset.id);
                                setKeyError('');
                                setKeySuccess(false);
                              }}
                              className={cn(
                                "py-2 px-2.5 rounded-lg text-[11px] font-bold text-left transition-all border",
                                selectedProvider === preset.id
                                  ? "bg-primary border-primary text-white"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                          {appLanguage === 'pt-BR' ? 'Chave de API' : 'API Key'}
                        </label>
                        <div className="relative">
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={keyValue}
                            onChange={(e) => {
                              setKeyValue(e.target.value);
                              setKeyError('');
                              setKeySuccess(false);
                            }}
                            placeholder={selectedPreset.keyHint}
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-mono text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>

                        {selectedPreset.editableEndpoint && (
                          <input
                            type="text"
                            value={baseUrlValue}
                            onChange={(e) => { setBaseUrlValue(e.target.value); setKeyError(''); setKeySuccess(false); }}
                            placeholder={appLanguage === 'pt-BR' ? 'URL base (compatível com OpenAI), ex: https://api.exemplo.com/v1' : 'Base URL (OpenAI-compatible), e.g. https://api.example.com/v1'}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-mono text-slate-800 dark:text-slate-200"
                          />
                        )}

                        <input
                          type="text"
                          value={modelValue}
                          onChange={(e) => { setModelValue(e.target.value); setKeyError(''); setKeySuccess(false); }}
                          placeholder={
                            selectedPreset.defaultModel
                              ? (appLanguage === 'pt-BR' ? `Modelo (opcional) — padrão: ${selectedPreset.defaultModel}` : `Model (optional) — default: ${selectedPreset.defaultModel}`)
                              : (appLanguage === 'pt-BR' ? 'Modelo' : 'Model')
                          }
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-mono text-slate-800 dark:text-slate-200"
                        />

                        {keyError && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-red-500 mt-1">
                            <AlertCircle className="size-3 flex-shrink-0" />
                            <span>{keyError}</span>
                          </div>
                        )}
                        {keySuccess && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 mt-1">
                            <Check className="size-3 flex-shrink-0" />
                            <span>{appLanguage === 'pt-BR' ? 'Salvo com sucesso!' : 'Saved successfully!'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setKeyError('');
                            setKeySuccess(false);
                            const trimmed = keyValue.trim();
                            if (!trimmed) {
                              setKeyError(appLanguage === 'pt-BR' ? 'Por favor, insira uma chave.' : 'Please enter a key.');
                              return;
                            }
                            if (trimmed.length < 8) {
                              setKeyError(appLanguage === 'pt-BR' ? 'Chave muito curta.' : 'Key is too short.');
                              return;
                            }
                            if (selectedPreset.editableEndpoint && !baseUrlValue.trim()) {
                              setKeyError(appLanguage === 'pt-BR' ? 'Informe a URL base do provedor personalizado.' : 'Enter the custom provider\'s base URL.');
                              return;
                            }
                            saveAiProviderConfig({
                              provider: selectedProvider,
                              apiKey: trimmed,
                              baseUrl: baseUrlValue.trim() || undefined,
                              model: modelValue.trim() || undefined
                            });
                            setKeySuccess(true);
                          }}
                          className="flex-1 py-2 px-3 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/10 active:scale-95 transition-all flex items-center justify-center gap-1"
                        >
                          <Check className="size-3.5" />
                          {appLanguage === 'pt-BR' ? 'Salvar' : 'Save'}
                        </button>

                        {isAiConfigured && (
                          <button
                            type="button"
                            onClick={() => {
                              saveAiProviderConfig(null);
                              setKeyValue('');
                              setBaseUrlValue('');
                              setModelValue('');
                              setKeyError('');
                              setKeySuccess(false);
                            }}
                            className="py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 border border-red-100 dark:border-red-900/20"
                          >
                            <Trash2 className="size-3.5" />
                            {appLanguage === 'pt-BR' ? 'Limpar' : 'Clear'}
                          </button>
                        )}
                      </div>

                      {selectedPreset.keyDocsUrl && (
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 leading-relaxed">
                          {appLanguage === 'pt-BR'
                            ? `Não tem uma chave da ${selectedPreset.label}? Crie uma clicando no link:`
                            : `No ${selectedPreset.label} key yet? Create one by clicking the link:`
                          }
                          <a
                            href={selectedPreset.keyDocsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-1 font-bold text-primary hover:underline"
                          >
                            {appLanguage === 'pt-BR' ? `Obter Chave da ${selectedPreset.label} ↗` : `Get ${selectedPreset.label} Key ↗`}
                          </a>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => navigate('/profile/help')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    <HelpCircle className="size-4" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary text-sm">
                    {t('profile.help')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>

              <button 
                onClick={exportData}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    <FileText className="size-4" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary text-sm">
                    {t('common.exportData')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>
            </div>
          </section>

          {/* App Management */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
              <Settings className="size-4" />
              {t('common.appManagement')}
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Info className="size-4" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                    {t('common.version')}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500">1.0.0 (V53)</span>
              </div>

              <button 
                onClick={handleExport}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-500 group-hover:text-blue-600 transition-colors">
                    <Download className="size-4" />
                  </div>
                  <span className="font-medium text-blue-600 text-sm">
                    {t('common.downloadSource')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-blue-400" />
              </button>

              <button 
                onClick={() => setIsMobileSetupOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-500 group-hover:text-emerald-600 transition-colors">
                    <Smartphone className="size-4" />
                  </div>
                  <span className="font-medium text-emerald-600 text-sm">
                    {t('common.mobileSetup')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-emerald-400" />
              </button>

              <button 
                onClick={() => {
                  if (confirm(t('common.clearCacheDesc'))) {
                    safeLocalStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 group-hover:text-red-600 transition-colors">
                    <Trash2 className="size-4" />
                  </div>
                  <span className="font-medium text-red-500 group-hover:text-red-600 text-sm">
                    {t('common.clearCache')}
                  </span>
                </div>
                <ChevronRight className="size-4 text-red-400" />
              </button>

              <button 
                onClick={logout}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 group-hover:text-rose-600 transition-colors">
                    <LogOut className="size-4" />
                  </div>
                  <span className="font-medium text-rose-600 dark:text-rose-400 group-hover:text-rose-750 text-sm">
                    {appLanguage === 'pt-BR' ? 'Sair da Conta Google' : 'Sign out Google Account'}
                  </span>
                </div>
                <ChevronRight className="size-4 text-rose-400" />
              </button>
            </div>
          </section>
          
          <button 
            onClick={() => {
              safeLocalStorage.setItem('hasCompletedOnboarding', 'false');
              updateProfile({ onboardingCompleted: false });
              navigate('/onboarding');
            }}
            className="w-full py-4 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors"
          >
            {t('common.logOut')}
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <Modal title={t('profile.editPhoto')} onClose={() => setIsAvatarModalOpen(false)}>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center gap-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><ImageIcon className="size-5" /></div>
                <span className="font-bold text-sm">{t('profile.uploadFromDevice')}</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
              <button onClick={handleTakePhoto} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center gap-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="size-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Camera className="size-5" /></div>
                <span className="font-bold text-sm">{t('profile.takePhoto')}</span>
              </button>
              {avatar && (
                <button onClick={handleRemoveAvatar} className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center gap-4 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <div className="size-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><Trash2 className="size-5" /></div>
                  <span className="font-bold text-sm text-red-600">{t('profile.removePhoto')}</span>
                </button>
              )}
            </div>
          </Modal>
        )}

        {isEditProfileModalOpen && (
          <Modal title={t('profile.editProfile')} onClose={() => setIsEditProfileModalOpen(false)}>
            <div className="space-y-4">
              <Input label={t('common.name')} value={profile.name} onChange={(val) => updateProfile({ name: val })} />
              <Input label={t('common.email')} value={profile.email} onChange={(val) => updateProfile({ email: val })} />
              <button 
                onClick={() => setIsEditProfileModalOpen(false)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold mt-4 shadow-lg shadow-primary/20"
              >
                {t('common.saveChanges')}
              </button>
            </div>
          </Modal>
        )}

        {isPersonalInfoModalOpen && (
          <Modal title={t('profile.personalInfo')} onClose={() => setIsPersonalInfoModalOpen(false)}>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1 -mx-1">
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('common.age')} type="number" value={profile.age} onChange={(val) => updateProfile({ age: val })} />
                <Input 
                  label={profile.units === 'metric' ? `${t('common.weight')} (kg)` : `${t('common.weight')} (kg - stored)`} 
                  type="number" 
                  value={profile.weight} 
                  onChange={(val) => updateProfile({ weight: val })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label={profile.units === 'metric' ? `${t('common.height')} (cm)` : `${t('common.height')} (cm - stored)`} 
                  type="number" 
                  value={profile.height} 
                  onChange={(val) => updateProfile({ height: val })} 
                />
                <Select 
                  label={t('common.sex')} 
                  value={profile.sex} 
                  options={['common.sex.male', 'common.sex.female', 'common.sex.other']} 
                  onChange={(val: string) => updateProfile({ sex: val as any })} 
                  t={t} 
                />
              </div>
              <Input label={t('common.ethnicity')} value={profile.ethnicity} onChange={(val) => updateProfile({ ethnicity: val })} />
              <Input label={t('common.address')} value={profile.address} onChange={(val) => updateProfile({ address: val })} />
              
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('profile.bodyFat')} type="number" value={profile.bodyFatPercentage} onChange={(val: number) => updateProfile({ bodyFatPercentage: val })} />
                <Input label={t('profile.waist')} type="number" value={profile.waistCircumference} onChange={(val: number) => updateProfile({ waistCircumference: val })} />
              </div>

              <Select 
                label={t('profile.workActivity')} 
                value={profile.workActivityType} 
                options={['profile.activity.sedentary', 'profile.activity.active', 'profile.activity.veryActive']} 
                onChange={(val: string) => updateProfile({ workActivityType: val as any })} 
                t={t}
              />

              <Input label={t('profile.preferredTrainingTime')} value={profile.preferredTrainingTime} onChange={(val: string) => updateProfile({ preferredTrainingTime: val })} placeholder="e.g. 07:00 AM" />
              <Input label={t('profile.foodRestrictions')} value={profile.foodRestrictions} onChange={(val: string) => updateProfile({ foodRestrictions: val })} />
              <Select 
                label={t('profile.foodPreference')} 
                value={profile.foodPreference} 
                options={['profile.food.vegetarian', 'profile.food.balanced', 'profile.food.lowCarb']} 
                onChange={(val: string) => updateProfile({ foodPreference: val })} 
                t={t}
              />
              <Input label={t('profile.stimulantConsumption')} value={profile.stimulantConsumption} onChange={(val: string) => updateProfile({ stimulantConsumption: val })} placeholder="e.g. Caffeine, Energy drinks" />
              <Input label={t('profile.sleepQuality')} value={profile.sleepQuality} onChange={(val: string) => updateProfile({ sleepQuality: val })} placeholder="e.g. Good, 7-8 hours" />

              <button 
                onClick={() => setIsPersonalInfoModalOpen(false)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold mt-4 shadow-lg shadow-primary/20 sticky bottom-0"
              >
                {t('common.saveInformation')}
              </button>
            </div>
          </Modal>
        )}

        {isGoalsModalOpen && (
          <Modal title={t('profile.manageGoals')} onClose={() => setIsGoalsModalOpen(false)}>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1 -mx-1">
              <GoalCategorySection 
                title={t('goals.performance')} 
                icon={<FitnessCenter className="size-4" />}
                goals={goals.filter(g => g.category === 'Performance')}
                onUpdate={updateGoal}
                t={t}
              />
              <GoalCategorySection 
                title={t('goals.nutrition')} 
                icon={<Utensils className="size-4" />}
                goals={goals.filter(g => g.category === 'Nutrition')}
                onUpdate={updateGoal}
                t={t}
              />
              <GoalCategorySection 
                title={t('goals.wellbeing')} 
                icon={<Lightbulb className="size-4" />}
                goals={goals.filter(g => g.category === 'Well-being')}
                onUpdate={updateGoal}
                t={t}
              />
              <button 
                onClick={() => setIsGoalsModalOpen(false)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold mt-4 shadow-lg shadow-primary/20 sticky bottom-0"
              >
                {t('common.done')}
              </button>
            </div>
          </Modal>
        )}

        {isMobileSetupOpen && (
          <Modal title={t('common.mobileSetupTitle')} onClose={() => setIsMobileSetupOpen(false)}>
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {t('common.mobileSetupDesc')}
                </p>
              </div>
              
              <div className="space-y-4">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex gap-4">
                    <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {step}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t(`common.mobileStep${step}`)}
                    </p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsMobileSetupOpen(false)}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold mt-4 shadow-lg shadow-emerald-600/20"
              >
                {t('common.done')}
              </button>
            </div>
          </Modal>
        )}

        {showExportFallback && (
          <Modal 
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InfoCard({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder }: any) {
  const displayValue = (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) ? '' : value;
  
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase ml-1">{label}</label>
      <input 
        type={type} 
        value={displayValue}
        onChange={(e) => {
          const val = e.target.value;
          if (type === 'number') {
            const num = parseFloat(val);
            onChange(isNaN(num) ? 0 : num);
          } else {
            onChange(val);
          }
        }}
        placeholder={placeholder}
        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-5 font-bold text-sm"
      />
    </div>
  );
}

function Select({ label, value, options, onChange, t }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase ml-1">{label}</label>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-5 font-bold text-sm appearance-none"
      >
        <option value="">{t('common.selectOption')}</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{t(opt)}</option>
        ))}
      </select>
    </div>
  );
}

function GoalCategorySection({ title, icon, goals, onUpdate, t }: { title: string, icon: React.ReactNode, goals: HealthGoal[], onUpdate: (id: string, update: Partial<HealthGoal>) => void, t: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest ml-1">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-3">
        {goals.map(goal => (
          <div 
            key={goal.id} 
            className={cn(
              "p-4 rounded-2xl border transition-all",
              goal.selected 
                ? "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30" 
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm">{goal.title}</h4>
                <p className="text-[10px] text-slate-500 truncate">{goal.description}</p>
              </div>
              <button 
                onClick={() => onUpdate(goal.id, { selected: !goal.selected })}
                className={cn(
                  "size-6 rounded-full border-2 flex items-center justify-center transition-all",
                  goal.selected ? "bg-primary border-primary" : "border-slate-200 dark:border-slate-700"
                )}
              >
                {goal.selected && <Check className="size-4 text-white" />}
              </button>
            </div>
            {goal.selected && (
              <div className="space-y-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {goal.type === 'numeric' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('common.target')} ({goal.unit})</label>
                    <input 
                      type="number" 
                      value={goal.targetValue || 0} 
                      onChange={(e) => onUpdate(goal.id, { targetValue: Number(e.target.value) })}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 px-4 text-sm font-bold"
                    />
                  </div>
                )}
                {goal.type === 'input' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('common.description')}</label>
                    <textarea 
                      value={goal.inputValue || ''} 
                      onChange={(e) => onUpdate(goal.id, { inputValue: e.target.value })}
                      placeholder={t('common.description')}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 px-4 text-sm font-medium min-h-[80px]"
                    />
                  </div>
                )}
                {goal.type === 'options' && goal.options && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('common.selectOption')}</label>
                    <div className="flex flex-col gap-2">
                      {goal.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => onUpdate(goal.id, { selectedOption: opt })}
                          className={cn(
                            "text-left px-4 py-2 rounded-xl text-xs font-bold transition-colors",
                            goal.selectedOption === opt 
                              ? "bg-primary text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {goal.type === 'time' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('common.targetTime')}</label>
                    <input 
                      type="time" 
                      value={goal.timeValue || '22:00'} 
                      onChange={(e) => onUpdate(goal.id, { timeValue: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 px-4 text-sm font-bold"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

