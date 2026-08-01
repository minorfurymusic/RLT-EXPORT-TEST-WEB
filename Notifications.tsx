import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { Bell, ChevronRight, X, Sparkles, Medication, Calendar, Walk, Utensils, Settings } from './Icons';
import { cn } from '../lib/utils';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, clearAllNotifications } = useHealth();

  const getIcon = (type: string) => {
    switch (type) {
      case 'goal': return <Sparkles className="size-5 text-amber-500" />;
      case 'medication': return <Medication className="size-5 text-red-500" />;
      case 'event': return <Calendar className="size-5 text-blue-500" />;
      case 'exercise': return <Walk className="size-5 text-emerald-500" />;
      case 'nutrition': return <Utensils className="size-5 text-orange-500" />;
      case 'system': return <Settings className="size-5 text-slate-500" />;
      default: return <Bell className="size-5 text-primary" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col min-h-full bg-white dark:bg-slate-950"
    >
      <header className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronRight className="size-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={clearAllNotifications}
            className="text-xs font-medium text-primary hover:opacity-70 transition-opacity"
          >
            Clear All
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Bell className="size-12 mb-4 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                if (n.targetPath) navigate(n.targetPath);
              }}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all flex gap-4",
                n.read 
                  ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60" 
                  : "bg-primary/5 border-primary/10 dark:bg-primary/10 dark:border-primary/20 shadow-sm"
              )}
            >
              <div className={cn(
                "size-10 rounded-xl flex items-center justify-center shrink-0",
                n.read ? "bg-slate-100 dark:bg-slate-800" : "bg-white dark:bg-slate-800 shadow-sm"
              )}>
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm truncate">{n.title}</h3>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{n.time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {n.description}
                </p>
              </div>
              {!n.read && (
                <div className="size-2 rounded-full bg-primary mt-2"></div>
              )}
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}
