import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Plus, Trash2, X, Check, Edit3, ChevronDown } from './Icons';
import { useHealth } from '../context/HealthContext';
import { HEALTH_CONDITIONS_DATA, HealthCategory, Condition } from '../data/healthConditions';
import { SelectedCondition } from '../types';
import { cn } from '../lib/utils';

interface HealthConditionsManagerProps {
  onComplete?: () => void;
}

export default function HealthConditionsManager({ onComplete }: HealthConditionsManagerProps = {}) {
  const { profile, updateProfile, t } = useHealth();
  const [isAdding, setIsAdding] = useState(false);
  const [step, setStep] = useState<'category' | 'condition' | 'details'>('category');
  const [selectedCategory, setSelectedCategory] = useState<HealthCategory | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  const [details, setDetails] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [status, setStatus] = useState<'Active' | 'Controlled' | 'Recovered' | 'Chronic'>('Active');
  const [yearDiagnosed, setYearDiagnosed] = useState<string>('');
  const [severity, setSeverity] = useState('');
  const [affectedBodyArea, setAffectedBodyArea] = useState('');

  const selectedConditions = profile.selectedConditions || [];

  const handleAdd = () => {
    setIsAdding(true);
    setStep('category');
    setSelectedCategory(null);
    setSelectedCondition(null);
    setDetails({});
    setNotes('');
    setCustomCondition('');
    setStatus('Active');
    setYearDiagnosed('');
    setSeverity('');
    setAffectedBodyArea('');
  };

  const handleSave = () => {
    if (!selectedCondition && !customCondition) return;

    const newCondition: SelectedCondition = {
      id: Math.random().toString(36).substr(2, 9),
      category: selectedCategory?.name || 'Other',
      condition: customCondition || selectedCondition?.name || '',
      details: Object.entries(details).map(([label, value]) => {
        if (Array.isArray(value)) return `${label}: ${value.join(', ')}`;
        return `${label}: ${value}`;
      }),
      notes: notes,
      status: status,
      yearDiagnosed: yearDiagnosed ? parseInt(yearDiagnosed) : undefined,
      severity: severity || undefined,
      affectedBodyArea: affectedBodyArea || undefined
    };

    updateProfile({
      selectedConditions: [...selectedConditions, newCondition]
    });
    setIsAdding(false);
    onComplete?.();
  };

  const handleRemove = (id: string) => {
    updateProfile({
      selectedConditions: selectedConditions.filter(c => c.id !== id)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('medical.historyTitle')}</h3>
        <button 
          onClick={handleAdd}
          className="text-xs text-primary font-bold flex items-center gap-1"
        >
          <Plus className="size-3" />
          {t('medical.addCondition')}
        </button>
      </div>

      <div className="space-y-3">
        {selectedConditions.length > 0 ? (
          selectedConditions.map((c) => (
            <div key={c.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group relative">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-0.5">{c.category}</span>
                  <h4 className="font-bold text-sm">{c.condition}</h4>
                </div>
                <button 
                  onClick={() => handleRemove(c.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              
              {c.details && c.details.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.status && (
                    <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 text-primary font-bold">
                      {c.status}
                    </span>
                  )}
                  {c.yearDiagnosed && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 font-medium">
                      Since {c.yearDiagnosed}
                    </span>
                  )}
                  {c.severity && (
                    <span className="text-[10px] bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800 text-orange-600 font-medium">
                      {c.severity}
                    </span>
                  )}
                  {c.affectedBodyArea && (
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800 text-blue-600 font-medium">
                      {c.affectedBodyArea}
                    </span>
                  )}
                  {c.details.map((d, i) => (
                    <span key={i} className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700 text-slate-500">
                      {d}
                    </span>
                  ))}
                </div>
              )}
              
              {c.notes && (
                <p className="text-xs text-slate-400 mt-2 italic">"{c.notes}"</p>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 italic">No conditions or risk factors added yet.</p>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button 
          onClick={handleAdd}
          className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-bold hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <Plus className="size-4" />
          Add another health condition
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-slate-900 z-10 py-2">
                <div>
                  <h3 className="text-xl font-bold">Add Health Condition</h3>
                  <p className="text-xs text-slate-500">
                    {step === 'category' ? 'Step 1: Select Category' : 
                     step === 'condition' ? 'Step 2: Select Condition' : 
                     'Step 3: Add Details'}
                  </p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>

              {step === 'category' && (
                <div className="space-y-2">
                  {HEALTH_CONDITIONS_DATA.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setStep('condition');
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group text-left"
                    >
                      <span className="font-bold text-sm group-hover:text-primary">{cat.name}</span>
                      <ChevronRight className="size-4 text-slate-300 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              )}

              {step === 'condition' && selectedCategory && (
                <div className="space-y-2">
                  <button 
                    onClick={() => setStep('category')}
                    className="text-xs font-bold text-primary mb-4 flex items-center gap-1"
                  >
                    <ChevronRight className="size-3 rotate-180" />
                    Back to Categories
                  </button>
                  
                  {selectedCategory.name === 'Other condition / Not listed' ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Condition Name</label>
                        <input 
                          type="text"
                          value={customCondition}
                          onChange={(e) => setCustomCondition(e.target.value)}
                          placeholder="Type condition name..."
                          className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-5 font-bold text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setStep('details')}
                        disabled={!customCondition}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold disabled:opacity-50"
                      >
                        Continue
                      </button>
                    </div>
                  ) : (
                    selectedCategory.conditions.map((cond) => (
                      <button
                        key={cond.name}
                        onClick={() => {
                          setSelectedCondition(cond);
                          setStep('details');
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group text-left"
                      >
                        <span className="font-bold text-sm group-hover:text-primary">{cond.name}</span>
                        <ChevronRight className="size-4 text-slate-300 group-hover:text-primary" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {step === 'details' && (
                <div className="space-y-6">
                  <button 
                    onClick={() => setStep('condition')}
                    className="text-xs font-bold text-primary mb-2 flex items-center gap-1"
                  >
                    <ChevronRight className="size-3 rotate-180" />
                    Back to Conditions
                  </button>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{selectedCategory?.name}</span>
                    <h4 className="font-bold text-lg">{customCondition || selectedCondition?.name}</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Current Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Active', 'Controlled', 'Recovered', 'Chronic'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={cn(
                              "p-3 rounded-xl text-sm font-medium transition-all border",
                              status === s 
                                ? "bg-primary text-white border-primary" 
                                : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400"
                            )}
                          >
                            {t(`medical.status.${s.toLowerCase()}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Year Diagnosed</label>
                        <input 
                          type="number"
                          value={yearDiagnosed}
                          onChange={(e) => setYearDiagnosed(e.target.value)}
                          placeholder="e.g. 2022"
                          className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Severity</label>
                        <input 
                          type="text"
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value)}
                          placeholder="e.g. Moderate"
                          className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Affected Body Area</label>
                      <input 
                        type="text"
                        value={affectedBodyArea}
                        onChange={(e) => setAffectedBodyArea(e.target.value)}
                        placeholder="e.g. Lower abdomen"
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 font-bold text-sm"
                      />
                    </div>
                  </div>

                  {selectedCondition?.details?.map((detail) => (
                    <div key={detail.label} className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">{detail.label}</label>
                      
                      {detail.type === 'radio' && (
                        <div className="grid grid-cols-1 gap-2">
                          {detail.options?.map(opt => (
                            <button
                              key={opt}
                              onClick={() => setDetails(prev => ({ ...prev, [detail.label]: opt }))}
                              className={cn(
                                "p-3 rounded-xl text-sm font-medium text-left transition-all border",
                                details[detail.label] === opt 
                                  ? "bg-primary text-white border-primary" 
                                  : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {detail.type === 'checkbox' && (
                        <div className="grid grid-cols-1 gap-2">
                          {detail.options?.map(opt => {
                            const current = details[detail.label] || [];
                            const isSelected = current.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  const next = isSelected 
                                    ? current.filter((i: string) => i !== opt)
                                    : [...current, opt];
                                  setDetails(prev => ({ ...prev, [detail.label]: next }));
                                }}
                                className={cn(
                                  "p-3 rounded-xl text-sm font-medium text-left transition-all border flex items-center justify-between",
                                  isSelected 
                                    ? "bg-primary/10 border-primary/30 text-primary" 
                                    : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400"
                                )}
                              >
                                <span>{opt}</span>
                                {isSelected && <Check className="size-4" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {(detail.type === 'text' || detail.type === 'number') && (
                        <input 
                          type={detail.type}
                          value={details[detail.label] || ''}
                          onChange={(e) => setDetails(prev => ({ ...prev, [detail.label]: e.target.value }))}
                          className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-5 font-bold text-sm"
                          placeholder={`Enter ${detail.label.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Optional Notes</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional information..."
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-5 font-medium text-sm min-h-[100px] resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleSave}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
                  >
                    {t('medical.saveCondition')}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
