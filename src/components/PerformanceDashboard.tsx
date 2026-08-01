import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { 
  ChevronLeft, ChevronRight, Brain, AlertTriangle, TrendingUp, 
  Activity, Calendar, RefreshCw, Info, Camera, Share2, Download
} from 'lucide-react';
import { useHealth } from '../context/HealthContext';
import { PerformanceSnapshot } from '../types';

export const PerformanceDashboard: React.FC = () => {
  const { performanceSnapshots, generateDailyPerformanceSnapshot, getPerformanceSnapshotByDate, profile, t } = useHealth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleCaptureScreenshot = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a'
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `RealLifeTrack_BioStatus_${selectedDate}.png`;
      link.click();
    } catch (err) {
      console.error('Error capturing screenshot:', err);
    }
  };

  React.useEffect(() => {
    let timer: any;
    if (isGenerating) {
      timer = setTimeout(() => {
        setShowFallback(true);
      }, 2000);
    } else {
      setShowFallback(false);
    }
    return () => clearTimeout(timer);
  }, [isGenerating]);

  const snapshotsForDate = useMemo(() => {
    return performanceSnapshots.filter(s => s.date === selectedDate)
      .sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
  }, [selectedDate, performanceSnapshots]);

  const snapshot = snapshotsForDate[0];

  const aiReport = useMemo(() => {
    return {
      diagnosis: snapshot?.aiReport?.diagnosis || t('performance.defaultDiagnosis') || "Análise do Personal Trainer IA em processamento...",
      medicalAlerts: Array.isArray(snapshot?.aiReport?.medicalAlerts) ? snapshot.aiReport.medicalAlerts : [],
      practicalSuggestions: Array.isArray(snapshot?.aiReport?.practicalSuggestions) ? snapshot.aiReport.practicalSuggestions : [],
      predictiveInsights: snapshot?.aiReport?.predictiveInsights || t('performance.defaultInsights') || "Calculando projeção circadiana."
    };
  }, [snapshot, t]);

  const radarData = useMemo(() => {
    if (!snapshot && !showFallback) return [];
    
    // OMNI-V15: Fallback to default biometrics if no snapshot or timeout
    const data = snapshot?.radarData || {
      strength: 50,
      nutrition: 50,
      vitality: 50,
      focus: 50,
      conditioning: 50
    };

    return [
      { subject: t('performance.radar.strength'), A: data.strength, fullMark: 100 },
      { subject: t('performance.radar.nutrition'), A: data.nutrition, fullMark: 100 },
      { subject: t('performance.radar.vitality'), A: data.vitality, fullMark: 100 },
      { subject: t('performance.radar.focus'), A: data.focus, fullMark: 100 },
      { subject: t('performance.radar.conditioning'), A: data.conditioning, fullMark: 100 },
    ];
  }, [snapshot, showFallback, t]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    if (d.toISOString().split('T')[0] <= today) {
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateDailyPerformanceSnapshot();
    } finally {
      setIsGenerating(false);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header & Date Selector */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm">
        <button 
          onClick={handlePrevDay}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">{t('performance.title')}</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-lg font-bold text-zinc-900 dark:text-white">
              {isToday ? t('common.today') : new Date(selectedDate).toLocaleDateString(profile.language || 'pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            {isToday && (
              <div className="flex items-center gap-1.5 ml-2">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`p-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors ${isGenerating ? 'animate-spin' : ''}`}
                  title={t('performance.updateSnapshot')}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCaptureScreenshot}
                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                  title="Capturar imagem e baixar cartão de Bio-Status"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleNextDay}
          disabled={isToday}
          className={`p-2 rounded-full transition-colors ${isToday ? 'opacity-20 cursor-not-allowed' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          <ChevronRight className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {(snapshot || showFallback) ? (
        <div ref={dashboardRef} className="space-y-6 p-2 rounded-3xl bg-slate-950/20">
          {/* Radar Chart Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                {t('performance.radarTitle')}
              </h3>
              <div className="flex flex-col items-end">
                <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{t('performance.engine')}</div>
                {snapshotsForDate.length > 1 && (
                  <div className="text-[10px] text-orange-500 font-bold">
                    {t('performance.snapshotsToday', { count: snapshotsForDate.length })}
                  </div>
                )}
                {isGenerating && showFallback && (
                  <div className="text-[10px] text-zinc-400 animate-pulse">{t('performance.syncing')}</div>
                )}
              </div>
            </div>

            <div className="h-[300px] w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-4">
              {radarData.map((item) => (
                <div key={item.subject} className="flex flex-col items-center">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">{item.subject}</span>
                  <span className="text-sm font-mono font-bold text-orange-500">{item.A}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Biofeedback Report */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 text-white p-6 rounded-3xl shadow-xl border border-zinc-800 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Brain className="w-24 h-24" />
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-orange-500 rounded-xl">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t('performance.reportTitle')}</h3>
                <p className="text-xs text-zinc-400">{t('performance.reportDesc')}</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              {/* Diagnosis */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  {t('performance.diagnosis')}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic">
                  "{aiReport.diagnosis}"
                </p>
              </div>

              {/* Medical Alerts */}
              {aiReport.medicalAlerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    {t('performance.medicalAlerts')}
                  </div>
                  <ul className="space-y-1">
                    {aiReport.medicalAlerts.map((alert, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        {alert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Practical Suggestions */}
              {aiReport.practicalSuggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                    <Info className="w-4 h-4" />
                    {t('performance.practicalSuggestions')}
                  </div>
                  <ul className="space-y-1">
                    {aiReport.practicalSuggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Predictive Insights */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4" />
                  {t('performance.predictiveInsights')}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {aiReport.predictiveInsights}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest">
                <RefreshCw className="w-3 h-3" />
                {t('performance.updatedDaily')}
              </div>
              <div className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400 uppercase">
                {t('performance.certified')}
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
            <Info className="w-10 h-10 text-zinc-300" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('performance.noData')}</h3>
            <p className="text-sm text-zinc-500 max-w-[250px]">
              {isToday 
                ? t('performance.noDataDescToday')
                : t('performance.noDataDescOther')}
            </p>
          </div>
          
          {isToday && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? (showFallback ? t('performance.usingCache') : t('performance.analyzing')) : t('performance.generateToday')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
