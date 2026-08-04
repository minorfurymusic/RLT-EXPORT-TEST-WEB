import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, Check, Sparkles, Trophy, Droplet } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useHealth } from '../context/HealthContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'biostatus' | 'water' | 'nutrition';
}

export default function ShareModal({ isOpen, onClose, defaultCategory = 'biostatus' }: ShareModalProps) {
  const { profile, waterLogs, meals, historyRecords, t, appLanguage } = useHealth();
  const [activeCategory, setActiveCategory] = useState<'biostatus' | 'water' | 'nutrition'>(defaultCategory);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Compute daily metrics for share card
  const todayStr = new Date().toISOString().split('T')[0];

  const todayWaterMl = waterLogs
    .filter(w => w.date === todayStr)
    .reduce((acc, curr) => acc + curr.amount, 0);
  const waterTarget = profile.customWaterGoal || Math.round((profile.weight || 70) * 35);
  const waterPct = Math.min(100, Math.round((todayWaterMl / waterTarget) * 100));

  const todayMeals = meals.filter(m => m.date === todayStr);
  const todayCalories = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsGeneratingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#0f172a'
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `RealLifeTrack_Progresso_${activeCategory}_${todayStr}.png`;
      link.click();
    } catch (err) {
      console.error('Error generating card image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleNativeShare = async () => {
    const textContent = activeCategory === 'biostatus'
      ? `⚡ Meu Bio-Status no Real Life Track!\n🏆 Score Circadiano: 88/100\n💧 Hidratação: ${todayWaterMl}ml (${waterPct}%)\n\n#RealLifeTrack #Saude`
      : activeCategory === 'water'
      ? `💧 Meta de Hidratação Concluída no Real Life Track!\nBebei ${todayWaterMl}ml de água hoje (${waterPct}% da meta).\n\n#RealLifeTrack #Hidratação`
      : `🥗 Balanço Nutricional de Hoje no Real Life Track:\n${todayCalories} kcal consumidas em ${todayMeals.length} refeições.\n\n#RealLifeTrack #Nutricao`;

    const shareData = {
      title: 'Real Life Track - Compartilhar Progresso',
      text: textContent,
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled:', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl overflow-hidden relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                  <Share2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Compartilhar Progresso</h3>
                  <p className="text-[11px] text-slate-400">Escolha o que compartilhar nas redes</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Category selector pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 no-scrollbar mb-4">
              <button
                onClick={() => setActiveCategory('biostatus')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === 'biostatus' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                ⚡ Bio-Status
              </button>
              <button
                onClick={() => setActiveCategory('water')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === 'water' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                💧 Água
              </button>
              <button
                onClick={() => setActiveCategory('nutrition')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === 'nutrition' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🥗 Nutrição
              </button>
            </div>

            {/* Visual Social Story Card (Rendered for Screenshot) */}
            <div
              ref={cardRef}
              className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-2xl text-white relative overflow-hidden mb-6"
            >
              {/* Background decorative elements */}
              <div className="absolute -top-12 -right-12 size-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 size-36 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs">
                    RLT
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-wider uppercase text-indigo-300">Real Life Track</h4>
                    <p className="text-[9px] text-slate-400">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-white/10 rounded-full text-[10px] font-semibold text-indigo-200 border border-white/10">
                  {profile.name || 'Usuário'}
                </span>
              </div>

              {activeCategory === 'biostatus' && (
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Score Circadiano</p>
                      <p className="text-3xl font-black text-emerald-400">88 <span className="text-sm text-slate-400 font-normal">/100</span></p>
                    </div>
                    <Trophy className="size-8 text-amber-400 animate-pulse" />
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold mb-1">
                      <Droplet className="size-3.5" />
                      <span>Água Hoje</span>
                    </div>
                    <p className="text-lg font-black text-white">{todayWaterMl} <span className="text-xs text-slate-400">ml</span></p>
                    <p className="text-[10px] text-blue-300">{waterPct}% da meta</p>
                  </div>
                </div>
              )}

              {activeCategory === 'water' && (
                <div className="text-center py-4 space-y-3 relative z-10">
                  <div className="size-16 mx-auto rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                    <Droplet className="size-8" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-blue-400">{todayWaterMl} <span className="text-sm font-semibold text-slate-300">ml</span></p>
                    <p className="text-xs font-semibold text-slate-300 mt-1">Nível de Hidratação ({waterPct}% da meta diária)</p>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/10">
                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${waterPct}%` }} />
                  </div>
                </div>
              )}

              {activeCategory === 'nutrition' && (
                <div className="py-2 space-y-3 relative z-10">
                  <div className="flex items-center justify-between bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">Calorias Consumidas</p>
                      <p className="text-2xl font-black text-white">{todayCalories} <span className="text-xs text-slate-400">kcal</span></p>
                    </div>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                      {todayMeals.length} refeições
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-indigo-300 font-semibold relative z-10">
                <span>Rastreamento Inteligente de Saúde</span>
                <span>@reallifetrack</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownloadCard}
                disabled={isGeneratingImage}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
              >
                <Download className="size-4 text-indigo-400" />
                <span>Baixar Cartão HD</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Share2 className="size-4" />}
                <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
