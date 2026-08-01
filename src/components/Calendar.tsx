import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, FileText, Medication, Walk, Utensils, Stethoscope, Check, RefreshCw } from './Icons';
import { cn } from '../lib/utils';
import { CalendarEvent } from '../types';

export default function Calendar() {
  const navigate = useNavigate();
  const { 
    t, 
    appLanguage, 
    events, 
    addEvent, 
    deleteEvent, 
    toggleAdherence, 
    selectedDate: contextDate, 
    setSelectedDate: setContextDate,
    googleUser,
    googleAccessToken,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncGoogleCalendar,
    isSyncing
  } = useHealth();
  
  const getSafeDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const selectedDate = getSafeDate(contextDate);
  const setSelectedDate = (date: Date) => {
    setContextDate(date.toISOString().split('T')[0]);
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // New event form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('09:00 AM');
  const [newType, setNewType] = useState<CalendarEvent['type']>('medical');

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const monthNames = [
    t('common.months.january'), t('common.months.february'), t('common.months.march'), 
    t('common.months.april'), t('common.months.may'), t('common.months.june'), 
    t('common.months.july'), t('common.months.august'), t('common.months.september'), 
    t('common.months.october'), t('common.months.november'), t('common.months.december')
  ];

  const filteredEvents = events.filter(e => new Date(e.date).toDateString() === selectedDate.toDateString());

  const handleAddEvent = () => {
    if (!newTitle) return;
    addEvent({
      title: newTitle,
      description: newDesc,
      date: selectedDate.toISOString(),
      time: newTime,
      type: newType,
      synced: true
    });
    setNewTitle('');
    setNewDesc('');
    setIsAddModalOpen(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col min-h-full bg-white dark:bg-slate-950"
    >
      <header className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronRight className="size-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold">{t('calendar.title')}</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Plus className="size-6" />
        </button>
      </header>

      {/* Google Calendar Integration Header Card */}
      <div className="mx-6 mt-4 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {appLanguage === 'pt-BR' ? 'Google Agenda' : 'Google Calendar'}
              </h3>
              <p className="text-xs text-slate-500">
                {googleAccessToken 
                  ? (googleUser?.email || (appLanguage === 'pt-BR' ? 'Conectado' : 'Connected'))
                  : (appLanguage === 'pt-BR' ? 'Sincronize sua agenda' : 'Sync your schedule')}
              </p>
            </div>
          </div>
          
          {googleAccessToken ? (
            <button
              onClick={disconnectGoogleCalendar}
              className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors py-1.5 px-3 rounded-lg bg-red-50 dark:bg-red-950/20"
            >
              {appLanguage === 'pt-BR' ? 'Desconectar' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={connectGoogleCalendar}
              disabled={isSyncing}
              className="text-xs font-bold bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white transition-all py-2 px-4 rounded-xl shadow-md shadow-indigo-600/10 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSyncing ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : null}
              {appLanguage === 'pt-BR' ? 'Conectar' : 'Connect'}
            </button>
          )}
        </div>

        {googleAccessToken && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-150 dark:border-slate-800">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {appLanguage === 'pt-BR' ? 'Sincronização Ativa' : 'Sync Active'}
            </span>
            <button
              onClick={syncGoogleCalendar}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
              {appLanguage === 'pt-BR' ? 'Sincronizar' : 'Sync Now'}
            </button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{monthNames[month]} {year}</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedDate(new Date(year, month - 1, 1))}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              <ChevronRight className="size-5 rotate-180" />
            </button>
            <button 
              onClick={() => setSelectedDate(new Date(year, month + 1, 1))}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {[
            t('common.days.sunday'), t('common.days.monday'), t('common.days.tuesday'), 
            t('common.days.wednesday'), t('common.days.thursday'), t('common.days.friday'), 
            t('common.days.saturday')
          ].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month;
            const hasEvents = events.some(e => {
              const d = new Date(e.date);
              return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
            });

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all",
                  isSelected 
                    ? "bg-primary text-white shadow-lg shadow-primary/30" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span className="text-sm font-bold">{day}</span>
                {hasEvents && !isSelected && (
                  <div className="size-1 rounded-full bg-primary absolute bottom-2"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events for Selected Day */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-t-[2.5rem] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('calendar.events')}</h3>
          <span className="text-xs text-slate-500 font-medium">{selectedDate.toLocaleDateString(appLanguage, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>

        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <p className="text-sm">{t('calendar.noEvents')}</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center shrink-0",
                  event.type === 'medical' ? "bg-blue-100 text-blue-600" :
                  event.type === 'workout' ? "bg-emerald-100 text-emerald-600" :
                  event.type === 'medication' ? "bg-red-100 text-red-600" :
                  "bg-orange-100 text-orange-600"
                )}>
                  {event.type === 'medical' ? <Stethoscope className="size-5" /> :
                   event.type === 'workout' ? <Walk className="size-5" /> :
                   event.type === 'medication' ? <Medication className="size-5" /> :
                   <Utensils className="size-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{event.title}</p>
                  <p className="text-xs text-slate-500">{event.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs font-bold text-primary">{event.time}</p>
                  {event.type === 'medication' && event.linkedId ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAdherence(event.linkedId!, event.date, event.time, 'taken')}
                        className={cn(
                          "size-6 rounded-md flex items-center justify-center transition-all",
                          event.status === 'taken' 
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600"
                        )}
                      >
                        <Check className="size-3" />
                      </button>
                      <button
                        onClick={() => toggleAdherence(event.linkedId!, event.date, event.time, 'missed')}
                        className={cn(
                          "size-6 rounded-md flex items-center justify-center transition-all",
                          event.status === 'missed' 
                            ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
                        )}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => deleteEvent(event.id)} className="text-[10px] text-red-500">{t('common.delete')}</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-[95%] sm:w-full max-w-md mx-auto rounded-t-[2.5rem] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden mb-safe"
            >
              <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 flex justify-between items-center p-8 pb-4 border-b border-slate-50 dark:border-slate-800 shrink-0">
                <h3 className="text-xl font-bold">{t('calendar.scheduleEvent')}</h3>
                <button 
                  onClick={() => {
                    setNewTitle('');
                    setNewDesc('');
                    setNewTime('09:00 AM');
                    setNewType('medical');
                    setIsAddModalOpen(false);
                  }} 
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-4 pb-12 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">{t('calendar.eventTitle')}</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t('calendar.placeholder.title')}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">{t('calendar.eventDesc')}</label>
                  <input 
                    type="text" 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder={t('calendar.placeholder.details')}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">{t('calendar.eventTime')}</label>
                    <input 
                      type="text" 
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">{t('calendar.eventType')}</label>
                    <select 
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold appearance-none"
                    >
                      <option value="medical">{t('calendar.type.medical')}</option>
                      <option value="exam">{t('calendar.type.exam')}</option>
                      <option value="medication">{t('calendar.type.medication')}</option>
                      <option value="workout">{t('calendar.type.workout')}</option>
                      <option value="nutrition">{t('calendar.type.nutrition')}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                  <CalendarIcon className="size-5 text-blue-500" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    {t('calendar.syncMessage')}
                  </p>
                </div>

                <button 
                  onClick={handleAddEvent}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 transition-transform active:scale-95"
                >
                  {t('calendar.scheduleEvent')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
