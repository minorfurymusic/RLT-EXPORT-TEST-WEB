import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { Beef, Droplets, Footprints, Stethoscope, Plus, Trash2, Edit3, ChevronRight, X, Dumbbell, Flame } from './Icons';
import { cn } from '../lib/utils';

const METRIC_CONFIG = {
  calories: { title: 'Calories', unit: 'kcal', target: 2500, icon: <Flame className="size-6" />, color: 'bg-orange-500', textColor: 'text-orange-500' },
  protein: { title: 'Protein', unit: 'g', target: 120, icon: <Beef className="size-6" />, color: 'bg-blue-500', textColor: 'text-blue-500' },
  hydration: { title: 'Hydration', unit: 'L', target: 3, icon: <Droplets className="size-6" />, color: 'bg-cyan-500', textColor: 'text-cyan-500' },
  steps: { title: 'Steps', unit: '', target: 10000, icon: <Footprints className="size-6" />, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  healthScore: { title: 'Health Score', unit: '/100', target: 100, icon: <Stethoscope className="size-6" />, color: 'bg-primary', textColor: 'text-primary' },
};

export default function MetricDetail() {
  const { metricType } = useParams<{ metricType: string }>();
  const navigate = useNavigate();
  const { getTodayValue, getHistory, addRecord, updateRecord, deleteRecord } = useHealth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ id: string, value: string } | null>(null);
  const [newValue, setNewValue] = useState('');

  const config = METRIC_CONFIG[metricType as keyof typeof METRIC_CONFIG];
  if (!config) return <div>Metric not found</div>;

  const todayValue = getTodayValue(metricType as any);
  const history = getHistory(metricType as any);
  const progress = Math.min(100, (todayValue / config.target) * 100);

  const handleAdd = () => {
    if (!newValue) return;
    addRecord(metricType as any, parseFloat(newValue));
    setNewValue('');
    setIsModalOpen(false);
  };

  const handleUpdate = () => {
    if (!editingRecord) return;
    updateRecord(editingRecord.id, parseFloat(editingRecord.value));
    setEditingRecord(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="p-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronRight className="size-6 rotate-180" />
        </button>
        <div className={cn("p-2 rounded-lg bg-opacity-10", config.color.replace('bg-', 'bg-opacity-10 text-'))}>
          {config.icon}
        </div>
        <h1 className="text-xl font-bold">{config.title}</h1>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-8 text-center">
        <p className="text-slate-500 text-sm uppercase font-bold tracking-wider mb-2">Today's Total</p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-6xl font-black">{todayValue}</span>
          <span className="text-xl font-bold text-slate-400">{config.unit}</span>
        </div>
        
        <div className="mt-8 space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn("h-full rounded-full", config.color)}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">Goal: {config.target}{config.unit}</p>
        </div>
      </section>

      {/* History */}
      <section className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-t-[2.5rem] p-6 mt-4">
        <h3 className="font-bold text-lg mb-4">History</h3>
        <div className="space-y-3">
          {history.map((record) => (
            <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{record.value} <span className="text-xs text-slate-400 font-normal">{config.unit}</span></p>
                <p className="text-xs text-slate-500">{new Date(record.date).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (metricType === 'healthScore') {
                      navigate('/history');
                    } else {
                      setEditingRecord({ id: record.id, value: record.value.toString() });
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <Edit3 className="size-4" />
                </button>
                {metricType !== 'healthScore' && (
                  <button 
                    onClick={() => deleteRecord(record.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAB */}
      {metricType !== 'healthScore' && metricType !== 'steps' && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className={cn("fixed right-6 bottom-24 size-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-30", config.color)}
        >
          <Plus className="size-8" />
        </button>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Add {config.title}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="number" 
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Enter value"
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">{config.unit}</span>
                </div>
                <button 
                  onClick={handleAdd}
                  className={cn("w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-transform active:scale-95", config.color)}
                >
                  Save Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Record</h3>
                <button onClick={() => setEditingRecord(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="number" 
                    value={editingRecord.value}
                    onChange={(e) => setEditingRecord({ ...editingRecord, value: e.target.value })}
                    placeholder="Enter value"
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-lg font-bold focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">{config.unit}</span>
                </div>
                <button 
                  onClick={handleUpdate}
                  className={cn("w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-transform active:scale-95", config.color)}
                >
                  Update Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
