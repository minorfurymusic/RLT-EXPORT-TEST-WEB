import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, Camera, Edit3, Sparkles, ChevronRight, Plus, X, Trash2, Loader2, Check, Utensils, AlertCircle, AlertTriangle, CheckCircle2, ImageOff, FileText } from './Icons';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { useRegisterComponentRuntime } from '../lib/version';
import { Meal } from '../types';
import { safeJsonParse, getGoogleGenAI } from '../lib/ai';
import { compressImageIfNeeded } from '../lib/imageCompressor';

export default function Nutrition() {
  useRegisterComponentRuntime('Nutrition');
  const navigate = useNavigate();
  const location = useLocation();
  const autoScanTriggered = useRef(false);

  const { t, meals, addMeal, updateMeal, deleteMeal, getTodayValue, getDailyCalorieTarget, isDayEnded, endDay, reopenDay, selectedDate: contextDate, setSelectedDate: setContextDate, appLanguage, isGeminiKeyConfigured } = useHealth();

  const [view, setView] = useState<'main' | 'history' | 'daily'>('main');
  const [localSelectedDate, setLocalSelectedDate] = useState<string>(contextDate);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [mealInput, setMealInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<Partial<Meal>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (location.state?.autoScan && !autoScanTriggered.current) {
      const files = location.state.autoScan;
      const fileArray = Array.isArray(files) ? files : [files];
      
      setIsAddingMeal(true);
      setSelectedImages(fileArray.map(f => f.data));
      autoScanTriggered.current = true;
      // Clear state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const calories = getTodayValue('calories');
  const proteinValue = getTodayValue('protein');
  const targetCalories = Math.round(getDailyCalorieTarget());
  const targetProtein = 150;
  const progress = (calories / targetCalories) * 100;

  const handleOpenEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setEditFormData({
      description: meal.description,
      type: meal.type,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      portionSize: meal.portionSize
    });
  };

  const handleUpdateMeal = () => {
    if (editingMeal) {
      updateMeal(editingMeal.id, editFormData);
      setEditingMeal(null);
    }
  };

  const handleAnalyzeMeal = async () => {
    if (!mealInput && selectedImages.length === 0) return;
    
    if (!isGeminiKeyConfigured) {
      setAnalysisError(
        appLanguage === 'pt-BR'
          ? 'Análise de IA inativa. Configure sua chave Gemini na aba de Configurações para habilitar a análise de fotos e descrição.'
          : 'AI analysis inactive. Configure your Gemini key in the Settings tab to enable photo and description analysis.'
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalysisProgress(0);
    
    try {
      // Step 1: Uploading
      setAnalysisStep(t('nutrition.uploading', { count: selectedImages.length || 1 }));
      setAnalysisProgress(10);
      await new Promise(r => setTimeout(r, 600));
      
      setAnalysisProgress(25);
      const ai = getGoogleGenAI();
      
      // Step 2: Reading
      setAnalysisStep(t('nutrition.readingData'));
      setAnalysisProgress(40);
      
      let prompt = `Analyze this meal (could be multiple images or a description with total weight or items like chicken, rice, beans, salad) and return a JSON object with the following fields: calories (number), protein (number), carbs (number), fat (number), description (string), portionSize (string), confidence (number, 0-1).
      
      LÓGICA DE ESTIMATIVA E DIVISÃO DE MACRONUTRIENTES:
      - Se o usuário informar um peso total da refeição (ex: "prato de 200g com frango, arroz, feijão e salada"):
        1. Identifique cada componente da refeição.
        2. Estime a proporção típica no prato equilibrado (ex: ~25% proteína como frango [50g], ~25% feijão [50g], ~35% arroz [70g], ~15% salada [30g]).
        3. Calcule as calorias e macronutrientes somando os valores de cada alimento proporcional ao seu peso estimado.
      
      INSTRUÇÕES DE IDIOMA (OMNI-V50):
      - Responda exclusivamente no idioma: ${appLanguage}.
      - Mantenha a resposta estritamente no formato JSON válido.`;

      if (mealInput) prompt += `\nDescrição da Refeição pelo usuário: ${mealInput}`;
      
      let response;
      if (selectedImages.length > 0) {
        const parts = [
          { text: prompt },
          ...selectedImages.map(img => {
            const match = img.match(/^data:([^;]+);base64,/);
            const mimeType = match ? match[1] : "image/jpeg";
            const base64Data = img.includes(',') ? img.split(',')[1] : img;
            return {
              inlineData: {
                mimeType,
                data: base64Data
              }
            };
          })
        ];

        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: { parts },
          config: { responseMimeType: "application/json" }
        });
      } else {
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
      }

      // Step 3: Estimating
      setAnalysisStep(t('nutrition.estimatingMacros'));
      setAnalysisProgress(70);
      await new Promise(r => setTimeout(r, 400));

      const raw: any = safeJsonParse(response.text || '{}', {});
      const item: any = Array.isArray(raw) ? raw[0] : (raw?.meal || raw?.food || raw?.data || raw);

      const normalized = {
        description: String(item?.description || mealInput || t('nutrition.logNewMeal')),
        calories: Math.round(Number(item?.calories || item?.kcal || item?.calorias || 0)) || 0,
        portionSize: String(item?.portionSize || item?.portion || item?.serving || item?.porcao || '1 porção'),
        protein: Math.round(Number(item?.protein || item?.proteins || item?.proteina || 0)) || 0,
        carbs: Math.round(Number(item?.carbs || item?.carbohydrates || item?.carboidratos || 0)) || 0,
        fat: Math.round(Number(item?.fat || item?.fats || item?.gordura || item?.gorduras || 0)) || 0,
        confidence: typeof item?.confidence === 'number' ? item.confidence : 0.9,
      };

      // Step 4: Finalizing
      setAnalysisStep(t('nutrition.finalizing'));
      setAnalysisProgress(90);
      await new Promise(r => setTimeout(r, 300));

      setAnalysisResult(normalized);
      setAnalysisProgress(100);
      
    } catch (error: any) {
      console.error("AI Analysis failed. Diagnostics info:", {
        model: "gemini-3.6-flash",
        payloadFormat: selectedImages.length > 0 ? "inlineData (base64 payload with mimeType)" : "text-only prompt",
        imagesCount: selectedImages.length,
        error
      });

      const errorMessage = error?.message || String(error);
      const status = error?.status || error?.statusCode || (error?.error && error?.error?.code);
      
      const isAuthError = 
        status === 401 || 
        status === 403 || 
        status === 'UNAUTHENTICATED' ||
        status === 'PERMISSION_DENIED' ||
        errorMessage.includes('401') || 
        errorMessage.includes('403') || 
        errorMessage.toLowerCase().includes('api_key_invalid') || 
        errorMessage.toLowerCase().includes('invalid api key') || 
        errorMessage.toLowerCase().includes('key not valid') ||
        errorMessage.toLowerCase().includes('credential') ||
        errorMessage.toLowerCase().includes('unauthenticated') ||
        errorMessage.toLowerCase().includes('permission_denied') ||
        errorMessage.toLowerCase().includes('not authorized');

      const isNoKeyError = errorMessage.includes('NO_API_KEY') || errorMessage.toLowerCase().includes('nenhuma chave');

      if (isNoKeyError) {
        setAnalysisError(
          appLanguage === 'pt-BR'
            ? 'Nenhuma chave de API do Gemini configurada neste navegador. Por favor, vá em Perfil > Configuração da API Gemini e salve sua chave.'
            : 'No Gemini API Key configured in this browser. Please go to Profile > Gemini API Configuration and save your key.'
        );
      } else if (isAuthError) {
        setAnalysisError(
          appLanguage === 'pt-BR'
            ? 'Chave de API inválida ou expirada. Por favor, verifique a chave do Gemini em Perfil > Configurações.'
            : 'Invalid or expired API Key. Please verify your Gemini key in Profile > Settings.'
        );
      } else {
        setAnalysisError(
          appLanguage === 'pt-BR'
            ? `Falha ao processar análise da refeição (${errorMessage}). Por favor, tente novamente.`
            : `Failed to analyze meal (${errorMessage}). Please try again.`
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmMeal = () => {
    if (!analysisResult) return;
    
    const newMeal: Omit<Meal, 'id'> = {
      description: analysisResult.description || mealInput || t('nutrition.logNewMeal'),
      type: 'Lunch', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: contextDate === new Date().toISOString().split('T')[0] ? new Date().toISOString() : `${contextDate}T12:00:00Z`,
      calories: Number(analysisResult.calories) || 0,
      protein: Number(analysisResult.protein) || 0,
      carbs: Number(analysisResult.carbs) || 0,
      fat: Number(analysisResult.fat) || 0,
      portionSize: analysisResult.portionSize || '1 serving',
      imageUrl: selectedImages[0] || undefined
    };

    addMeal(newMeal);
    setIsAddingMeal(false);
    setMealInput('');
    setSelectedImages([]);
    setAnalysisResult(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      const newImages: string[] = [];

      for (const file of fileArray) {
        const rawData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // Compress image to prevent memory crash
        const data = await compressImageIfNeeded(rawData);
        newImages.push(data);
      }
      
      setSelectedImages(prev => [...prev, ...newImages]);
      // Reset input value so same image can be re-selected if needed
      e.target.value = '';
    }
  };

  const targetDateStr = new Date(contextDate + 'T12:00:00').toDateString();
  const todayMeals = meals.filter(m => new Date(m.date).toDateString() === targetDateStr);

  if (view === 'history') {
    return <NutritionHistory onBack={() => setView('main')} onSelectDay={(date) => { setLocalSelectedDate(date); setContextDate(date); setView('daily'); }} meals={meals} />;
  }

  if (view === 'daily') {
    return (
      <DailyNutritionDetail 
        date={localSelectedDate} 
        onBack={() => setView('main')} 
        meals={meals} 
        onDelete={deleteMeal} 
        onUpdate={updateMeal} 
        onEdit={handleOpenEdit}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col pb-24"
    >
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 border-b border-primary/10">
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold tracking-tight">{t('nutrition.title')}</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{t('nutrition.overview')}</h2>
            <div className="flex items-center gap-2">
              {isDayEnded ? (
                <button 
                  onClick={reopenDay}
                  className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="size-3" /> {t('nutrition.dayEndedReopen')}
                </button>
              ) : (
                <button 
                  onClick={endDay}
                  className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-colors"
                >
                  {t('nutrition.endDay')}
                </button>
              )}
              <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                {contextDate === new Date().toISOString().split('T')[0] ? t('nutrition.today') : contextDate}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-primary/5 shadow-sm flex items-center gap-6">
              <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
                <svg className="h-full w-full transform -rotate-90">
                  <circle className="text-primary/10" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="8"></circle>
                  <circle 
                    className="text-primary" 
                    cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="8"
                    strokeDasharray="213.6"
                    strokeDashoffset={213.6 - (213.6 * progress) / 100}
                    strokeLinecap="round"
                  ></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-sm font-bold leading-none">{Math.round(calories)}</span>
                  <span className="text-[10px] opacity-60">kcal</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-semibold">{t('nutrition.calories')}</span>
                  <span className="text-xs text-slate-500">{t('nutrition.target')} {targetCalories}</span>
                </div>
                <div className="text-xs text-slate-400">{Math.max(0, targetCalories - Math.round(calories))} {t('nutrition.remaining')}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MacroCard label={t('nutrition.protein')} current={`${Math.round(proteinValue)}g`} target={`${targetProtein}g`} progress={(proteinValue / targetProtein) * 100} />
              <MacroCard label={t('nutrition.carbs')} current={`${Math.round(todayMeals.reduce((s, m) => s + m.carbs, 0))}g`} target="250g" progress={(todayMeals.reduce((s, m) => s + m.carbs, 0) / 250) * 100} />
              <MacroCard label={t('nutrition.fat')} current={`${Math.round(todayMeals.reduce((s, m) => s + m.fat, 0))}g`} target="70g" progress={(todayMeals.reduce((s, m) => s + m.fat, 0) / 70) * 100} />
              <MacroCard label={t('nutrition.fiber')} current="25g" target="35g" progress={71} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-4">{t('nutrition.addMeal')}</h2>
          {isDayEnded ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-500">{t('nutrition.dayEndedDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setIsAddingMeal(true);
                }}
                className="flex flex-col items-center justify-center p-6 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              >
                <Camera className="size-8 mb-2" />
                <span className="text-sm font-semibold">{t('nutrition.takePhoto')}</span>
              </button>
              <button 
                onClick={() => setIsAddingMeal(true)}
                className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 border border-primary/20 rounded-xl hover:scale-[1.02] transition-transform"
              >
                <Edit3 className="size-8 mb-2 text-primary" />
                <span className="text-sm font-semibold">{t('nutrition.typeDescription')}</span>
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{t('nutrition.todaysMeals')}</h2>
          </div>
          <div className="space-y-3">
            {todayMeals.length > 0 ? (
              todayMeals.map(meal => (
                <MealItem 
                  key={meal.id}
                  meal={meal}
                  onDelete={() => deleteMeal(meal.id)}
                  onEdit={() => handleOpenEdit(meal)}
                />
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500">{t('nutrition.noMealsToday')}</p>
              </div>
            )}
          </div>
        </section>
        {/* Macro History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{t('nutrition.macroHistory')}</h2>
            <button 
              onClick={() => setView('history')}
              className="text-xs font-bold text-primary flex items-center gap-1"
            >
              {t('common.viewAll')} <ChevronRight className="size-3" />
            </button>
          </div>
          
          <div className="space-y-3">
            {[1, 2, 3].map(daysAgo => {
              const date = new Date();
              date.setDate(date.getDate() - daysAgo);
              const dayMeals = meals.filter(m => new Date(m.date).toDateString() === date.toDateString());
              const dayCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
              const dayProtein = dayMeals.reduce((sum, m) => sum + m.protein, 0);
              const dayCarbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0);
              const dayFat = dayMeals.reduce((sum, m) => sum + m.fat, 0);

              return (
                <div 
                  key={daysAgo}
                  onClick={() => {
                    setLocalSelectedDate(date.toISOString().split('T')[0]);
                    setContextDate(date.toISOString().split('T')[0]);
                    setView('daily');
                  }}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-primary/5 shadow-sm flex items-center justify-between hover:bg-primary/5 transition-colors cursor-pointer group"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="flex gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{Math.round(dayCalories)}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">kcal</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{Math.round(dayProtein)}g</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Prot</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{Math.round(dayCarbs)}g</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Carb</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{Math.round(dayFat)}g</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Fat</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {isAddingMeal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold">
                  {isAnalyzing ? t('nutrition.analyzingMeal') : analysisResult ? t('nutrition.reviewAnalysis') : analysisError ? t('nutrition.analysisFailed') : t('nutrition.logNewMeal')}
                </h3>
                <button onClick={() => {
                  setIsAddingMeal(false);
                  setAnalysisResult(null);
                  setAnalysisError(null);
                }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="size-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {isAnalyzing ? (
                    <div className="py-8 space-y-6 text-center">
                      <div className="relative size-24 mx-auto">
                        <svg className="size-24 transform -rotate-90">
                          <circle className="text-slate-100 dark:text-slate-800" cx="48" cy="48" fill="transparent" r="44" stroke="currentColor" strokeWidth="8"></circle>
                          <circle 
                            className="text-primary transition-all duration-300" 
                            cx="48" cy="48" fill="transparent" r="44" stroke="currentColor" strokeWidth="8"
                            strokeDasharray="276.32"
                            strokeDashoffset={276.32 - (276.32 * analysisProgress) / 100}
                            strokeLinecap="round"
                          ></circle>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="size-8 text-primary animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{analysisStep}</p>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden max-w-[200px] mx-auto">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${analysisProgress}%` }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-6">
                      <div className={`p-4 rounded-2xl flex items-center gap-3 ${
                        analysisResult.confidence > 0.8 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {analysisResult.confidence > 0.8 ? (
                          <CheckCircle2 className="size-5 shrink-0" />
                        ) : (
                          <AlertTriangle className="size-5 shrink-0" />
                        )}
                        <p className="text-sm font-medium">
                          {analysisResult.confidence > 0.8 
                            ? t('nutrition.scanSuccess') 
                            : t('nutrition.scanReview')}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('nutrition.description')}</label>
                          <input 
                            type="text"
                            value={analysisResult.description}
                            onChange={(e) => setAnalysisResult({...analysisResult, description: e.target.value})}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('nutrition.calories')}</label>
                            <input 
                              type="number"
                              value={analysisResult.calories}
                              onChange={(e) => setAnalysisResult({...analysisResult, calories: Number(e.target.value)})}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('nutrition.portion')}</label>
                            <input 
                              type="text"
                              value={analysisResult.portionSize}
                              onChange={(e) => setAnalysisResult({...analysisResult, portionSize: e.target.value})}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">{t('nutrition.proteinG')}</label>
                            <input 
                              type="number"
                              value={analysisResult.protein}
                              onChange={(e) => setAnalysisResult({...analysisResult, protein: Number(e.target.value)})}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">{t('nutrition.carbsG')}</label>
                            <input 
                              type="number"
                              value={analysisResult.carbs}
                              onChange={(e) => setAnalysisResult({...analysisResult, carbs: Number(e.target.value)})}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">{t('nutrition.fatG')}</label>
                            <input 
                              type="number"
                              value={analysisResult.fat}
                              onChange={(e) => setAnalysisResult({...analysisResult, fat: Number(e.target.value)})}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : analysisError ? (
                    <div className="py-8 text-center space-y-6">
                      <div className="size-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="size-10" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-bold">{t('nutrition.analysisFailed')}</h4>
                        <p className="text-sm text-slate-500">{analysisError}</p>
                      </div>
                      <button 
                        onClick={handleAnalyzeMeal}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                      >
                        <Sparkles className="size-5" />
                        {t('nutrition.tryAgain')}
                      </button>
                    </div>
                  ) : (
                    <>
                      {!isGeminiKeyConfigured && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-col gap-2 shrink-0 mb-2">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                            {appLanguage === 'pt-BR' 
                              ? 'O RLT depende de uma chave do Google AI Studio para processar imagens e textos de forma autônoma.' 
                              : 'RLT depends on a Google AI Studio API key to process images and texts autonomously.'}
                          </p>
                          <button
                            onClick={() => navigate('/profile')}
                            className="w-full py-2 bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition-all"
                          >
                            {appLanguage === 'pt-BR' ? 'Ir para Configurações' : 'Go to Settings'}
                          </button>
                        </div>
                      )}

                      <div className="space-y-3">
                        <textarea 
                          value={mealInput}
                          onChange={(e) => setMealInput(e.target.value)}
                          placeholder={t('nutrition.whatDidYouEat')}
                          className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl resize-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <Camera className="size-4 text-primary" />
                            <span className="text-[10px]">{appLanguage === 'pt-BR' ? 'Câmera' : 'Camera'}</span>
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <FileText className="size-4 text-blue-500" />
                            <span className="text-[10px]">{appLanguage === 'pt-BR' ? 'Galeria' : 'Gallery'}</span>
                          </button>

                          <button 
                            type="button"
                            onClick={async () => {
                              const barcode = prompt(appLanguage === 'pt-BR' ? 'Aproxime a câmera ou digite o número do Código de Barras do produto:' : 'Enter product Barcode number:');
                              if (barcode) {
                                setMealInput(`Código de Barras EAN/UPC: ${barcode}`);
                              }
                            }}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <span className="text-sm">🏷️</span>
                            <span className="text-[10px]">{appLanguage === 'pt-BR' ? 'Cód. Barras' : 'Barcode'}</span>
                          </button>
                        </div>
                      </div>

                      {selectedImages.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {t('nutrition.filesSelected', { count: selectedImages.length })}
                            </span>
                            <button 
                              onClick={() => setSelectedImages([])}
                              className="text-[10px] font-bold text-red-500 uppercase tracking-widest"
                            >
                              {t('common.clearAll')}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedImages.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                <img src={img} className="w-full h-full object-cover" alt={`Meal preview ${idx}`} />
                                <button 
                                  onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full backdrop-blur-md"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hidden Camera Input */}
                      <input 
                        type="file" 
                        ref={cameraInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                      />

                      {/* Hidden File/Gallery Input */}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*,application/pdf,.pdf,text/plain,.txt" 
                        className="hidden" 
                        multiple
                      />

                      <button 
                        onClick={handleAnalyzeMeal}
                        disabled={isAnalyzing || (mealInput.length < 3 && selectedImages.length === 0)}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="size-5" />
                        {t('nutrition.analyzeLog')}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {analysisResult && !isAnalyzing && (
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setAnalysisResult(null)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold"
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      onClick={handleConfirmMeal}
                      className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Check className="size-5" />
                      {t('nutrition.confirmSave')}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMeal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{t('nutrition.editMeal')}</h3>
                  <button onClick={() => setEditingMeal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X className="size-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('nutrition.descriptionName')}</label>
                    <input 
                      type="text"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('nutrition.type')}</label>
                      <select 
                        value={editFormData.type}
                        onChange={(e) => setEditFormData({...editFormData, type: e.target.value as any})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none appearance-none"
                      >
                        <option value="Breakfast">{t('nutrition.breakfast')}</option>
                        <option value="Lunch">{t('nutrition.lunch')}</option>
                        <option value="Dinner">{t('nutrition.dinner')}</option>
                        <option value="Snack">{t('nutrition.snack')}</option>
                        <option value="Pre-workout">{t('nutrition.preWorkout')}</option>
                        <option value="Post-workout">{t('nutrition.postWorkout')}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('nutrition.calories')}</label>
                      <input 
                        type="number"
                        value={editFormData.calories}
                        onChange={(e) => setEditFormData({...editFormData, calories: Number(e.target.value)})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">{t('nutrition.proteinG')}</label>
                      <input 
                        type="number"
                        value={editFormData.protein}
                        onChange={(e) => setEditFormData({...editFormData, protein: Number(e.target.value)})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">{t('nutrition.carbsG')}</label>
                      <input 
                        type="number"
                        value={editFormData.carbs}
                        onChange={(e) => setEditFormData({...editFormData, carbs: Number(e.target.value)})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">{t('nutrition.fatG')}</label>
                      <input 
                        type="number"
                        value={editFormData.fat}
                        onChange={(e) => setEditFormData({...editFormData, fat: Number(e.target.value)})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleUpdateMeal}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                  >
                    {t('nutrition.saveChanges')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NutritionHistory({ onBack, onSelectDay, meals }: { onBack: () => void, onSelectDay: (date: string) => void, meals: Meal[] }) {
  // Group meals by day
  const days = Array.from(new Set(meals.map(m => new Date(m.date).toDateString())))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col pb-24"
    >
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 border-b border-primary/10 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ChevronRight className="size-6 rotate-180" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Macro History</h1>
      </header>

      <main className="p-4 space-y-3">
        {days.map(dayStr => {
          const date = new Date(dayStr);
          const dayMeals = meals.filter(m => new Date(m.date).toDateString() === dayStr);
          const dayCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
          const dayProtein = dayMeals.reduce((sum, m) => sum + m.protein, 0);
          const dayCarbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0);
          const dayFat = dayMeals.reduce((sum, m) => sum + m.fat, 0);

          return (
            <div 
              key={dayStr}
              onClick={() => onSelectDay(date.toISOString())}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-primary/5 shadow-sm flex items-center justify-between hover:bg-primary/5 transition-colors cursor-pointer group"
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{Math.round(dayCalories)}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">kcal</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{Math.round(dayProtein)}g</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Prot</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{Math.round(dayCarbs)}g</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Carb</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{Math.round(dayFat)}g</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Fat</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="size-5 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
          );
        })}
      </main>
    </motion.div>
  );
}

function DailyNutritionDetail({ date, onBack, meals, onDelete, onUpdate, onEdit }: { 
  date: string, 
  onBack: () => void, 
  meals: Meal[], 
  onDelete: (id: string) => void,
  onUpdate: (id: string, data: Partial<Meal>) => void,
  onEdit: (meal: Meal) => void
}) {
  const dayDate = new Date(date);
  const dayMeals = meals.filter(m => new Date(m.date).toDateString() === dayDate.toDateString());
  
  const totalCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = dayMeals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = dayMeals.reduce((sum, m) => sum + m.fat, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col pb-24"
    >
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 border-b border-primary/10 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ChevronRight className="size-6 rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Daily Details</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {dayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-primary/5 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Total Calories</span>
            <p className="text-2xl font-black text-primary">{Math.round(totalCalories)} <span className="text-xs font-bold opacity-60">kcal</span></p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-primary/5 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Total Protein</span>
            <p className="text-2xl font-black text-blue-500">{Math.round(totalProtein)} <span className="text-xs font-bold opacity-60">g</span></p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-primary/5 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Total Carbs</span>
            <p className="text-2xl font-black text-amber-500">{Math.round(totalCarbs)} <span className="text-xs font-bold opacity-60">g</span></p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-primary/5 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Total Fat</span>
            <p className="text-2xl font-black text-emerald-500">{Math.round(totalFat)} <span className="text-xs font-bold opacity-60">g</span></p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold">Meals</h2>
          <div className="space-y-3">
            {dayMeals.length > 0 ? (
              dayMeals.map(meal => (
                <MealItem 
                  key={meal.id}
                  meal={meal}
                  onDelete={() => onDelete(meal.id)}
                  onEdit={() => onEdit(meal)}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500">No meals logged for this day</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </motion.div>
  );
}

function MacroCard({ label, current, target, progress }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-primary/5">
      <div className="flex justify-between text-xs mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-primary">{current}/{target}</span>
      </div>
      <div className="w-full bg-primary/10 h-1.5 rounded-full overflow-hidden">
        <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }}></div>
      </div>
    </div>
  );
}

function MealItem({ meal, onDelete, onEdit }: any) {
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-primary/5 group">
      <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-700">
        {meal.imageUrl ? (
          <img className="h-full w-full object-cover" src={meal.imageUrl} alt={meal.description} referrerPolicy="no-referrer" />
        ) : meal.mediaExpired ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <ImageOff className="size-5 text-slate-300 mb-1" />
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Expired</span>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Utensils className="size-6 text-slate-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold truncate">{meal.description}</h4>
        <p className="text-xs text-slate-500">{meal.type} • {meal.time}</p>
        <div className="flex gap-2 mt-1">
          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">{meal.calories} kcal</span>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{meal.protein}g P</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          <Edit3 className="size-5" />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="size-5" />
        </button>
      </div>
    </div>
  );
}
