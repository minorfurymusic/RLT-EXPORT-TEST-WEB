import React, { useState } from 'react';
import { Menu, Bell, Droplets, Plus, Minus, Trash2, ChevronLeft } from './Icons';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { useNavigate } from 'react-router-dom';

export default function WaterTracking() {
  const navigate = useNavigate();
  const { waterLogs, addWaterLog, deleteWaterLog, getDailyWaterTarget, getTodayValue, selectedDate, t } = useHealth();
  const [amount, setAmount] = useState(250);

  const todayWater = getTodayValue('hydration') * 1000; // in ml
  const target = getDailyWaterTarget() * 1000; // in ml
  const progress = (todayWater / target) * 100;

  const handleAddWater = () => {
    addWaterLog({
      amount,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: selectedDate === new Date().toISOString().split('T')[0] ? new Date().toISOString() : `${selectedDate}T12:00:00Z`
    });
  };

  const targetDateStr = new Date(selectedDate + 'T12:00:00').toDateString();
  const todayLogs = waterLogs.filter(l => new Date(l.date).toDateString() === targetDateStr);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col pb-24 min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-4 border-b border-primary/10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="text-xl font-bold tracking-tight flex-1">{t('water.title')}</h1>
        <Droplets className="size-6 text-cyan-500" />
      </header>

      <main className="p-4 space-y-6">
        <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center">
          <div className="relative size-48 flex items-center justify-center mb-6">
            <svg className="size-48 transform -rotate-90">
              <circle className="text-cyan-100 dark:text-cyan-900/30" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12"></circle>
              <motion.circle 
                initial={{ strokeDashoffset: 552.9 }}
                animate={{ strokeDashoffset: 552.9 - (552.9 * Math.min(100, progress)) / 100 }}
                className="text-cyan-500" 
                cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12"
                strokeDasharray="552.9"
                strokeLinecap="round"
              ></motion.circle>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black text-slate-900 dark:text-white">{Math.round(todayWater)}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">ml</span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500 mb-1">{t('water.dailyTarget', { target: Math.round(target) })}</p>
            <p className="text-xs text-cyan-600 font-bold bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1 rounded-full">
              {progress >= 100 ? t('water.goalReached') : t('water.remaining', { amount: Math.round(target - todayWater) })}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold">{t('water.logWater')}</h2>
            <span className="text-xs font-bold text-slate-400">{t('water.selectAmount')}</span>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setAmount(prev => Math.max(50, prev - 50))}
                className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus className="size-6" />
              </button>
              <div className="text-center">
                <span className="text-3xl font-black text-primary">{amount}</span>
                <span className="text-sm font-bold text-slate-400 ml-1">ml</span>
              </div>
              <button 
                onClick={() => setAmount(prev => prev + 50)}
                className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus className="size-6" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {[150, 250, 330, 500].map(val => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${amount === val ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                >
                  {val}ml
                </button>
              ))}
            </div>

            <button 
              onClick={handleAddWater}
              className="w-full py-4 bg-cyan-500 text-white rounded-2xl font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Droplets className="size-5" />
              Log {amount}ml
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold px-2">Today's History</h2>
          <div className="space-y-2">
            {todayLogs.length > 0 ? (
              todayLogs.map(log => (
                <div key={log.id} className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="size-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center text-cyan-500">
                    <Droplets className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{log.amount}ml</p>
                    <p className="text-xs text-slate-500">{log.time}</p>
                  </div>
                  <button 
                    onClick={() => deleteWaterLog(log.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 opacity-50 italic text-sm">No water logged yet today</div>
            )}
          </div>
        </section>
      </main>
    </motion.div>
  );
}
