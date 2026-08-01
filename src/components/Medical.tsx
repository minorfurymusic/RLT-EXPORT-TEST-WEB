import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { extractMedicalData } from '../lib/ai';
import { 
  Search, 
  Stethoscope, 
  FileText, 
  ImageIcon, 
  Syringe, 
  ChevronRight, 
  Plus, 
  Activity, 
  FitnessCenter, 
  History as HistoryIcon,
  AlertCircle,
  Users,
  X,
  Trash2,
  Edit3,
  PlusCircle,
  ClipboardList,
  CalendarPlus,
  Paperclip,
  MapPin,
  Clock,
  Medication,
  AlertTriangle,
  Heart,
  ShieldAlert,
  Phone,
  Mail,
  Check,
  Sparkles,
  ChevronLeft,
  Calendar,
  TrendingUp
} from './Icons';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { useRegisterComponentRuntime } from '../lib/version';
import { HistoryCategory, HistoryRecord } from '../types';
import HealthConditionsManager from './HealthConditionsManager';
import HistoryForm from './HistoryForm';
import { cn } from '../lib/utils';
import { compressImageIfNeeded } from '../lib/imageCompressor';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function Medical() {
  useRegisterComponentRuntime('Medical');
  const navigate = useNavigate();
  const location = useLocation();
  const autoScanTriggered = useRef(false);

  const { historyRecords, deleteHistoryRecord, updateHistoryRecord, gymLogs, addHistoryRecord, profile, t, appLanguage } = useHealth();

  const [activeTab, setActiveTab] = useState<'medical' | 'workouts'>('medical');
  const [selectedCategory, setSelectedCategory] = useState<HistoryCategory | 'All'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingCategory, setAddingCategory] = useState<HistoryCategory | null>(null);
  const [activeNotesRecordId, setActiveNotesRecordId] = useState<string | null>(null);
  const [selectedRecordForFile, setSelectedRecordForFile] = useState<HistoryRecord | null>(null);
  const [isViewingFile, setIsViewingFile] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeDashboard, setActiveDashboard] = useState<'medications' | 'bp' | 'glucose' | null>(null);
  const [dashboardFilterDate, setDashboardFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [preSelectedSubtype, setPreSelectedSubtype] = useState<string | null>(null);
  const [medicalLeavePrompt, setMedicalLeavePrompt] = useState<{
    isOpen: boolean;
    recordId: string;
    days: number;
    unit: 'hours' | 'days';
  } | null>(null);

  const handleFileAttach = (record: HistoryRecord) => {
    setSelectedRecordForFile(record);
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (location.state?.autoScan && !autoScanTriggered.current) {
      const files = location.state.autoScan;
      if (Array.isArray(files)) {
        handleSmartScan(files);
      } else {
        // Fallback for single file
        handleSmartScan([files]);
      }
      autoScanTriggered.current = true;
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
    if (location.state?.openAddCategory) {
      setAddingCategory(location.state.openAddCategory);
      setIsAddModalOpen(true);
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
    if (location.state?.activeDashboard) {
      setActiveDashboard(location.state.activeDashboard);
      if (location.state.activeDashboard === 'medications') {
        setSelectedCategory('Continuous Medication');
      } else if (location.state.activeDashboard === 'bp' || location.state.activeDashboard === 'glucose') {
        setSelectedCategory('Routine Vitals');
      }
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  async function handleSmartScan(files: { data: string, name: string, type: string }[], existingRecordId?: string) {
    setIsScanning(true);
    setScanProgress(10);
    setScanStatus(t('medical.readingFiles').replace('{count}', files.length.toString()));
    
    let interval: any = null;
    try {
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev < 40) {
            setScanStatus(t('medical.processingFiles').replace('{count}', files.length.toString()));
            return prev + 5;
          }
          if (prev < 80) {
            setScanStatus(t('medical.analyzingResults'));
            return prev + 2;
          }
          setScanStatus(t('medical.validatingData'));
          return Math.min(prev + 1, 95);
        });
      }, 500);

      const result = await extractMedicalData(files.map(f => ({ data: f.data, mimeType: f.type })), appLanguage);
      const extracted = result?.extracted_data;
      
      if (interval) clearInterval(interval);
      setScanProgress(100);
      setScanStatus(t('medical.scanCompleted'));

      if (!extracted) {
        setIsScanning(false);
        return;
      }

      const newFiles = files.map(f => ({ id: Math.random().toString(36).substr(2, 9), name: f.name, url: f.data, type: f.type }));

      if (existingRecordId) {
        // Update existing record
        const update: any = {
          category: extracted.category || 'Exams',
          date: extracted.date || new Date().toISOString(),
          files: newFiles,
          attachmentUrl: files[0].data,
          priority: extracted.priority || false,
          criticalMarkers: extracted.critical_markers || []
        };

        if (extracted.category === 'Exams') {
          update.examName = extracted.title || t('medical.exam');
          update.examCategory = extracted.exam_category || 'Other Exams';
          update.status = extracted.status === 'ALERT' ? 'Attention Required' : 'Normal';
          update.provider = extracted.doctor_name || t('medical.aiSmartScan');
          update.results = extracted.results || [];
        } else if (extracted.category === 'Consultations') {
          update.doctorName = extracted.doctor_name || t('medical.identifiedViaScan');
          update.specialty = extracted.specialty || t('medical.general');
          update.status = 'Completed';
          update.reason = extracted.title || t('medical.consultation');
          update.prescriptions = extracted.prescriptions?.map((p: any) => ({
            ...p,
            id: Math.random().toString(36).substr(2, 9),
            prescribingDoctor: extracted.doctor_name || 'Scan'
          })) || [];
        } else if (extracted.category === 'Medical Certificate') {
          update.category = 'Medical Certificate';
          update.certificateInfo = {
            institution: extracted.certificate_info?.institution || t('medical.institutionPlaceholder'),
            patientName: extracted.certificate_info?.patient_name === 'User_ID_Alpha' ? profile.name : (extracted.certificate_info?.patient_name || profile.name),
            isPatientConfirmed: extracted.certificate_info?.is_patient_confirmed || false,
            cid: extracted.certificate_info?.cid,
            diagnosis: extracted.certificate_info?.diagnosis,
            leavePeriod: extracted.certificate_info?.leave_period ? {
              value: extracted.certificate_info.leave_period.value,
              unit: extracted.certificate_info.leave_period.unit,
              startDate: extracted.certificate_info.leave_period.start_date,
              endDate: extracted.certificate_info.leave_period.end_date,
            } : undefined,
            doctorCRM: extracted.doctor_crm || t('medical.notIdentified'),
            doctorName: extracted.doctor_name || t('medical.notIdentified')
          };
        }

        updateHistoryRecord(existingRecordId, update);
      } else {
        // Create new record
        const newRecord: any = {
          id: Math.random().toString(36).substr(2, 9),
          category: extracted.category || 'Exams',
          date: extracted.date || new Date().toISOString(),
          notes: [],
          attachmentUrl: files[0].data,
          files: newFiles,
          priority: extracted.priority || false,
          criticalMarkers: extracted.critical_markers || []
        };

        if (extracted.category === 'Exams') {
          newRecord.examName = extracted.title || t('medical.exam');
          newRecord.examCategory = extracted.exam_category || 'Other Exams';
          newRecord.status = extracted.status === 'ALERT' ? 'Attention Required' : 'Normal';
          newRecord.provider = extracted.doctor_name || t('medical.aiSmartScan');
          newRecord.results = extracted.results || [];
        } else if (extracted.category === 'Consultations') {
          newRecord.doctorName = extracted.doctor_name || t('medical.identifiedViaScan');
          newRecord.specialty = extracted.specialty || t('medical.general');
          newRecord.status = 'Completed';
          newRecord.location = t('medical.digitizedDocument');
          newRecord.reason = extracted.title || t('medical.consultation');
          newRecord.prescriptions = extracted.prescriptions?.map((p: any) => ({
            ...p,
            id: Math.random().toString(36).substr(2, 9),
            prescribingDoctor: extracted.doctor_name || 'Scan'
          })) || [];
        } else if (extracted.category === 'Medical Certificate') {
          newRecord.category = 'Medical Certificate';
          newRecord.certificateInfo = {
            institution: extracted.certificate_info?.institution || t('medical.institutionPlaceholder'),
            patientName: extracted.certificate_info?.patient_name === 'User_ID_Alpha' ? profile.name : (extracted.certificate_info?.patient_name || profile.name),
            isPatientConfirmed: extracted.certificate_info?.is_patient_confirmed || false,
            cid: extracted.certificate_info?.cid,
            diagnosis: extracted.certificate_info?.diagnosis,
            leavePeriod: extracted.certificate_info?.leave_period ? {
              value: extracted.certificate_info.leave_period.value,
              unit: extracted.certificate_info.leave_period.unit,
              startDate: extracted.certificate_info.leave_period.start_date,
              endDate: extracted.certificate_info.leave_period.end_date,
            } : undefined,
            doctorCRM: extracted.doctor_crm || t('medical.notIdentified'),
            doctorName: extracted.doctor_name || t('medical.notIdentified')
          };
          
          if (newRecord.certificateInfo.leavePeriod) {
            setMedicalLeavePrompt({
              isOpen: true,
              recordId: newRecord.id,
              days: newRecord.certificateInfo.leavePeriod.value,
              unit: newRecord.certificateInfo.leavePeriod.unit
            });
          }
        }

        if (extracted.metabolic_impact) {
          newRecord.metabolicAdjustment = true;
        }

        addHistoryRecord(newRecord);
      }
      
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
        setScanStatus("");
      }, 1000);

    } catch (error) {
      console.error("Smart Scan Error:", error);
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus(t('medical.processingError'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        const fileArray = Array.from(files) as File[];
        const processedFiles: { data: string, name: string, type: string }[] = [];

        for (const file of fileArray) {
          const rawData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });

          const data = await compressImageIfNeeded(rawData);

          let fileType = file.type;
          if (!fileType || fileType === 'application/octet-stream') {
            if (file.name.toLowerCase().endsWith('.pdf') || data.startsWith('data:application/pdf')) {
              fileType = 'application/pdf';
            } else if (file.name.toLowerCase().endsWith('.txt') || data.startsWith('data:text/plain')) {
              fileType = 'text/plain';
            } else {
              fileType = 'image/jpeg';
            }
          }

          processedFiles.push({ data, name: file.name, type: fileType });
        }

        if (selectedRecordForFile) {
          handleSmartScan(processedFiles, selectedRecordForFile.id);
          setSelectedRecordForFile(null);
        } else {
          handleSmartScan(processedFiles);
        }
      } catch (err) {
        console.error("Error reading file in Medical component:", err);
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleViewFile = (record: HistoryRecord) => {
    setSelectedRecordForFile(record);
    setIsViewingFile(true);
  };

  // Get categories that have records
  const categoriesWithRecords = Array.from(new Set(historyRecords.map(r => r.category)));
  
  const filteredRecords = selectedCategory === 'All' 
    ? historyRecords 
    : historyRecords.filter(r => r.category === selectedCategory);

  // Grouping logic for consolidation
  const medications = historyRecords.filter(r => r.category === 'Continuous Medication');
  const bpLogs = historyRecords.filter(r => r.category === 'Routine Vitals' && (r as any).subtype === 'Blood Pressure');
  const glucoseLogs = historyRecords.filter(r => r.category === 'Routine Vitals' && (r as any).subtype === 'Glucose');
  
  const getConsolidatedRecords = () => {
    if (selectedCategory === 'Continuous Medication') {
      return [{ id: 'master-medications', type: 'master-medications' }];
    }
    if (selectedCategory === 'Routine Vitals') {
      const result = [];
      if (bpLogs.length > 0) result.push({ id: 'master-bp', type: 'master-bp' });
      if (glucoseLogs.length > 0) result.push({ id: 'master-glucose', type: 'master-glucose' });
      
      // Add other vitals that are not BP or Glucose
      const otherVitals = historyRecords.filter(r => r.category === 'Routine Vitals' && (r as any).subtype !== 'Blood Pressure' && (r as any).subtype !== 'Glucose');
      return [...result, ...otherVitals];
    }
    if (selectedCategory === 'All') {
      const result: any[] = [];
      
      // Add master cards if they have data
      if (medications.length > 0) result.push({ id: 'master-medications', type: 'master-medications' });
      if (bpLogs.length > 0) result.push({ id: 'master-bp', type: 'master-bp' });
      if (glucoseLogs.length > 0) result.push({ id: 'master-glucose', type: 'master-glucose' });
      
      // Add all other records individually
      const others = historyRecords.filter(r => 
        r.category !== 'Continuous Medication' && 
        !(r.category === 'Routine Vitals' && ((r as any).subtype === 'Blood Pressure' || (r as any).subtype === 'Glucose'))
      );
      
      return [...result, ...others];
    }
    
    return filteredRecords;
  };

  const consolidatedRecords = getConsolidatedRecords();

  const categories: HistoryCategory[] = ['Medical History', 'Exams', 'Consultations', 'Continuous Medication', 'Routine Vitals', 'Emergency', 'Family History', 'Stress Reports'];

  const getCategoryIcon = (category: HistoryCategory) => {
    switch (category) {
      case 'Medical History': return <Activity className="size-4" />;
      case 'Exams': return <FileText className="size-4" />;
      case 'Consultations': return <Stethoscope className="size-4" />;
      case 'Continuous Medication': return <Medication className="size-4" />;
      case 'Routine Vitals': return <Heart className="size-4" />;
      case 'Emergency': return <AlertCircle className="size-4" />;
      case 'Family History': return <Users className="size-4" />;
      case 'Stress Reports': return <ShieldAlert className="size-4" />;
    }
  };

  const getCategoryLabel = (category: HistoryCategory) => {
    switch (category) {
      case 'Medical History': return t('medical.history');
      case 'Exams': return t('medical.exams');
      case 'Consultations': return t('medical.consultations');
      case 'Continuous Medication': return t('medical.continuous');
      case 'Routine Vitals': return t('medical.vitals');
      case 'Emergency': return t('medical.emergency');
      case 'Family History': return t('medical.familyHistory');
      case 'Stress Reports': return t('medical.stressReports');
    }
  };

  const getCategoryColor = (category: HistoryCategory) => {
    switch (category) {
      case 'Medical History': return 'bg-blue-100 text-blue-600';
      case 'Exams': return 'bg-amber-100 text-amber-600';
      case 'Consultations': return 'bg-emerald-100 text-emerald-600';
      case 'Continuous Medication': return 'bg-indigo-100 text-indigo-600';
      case 'Routine Vitals': return 'bg-rose-100 text-rose-600';
      case 'Emergency': return 'bg-red-100 text-red-600';
      case 'Family History': return 'bg-purple-100 text-purple-600';
      case 'Stress Reports': return 'bg-orange-100 text-orange-600';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col min-h-full bg-white dark:bg-slate-950"
    >
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 px-6 pt-8 pb-4">
        {isScanning && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${scanProgress}%` }}
              className="h-full bg-primary"
            />
            <div className="absolute top-[-20px] left-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
                PROGRESS_BAR: [{Array(Math.floor(scanProgress/10)).fill('|').join('')}{Array(10-Math.floor(scanProgress/10)).fill('-').join('')}] {scanProgress}% - {scanStatus}
              </span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{t('nav.medical')}</h1>
            <button 
              onClick={() => {
                setAddingCategory(null);
                setIsAddModalOpen(true);
              }}
              className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Plus className="size-5" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
            >
              <Paperclip className="size-3" />
              {t('medical.smartScan')}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              selectedCategory === 'All' 
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
            )}
          >
            {t('common.allRecords')}
          </button>
          {categories.filter(cat => historyRecords.some(r => r.category === cat)).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2",
                selectedCategory === cat 
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
              )}
            >
              {getCategoryIcon(cat)}
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-6 py-6 space-y-6 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'medical' && (
            <motion.div
              key="medical"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {consolidatedRecords.length === 0 ? (
                <div className="text-center py-20">
                  <div className="size-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <FileText className="size-10" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">No records found</h3>
                  <p className="text-sm text-slate-500 max-w-[240px] mx-auto">
                    Start by adding your first medical record using the button below.
                  </p>
                </div>
              ) : (
                consolidatedRecords.map((item: any) => {
                  if (item.type === 'master-medications') {
                    return (
                      <MedicationsMasterCard 
                        key="master-medications" 
                        medications={medications} 
                        onClick={() => setActiveDashboard('medications')}
                      />
                    );
                  }
                  if (item.type === 'master-bp') {
                    return (
                      <VitalsMasterCard 
                        key="master-bp" 
                        type="Blood Pressure" 
                        logs={bpLogs} 
                        onClick={() => setActiveDashboard('bp')}
                      />
                    );
                  }
                  if (item.type === 'master-glucose') {
                    return (
                      <VitalsMasterCard 
                        key="master-glucose" 
                        type="Glucose" 
                        logs={glucoseLogs} 
                        onClick={() => setActiveDashboard('glucose')}
                      />
                    );
                  }
                  
                  return (
                    <RecordCard 
                      key={item.id} 
                      record={item} 
                      onDelete={() => deleteHistoryRecord(item.id)}
                      onUpdate={updateHistoryRecord}
                      onAddNote={() => setActiveNotesRecordId(item.id)}
                      onFileAttach={handleFileAttach}
                      onViewFile={handleViewFile}
                      icon={getCategoryIcon(item.category)}
                      color={getCategoryColor(item.category)}
                    />
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'workouts' && (
            <motion.div
              key="workouts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {gymLogs.length === 0 ? (
                <div className="text-center py-20">
                  <div className="size-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <FitnessCenter className="size-10" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">No workouts yet</h3>
                  <p className="text-sm text-slate-500 max-w-[240px] mx-auto">
                    Log your gym sessions in the Exercises section to see them here.
                  </p>
                </div>
              ) : (
                gymLogs.map((log) => (
                  <div key={log.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-xl text-primary">
                          <FitnessCenter className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100">{log.exerciseName}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(log.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full">{log.caloriesBurned} kcal</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {log.sets.map((set, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Set {idx + 1}</span>
                          <span className="text-sm font-bold">{set.weight}kg × {set.reps}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {activeDashboard === 'medications' && (
          <MedicationsDashboard 
            medications={medications} 
            onClose={() => setActiveDashboard(null)}
            onUpdate={updateHistoryRecord}
            onDelete={deleteHistoryRecord}
            onAdd={() => {
              setAddingCategory('Continuous Medication');
              setIsAddModalOpen(true);
            }}
          />
        )}
        {(activeDashboard === 'bp' || activeDashboard === 'glucose') && (
          <VitalsDashboard 
            type={activeDashboard === 'bp' ? 'Blood Pressure' : 'Glucose'}
            logs={activeDashboard === 'bp' ? bpLogs : glucoseLogs}
            onClose={() => setActiveDashboard(null)}
            onUpdate={updateHistoryRecord}
            onDelete={deleteHistoryRecord}
            filterDate={dashboardFilterDate}
            onFilterDateChange={setDashboardFilterDate}
            onAdd={() => {
              setAddingCategory('Routine Vitals');
              setPreSelectedSubtype(activeDashboard === 'bp' ? 'Blood Pressure' : 'Glucose');
              setIsAddModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Add Record Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-[95%] sm:w-full max-w-md mx-auto rounded-t-[2.5rem] sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] shadow-2xl overflow-hidden mb-safe"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xl font-bold">
                  {!addingCategory ? 'Add Record' : `New ${addingCategory}`}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAddingCategory(null);
                  }} 
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pb-12">
                {!addingCategory ? (
                  <div className="grid grid-cols-1 gap-3">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setAddingCategory(cat)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group"
                      >
                        <div className={cn("size-12 rounded-2xl flex items-center justify-center", getCategoryColor(cat))}>
                          {getCategoryIcon(cat)}
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-sm block">{cat}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">New Entry</span>
                        </div>
                        <ChevronRight className="size-5 ml-auto text-slate-300 group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setAddingCategory(null)}
                      className="text-xs font-bold text-primary mb-6 flex items-center gap-1"
                    >
                      <ChevronRight className="size-3 rotate-180" />
                      Back to Categories
                    </button>
                    
                    {addingCategory === 'Medical History' ? (
                      <HealthConditionsManager onComplete={() => setIsAddModalOpen(false)} />
                    ) : (
                      <HistoryForm 
                        category={addingCategory} 
                        initialData={preSelectedSubtype ? { subtype: preSelectedSubtype } : undefined}
                        onComplete={() => {
                          setIsAddModalOpen(false);
                          setAddingCategory(null);
                          setPreSelectedSubtype(null);
                        }} 
                        onCancel={() => {
                          setAddingCategory(null);
                          setPreSelectedSubtype(null);
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notes Modal */}
      <AnimatePresence>
        {activeNotesRecordId && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-[95%] sm:w-full max-w-md mx-auto rounded-t-[2.5rem] p-8 pb-12 shadow-2xl mb-safe"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold">Record Notes</h3>
                <button onClick={() => setActiveNotesRecordId(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>
              
              {historyRecords.find(r => r.id === activeNotesRecordId) && (
                <NotesPanel 
                  record={historyRecords.find(r => r.id === activeNotesRecordId)!}
                  onClose={() => setActiveNotesRecordId(null)}
                  onUpdate={updateHistoryRecord}
                />
              )}
            </motion.div>
          </div>
        )}
        {isViewingFile && selectedRecordForFile && (
          <FileViewerModal 
            record={selectedRecordForFile}
            onClose={() => {
              setIsViewingFile(false);
              setSelectedRecordForFile(null);
            }}
            onDelete={() => {
              updateHistoryRecord(selectedRecordForFile.id, { attachmentUrl: undefined, files: [] });
              setIsViewingFile(false);
              setSelectedRecordForFile(null);
            }}
            onReplace={() => {
              setIsViewingFile(false);
              fileInputRef.current?.click();
            }}
            onUpdate={(updates: any) => {
              updateHistoryRecord(selectedRecordForFile.id, updates);
            }}
          />
        )}
      </AnimatePresence>

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf,.pdf,text/plain,.txt,.doc,.docx"
        className="hidden"
        multiple
      />
    </motion.div>
  );
}

function MedicationsMasterCard({ medications, onClick }: { key?: string; medications: HistoryRecord[], onClick: () => void }) {
  const activeMeds = medications.filter(m => (m as any).isActive);
  
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-[calc(100%-32px)] mx-4 bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:border-primary/20 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Medication className="size-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">My Medications</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medicine Cabinet</p>
          </div>
        </div>
        <ChevronRight className="size-5 text-slate-300" />
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
          {activeMeds.length} Active
        </div>
        <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
          {medications.length} Total
        </div>
      </div>

      <div className="flex -space-x-2 overflow-hidden">
        {activeMeds.slice(0, 5).map((med, idx) => (
          <div key={idx} className="size-8 rounded-full bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-indigo-500 shadow-sm">
            {(med as any).medicationName.charAt(0)}
          </div>
        ))}
        {activeMeds.length > 5 && (
          <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400">
            +{activeMeds.length - 5}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VitalsMasterCard({ type, logs, onClick }: { key?: string; type: 'Blood Pressure' | 'Glucose', logs: HistoryRecord[], onClick: () => void }) {
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const isBP = type === 'Blood Pressure';
  
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-[calc(100%-32px)] mx-4 bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:border-primary/20 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("size-12 rounded-2xl flex items-center justify-center", isBP ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
            {isBP ? <Heart className="size-6" /> : <Activity className="size-6" />}
          </div>
          <div>
            <h3 className="font-bold text-lg">{type} Logs</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Routine Vitals</p>
          </div>
        </div>
        <ChevronRight className="size-5 text-slate-300" />
      </div>

      {lastLog ? (
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Last Reading</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {isBP 
                  ? `${(lastLog as any).bloodPressure.systolic}/${(lastLog as any).bloodPressure.diastolic}` 
                  : (lastLog as any).glucose.value}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {isBP ? 'mmHg' : 'mg/dL'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</span>
            <p className="text-xs font-bold">{new Date(lastLog.date).toLocaleDateString()}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No logs recorded yet.</p>
      )}
    </motion.div>
  );
}

function MedicationsDashboard({ medications, onClose, onUpdate, onDelete, onAdd }: { 
  medications: HistoryRecord[], 
  onClose: () => void, 
  onUpdate: (id: string, data: Partial<HistoryRecord>) => void,
  onDelete: (id: string) => void,
  onAdd: () => void
}) {
  const { t, adherenceLogs, toggleAdherence, events } = useHealth();
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Generate days for the mini calendar based on filterDate
  const getWeekDays = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day;
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(date);
      d.setDate(diff + i);
      return d;
    });
  };

  const weekDays = getWeekDays(filterDate);

  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayEvents = events.filter(e => e.date === dateStr && e.type === 'medication');
    if (dayEvents.length === 0) return 'none';
    
    const taken = dayEvents.filter(e => e.status === 'taken').length;
    const missed = dayEvents.filter(e => e.status === 'missed').length;
    
    if (taken === dayEvents.length) return 'all-taken';
    if (missed > 0) return 'missed';
    if (taken > 0) return 'partial';
    return 'pending';
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[80] bg-white dark:bg-slate-950 flex flex-col w-full max-w-md mx-auto overflow-x-hidden"
    >
      <header className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">My Medications</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medicine Cabinet</p>
          </div>
        </div>
        <button 
          onClick={onAdd}
          className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Plus className="size-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-32">
        {/* Mini Calendar Grid */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">Adherence Log</span>
            </div>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-white dark:bg-slate-800 border-none rounded-xl px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none shadow-sm"
            />
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[8px] font-bold text-slate-400 uppercase">{day}</div>
            ))}
            {weekDays.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isSelected = dateStr === filterDate;
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const status = getDayStatus(date);

              return (
                <button
                  key={i}
                  onClick={() => setFilterDate(dateStr)}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative",
                    isSelected ? "bg-primary text-white shadow-md" : 
                    isToday ? "bg-primary/10 text-primary" : "hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-[10px] font-bold">{date.getDate()}</span>
                  {status !== 'none' && (
                    <div className={cn(
                      "size-1 rounded-full absolute bottom-1.5",
                      status === 'all-taken' ? "bg-emerald-500" :
                      status === 'missed' ? "bg-rose-500" :
                      status === 'partial' ? "bg-amber-500" :
                      "bg-slate-300"
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed text-center">
            Status for <span className="font-bold text-primary">{new Date(filterDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Daily Schedule</h3>
            <span className="text-[10px] font-bold text-slate-400">{new Date(filterDate).toLocaleDateString()}</span>
          </div>
          
          {events.filter(e => e.date === filterDate && e.type === 'medication').length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 italic">No scheduled doses for this day.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .filter(e => e.date === filterDate && e.type === 'medication')
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(event => (
                  <div 
                    key={event.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {event.time}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{event.title}</h4>
                        <p className="text-[10px] text-slate-500">{event.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAdherence(event.linkedId!, event.date, event.time, 'taken')}
                        className={cn(
                          "size-8 rounded-lg flex items-center justify-center transition-all",
                          event.status === 'taken' 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600"
                        )}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        onClick={() => toggleAdherence(event.linkedId!, event.date, event.time, 'missed')}
                        className={cn(
                          "size-8 rounded-lg flex items-center justify-center transition-all",
                          event.status === 'missed' 
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
                        )}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2 mt-8">All Medications</h3>
          {medications.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Medication className="size-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No medications registered.</p>
            </div>
          ) : (
            medications.map(med => (
              <RecordCard 
                key={med.id} 
                record={med} 
                onDelete={() => onDelete(med.id)}
                onUpdate={onUpdate}
                onAddNote={() => {}}
                onFileAttach={() => {}}
                onViewFile={() => {}}
                icon={<Medication className="size-4" />}
                color="bg-indigo-100 text-indigo-600"
              />
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VitalsDashboard({ type, logs, onClose, onUpdate, onDelete, onAdd, filterDate, onFilterDateChange }: { 
  type: 'Blood Pressure' | 'Glucose', 
  logs: HistoryRecord[], 
  onClose: () => void, 
  onUpdate: (id: string, data: Partial<HistoryRecord>) => void,
  onDelete: (id: string) => void,
  onAdd: () => void,
  filterDate: string,
  onFilterDateChange: (date: string) => void
}) {
  const isBP = type === 'Blood Pressure';
  
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.date).toISOString().split('T')[0];
    return logDate === filterDate;
  });

  const chartData = logs.slice(-7).map(log => ({
    date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    ...(isBP ? {
      systolic: (log as any).bloodPressure.systolic,
      diastolic: (log as any).bloodPressure.diastolic
    } : {
      value: (log as any).glucose.value
    })
  }));

  // Generate days for the mini calendar based on filterDate
  const getWeekDays = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day;
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(date);
      d.setDate(diff + i);
      return d;
    });
  };

  const weekDays = getWeekDays(filterDate);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[80] bg-white dark:bg-slate-950 flex flex-col w-full max-w-md mx-auto overflow-x-hidden"
    >
      <header className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">{type} Logs</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Routine Vitals</p>
          </div>
        </div>
        <button 
          onClick={onAdd}
          className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Plus className="size-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-32">
        {/* Mini Calendar Grid for Vitals */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">History Navigator</span>
            </div>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => onFilterDateChange(e.target.value)}
              className="bg-white dark:bg-slate-800 border-none rounded-xl px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none shadow-sm"
            />
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[8px] font-bold text-slate-400 uppercase">{day}</div>
            ))}
            {weekDays.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isSelected = dateStr === filterDate;
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const hasLog = logs.some(l => new Date(l.date).toISOString().split('T')[0] === dateStr);

              return (
                <button
                  key={i}
                  onClick={() => onFilterDateChange(dateStr)}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative",
                    isSelected ? "bg-primary text-white shadow-md" : 
                    isToday ? "bg-primary/10 text-primary" : "hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-[10px] font-bold">{date.getDate()}</span>
                  {hasLog && (
                    <div className="size-1 rounded-full bg-primary absolute bottom-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed text-center">
            Viewing logs for <span className="font-bold text-primary">{new Date(filterDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">Trend Analysis</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 7</span>
          </div>
          
          <div className="h-40 sm:h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {isBP ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="diastolic" stroke="#fb7185" strokeWidth={2} dot={{ r: 3, fill: '#fb7185' }} activeDot={{ r: 5 }} />
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest">History Filter</span>
            </div>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => onFilterDateChange(e.target.value)}
              className="bg-white dark:bg-slate-800 border-none rounded-xl px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none shadow-sm"
            />
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[8px] font-bold text-slate-400 uppercase">{day}</div>
            ))}
            {weekDays.map((date, i) => {
              const isSelected = date.toISOString().split('T')[0] === filterDate;
              const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={i}
                  onClick={() => onFilterDateChange(date.toISOString().split('T')[0])}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                    isSelected ? "bg-primary text-white shadow-md" : 
                    isToday ? "bg-primary/10 text-primary" : "hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-[10px] font-bold">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">
            Readings
          </h3>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Activity className="size-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No readings for this date.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredLogs.map(log => (
                <RecordCard 
                  key={log.id} 
                  record={log} 
                  onDelete={() => onDelete(log.id)}
                  onUpdate={onUpdate}
                  onAddNote={() => {}}
                  onFileAttach={() => {}}
                  onViewFile={() => {}}
                  icon={isBP ? <Heart className="size-4" /> : <Activity className="size-4" />}
                  color={isBP ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface RecordCardProps {
  key?: string | number;
  record: HistoryRecord;
  onDelete: () => void;
  onUpdate: (id: string, record: Partial<HistoryRecord>) => void;
  onAddNote: () => void;
  onFileAttach: (record: HistoryRecord) => void;
  onViewFile: (record: HistoryRecord) => void;
  icon: React.ReactNode;
  color: string;
}

function RecordCard({ record, onDelete, onUpdate, onAddNote, onFileAttach, onViewFile, icon, color }: RecordCardProps) {
  const { t } = useHealth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden transition-all",
      record.priority ? "border-red-200 dark:border-red-900/50 ring-1 ring-red-100 dark:ring-red-900/20" : "border-slate-100 dark:border-slate-800"
    )}>
      {record.priority && (
        <div className="bg-red-500 text-white text-[8px] font-bold uppercase tracking-[0.2em] py-1 text-center">
          {t('common.priorityCase')}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={cn("size-12 rounded-2xl flex items-center justify-center", color)}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                {'conditionName' in record ? record.conditionName : 
                 'examName' in record ? record.examName : 
                 'doctorName' in record ? `Consultation: ${record.doctorName}` : 
                 'medicationName' in record ? record.medicationName :
                 'subtype' in record ? record.subtype :
                 'bloodType' in record ? 'Emergency Health Profile' : 
                 'relativeName' in record ? `${record.relativeName}'s History` : 
                 'stressLevel' in record ? `Stress Level: ${record.stressLevel}/10` : 'Record'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.category}</span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(record.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
            >
              <Edit3 className="size-4" />
            </button>
            <button 
              onClick={onDelete}
              className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {'status' in record && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</span>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                record.status === 'Active' || record.status === 'Abnormal' || record.status === 'Canceled' ? "bg-red-100 text-red-600" :
                record.status === 'Controlled' || record.status === 'Normal' || record.status === 'Completed' ? "bg-emerald-100 text-emerald-600" :
                record.status === 'Recovered' || record.status === 'Pending Results' || record.status === 'Scheduled' ? "bg-blue-100 text-blue-600" : 
                record.status === 'Attention Required' ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"
              )}>
                {record.status}
              </span>
            </div>
          )}

          {'medicationName' in record && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.dosageSchedule')}</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{(record as any).dosage}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(record as any).times && (record as any).times.map((t: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <Clock className="size-3 text-slate-400" /> {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {'subtype' in record && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.measurement')}</span>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{(record as any).subtype}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                {record.subtype === 'Blood Pressure' && (record as any).bloodPressure && (
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">SYS</span>
                      <span className="text-sm font-bold">{(record as any).bloodPressure.systolic}</span>
                    </div>
                    <div className="text-slate-300">/</div>
                    <div className="text-center">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">DIA</span>
                      <span className="text-sm font-bold">{(record as any).bloodPressure.diastolic}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200 mx-2" />
                    <div className="text-center">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">PULSE</span>
                      <span className="text-sm font-bold">{(record as any).bloodPressure.pulse}</span>
                    </div>
                  </div>
                )}
                {record.subtype === 'Glucose' && (record as any).glucose && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">Value</span>
                      <span className="text-sm font-bold">{(record as any).glucose.value} mg/dL</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">{(record as any).glucose.state}</span>
                  </div>
                )}
                {record.subtype === 'Other' && (record as any).other && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">{(record as any).other.metric}</span>
                      <span className="text-sm font-bold">{(record as any).other.value}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {'specialty' in record && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.specialty')}</span>
              <span className="text-xs font-bold">{record.specialty}</span>
            </div>
          )}

          {'examCategory' in record && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.category')}</span>
              <span className="text-xs font-bold">{record.examCategory}</span>
            </div>
          )}

          {'bloodType' in record && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.bloodType')}</span>
              <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold">{record.bloodType}</span>
            </div>
          )}

          {'relationship' in record && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.relationship')}</span>
              <span className="text-xs font-bold">{record.relationship}</span>
            </div>
          )}

          {'stressLevel' in record && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.stressLevel')}</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                  record.stressLevel >= 8 ? "bg-red-100 text-red-600" :
                  record.stressLevel >= 5 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {record.stressLevel}/10
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    record.stressLevel >= 8 ? "bg-red-500" :
                    record.stressLevel >= 5 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${record.stressLevel * 10}%` }}
                />
              </div>
            </div>
          )}

          {record.criticalMarkers && record.criticalMarkers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {record.criticalMarkers.map((marker, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-md text-[8px] font-bold uppercase tracking-wider border border-red-100 flex items-center gap-1">
                  <AlertTriangle className="size-2" />
                  {marker}
                </span>
              ))}
            </div>
          )}

          {'criticalConditions' in record && record.criticalConditions && record.criticalConditions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {record.criticalConditions.map((cond, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-md text-[8px] font-bold uppercase tracking-wider border border-red-100">
                  {cond}
                </span>
              ))}
            </div>
          )}

          {'conditions' in record && record.conditions && record.conditions.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t('common.conditions')}</span>
              <div className="flex flex-wrap gap-1">
                {record.conditions.slice(0, 3).map((cond, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-[8px] font-bold uppercase tracking-wider border border-purple-100">
                    {cond.condition}
                  </span>
                ))}
                {record.conditions && record.conditions.length > 3 && (
                  <span className="text-[8px] font-bold text-slate-400">+ {record.conditions.length - 3} more</span>
                )}
              </div>
            </div>
          )}

          {'results' in record && record.results && record.results.length > 0 && (
            <div className="mt-2 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Key Results</span>
              <div className="grid grid-cols-2 gap-2">
                {record.results.slice(0, 4).map((res, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-medium truncate">{res.name}</p>
                    <p className="text-xs font-bold">{res.value} <span className="text-[10px] font-normal text-slate-500">{res.unit}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {'isActive' in record && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={cn("size-2 rounded-full", record.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{record.isActive ? 'Active Treatment' : 'Treatment Closed'}</span>
              </div>
              {record.isActive && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(record.id, { ...record, isActive: false });
                  }}
                  className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-100 transition-colors"
                >
                  Close Treatment
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button 
              id="btn-view-details"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border transition-all",
                isExpanded 
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-600" 
                  : "bg-primary/5 text-primary dark:bg-primary/10 border-primary/10"
              )}
            >
              {isExpanded ? t('common.hideDetails') : t('common.viewDetails')}
            </button>
            <button 
              onClick={() => {
                const hasFile = ('attachmentUrl' in record && record.attachmentUrl) || ('files' in record && record.files && record.files.length > 0);
                if (hasFile) {
                  onViewFile(record);
                } else {
                  onFileAttach(record);
                }
              }}
              className="py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Paperclip className="size-3" />
              {('attachmentUrl' in record && record.attachmentUrl) || ('files' in record && record.files && record.files.length > 0) ? t('common.viewAttachedFile') : t('common.attachFile')}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5 border-t border-slate-50 dark:border-slate-800 pt-4"
          >
            <div className="space-y-4">
              {'medicationName' in record && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {(record as any).prescriptionDate && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('common.prescriptionDate')}</span>
                        <p className="text-xs font-bold">{new Date((record as any).prescriptionDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {(record as any).validityDate && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('common.validity')}</span>
                        <p className="text-xs font-bold">{new Date((record as any).validityDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  {(record as any).aiInsights && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="size-4 text-indigo-500" />
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{t('medical.aiInsightsCare')}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {(record as any).aiInsights}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {'bloodType' in record && (
                <div className="space-y-4">
                  {/* Allergies */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t('medical.allergies')}</span>
                    <div className="grid grid-cols-1 gap-2">
                    {record.allergies && record.allergies.medication && record.allergies.medication.length > 0 && (
                        <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                          <p className="text-[10px] font-bold text-red-600 uppercase mb-1">{t('medical.medication')}</p>
                          <p className="text-xs">{record.allergies.medication.join(', ')}</p>
                        </div>
                      )}
                      {record.allergies && record.allergies.food && record.allergies.food.length > 0 && (
                        <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                          <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">{t('medical.food')}</p>
                          <p className="text-xs">{record.allergies.food.join(', ')}</p>
                        </div>
                      )}
                      {record.allergies && record.allergies.environmental && record.allergies.environmental.length > 0 && (
                        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">{t('medical.environmental')}</p>
                          <p className="text-xs">{record.allergies.environmental.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>

          {'emergencyContacts' in record && record.emergencyContacts && record.emergencyContacts.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t('medical.emergencyContacts')}</span>
                      <div className="space-y-2">
                        {record.emergencyContacts.map((contact, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-bold">{contact.name}</p>
                                <p className="text-[10px] font-bold text-primary uppercase">{contact.relationship}</p>
                              </div>
                              {contact.isPrimary && (
                                <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-bold uppercase rounded-md">{t('medical.primary')}</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Phone className="size-3" />
                                {contact.phone}
                              </div>
                              {contact.email && (
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                  <Mail className="size-3" />
                                  {contact.email}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Organ Donor & Instructions */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.organDonor')}</span>
                      <p className="text-xs font-bold">{record.organDonorStatus}</p>
                    </div>
                    {record.emergencyInstructions && (
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">{t('medical.emergencyInstructions')}</span>
                        <p className="text-xs italic">"{record.emergencyInstructions}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {'relativeName' in record && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.ageStatus')}</span>
                      <p className="text-xs font-bold">{record.age} {t('medical.years')} • {record.isLiving ? t('medical.living') : t('medical.deceased')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.relationship')}</span>
                      <p className="text-xs font-bold">{record.relationship}</p>
                    </div>
                  </div>

                  {'conditions' in record && record.conditions && record.conditions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t('medical.detailedConditions')}</span>
                      <div className="space-y-2">
                        {record.conditions.map((cond, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-bold">{cond.condition}</p>
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-bold uppercase rounded-md border border-purple-100">
                                {cond.category}
                              </span>
                            </div>
                            {cond.ageAtOnset && (
                              <p className="text-[10px] text-slate-500 mb-2">{t('medical.diagnosedAt')} {cond.ageAtOnset}</p>
                            )}
                            {cond.cancerDetails && (
                              <div className="mt-2 p-2 bg-red-50/30 rounded-lg border border-red-100/50">
                                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">{t('medical.oncologyDetails')}</p>
                                <p className="text-[10px]"><span className="font-bold">{t('medical.type')}:</span> {cond.cancerDetails.type}</p>
                                <p className="text-[10px]"><span className="font-bold">{t('medical.organ')}:</span> {cond.cancerDetails.affectedOrgan}</p>
                              </div>
                            )}
                            {cond.notes && (
                              <p className="text-[10px] text-slate-400 italic mt-2">"{cond.notes}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {'stressLevel' in record && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.mood')}</span>
                      <p className="text-xs font-bold">{record.mood}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.sleepQuality')}</span>
                      <p className="text-xs font-bold">{record.sleepQuality}</p>
                    </div>
                  </div>
                  {'triggers' in record && record.triggers && record.triggers.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.triggers')}</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {record.triggers.map((trigger, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-bold border border-slate-100 dark:border-slate-800">
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {'physicalSymptoms' in record && record.physicalSymptoms && record.physicalSymptoms.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.physicalSymptoms')}</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {record.physicalSymptoms.map((symptom, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-bold border border-slate-100 dark:border-slate-800">
                            {symptom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'location' in record && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('medical.location')}</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3 text-slate-400" />
                    <span className="text-xs font-bold">{record.location}</span>
                  </div>
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'reason' in record && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('medical.reasonVisit')}</span>
                  <p className="text-xs font-medium">{record.reason}</p>
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'diagnosis' in record && record.diagnosis && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">{t('medical.diagnosis')}</span>
                  <p className="text-xs font-bold text-primary">{record.diagnosis}</p>
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'treatmentPlan' in record && record.treatmentPlan && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t('medical.treatmentPlan')}</span>
                  <div className="grid grid-cols-1 gap-2">
                    {record.treatmentPlan.medication && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex items-start gap-3">
                        <Medication className="size-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('medical.medication')}</p>
                          <p className="text-xs">{record.treatmentPlan.medication}</p>
                        </div>
                      </div>
                    )}
                    {record.treatmentPlan.lifestyle && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex items-start gap-3">
                        <Activity className="size-4 text-emerald-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('medical.lifestyle')}</p>
                          <p className="text-xs">{record.treatmentPlan.lifestyle}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {'prescriptions' in record && record.prescriptions && record.prescriptions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t('medical.prescriptions')}</span>
                  <div className="space-y-2">
                    {record.prescriptions.map((p, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold">{p.medicationName}</p>
                          <span className="text-[10px] font-bold text-primary">{p.dosage}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">{p.frequency} • {p.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'followUpDate' in record && record.followUpDate && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center gap-2">
                    <CalendarPlus className="size-4 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{t('medical.followUp')}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{new Date(record.followUpDate).toLocaleDateString()}</span>
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'provider' in record && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('medical.providerLab')}</span>
                  <span className="text-xs font-bold">{record.provider}</span>
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'doctorResponsible' in record && record.doctorResponsible && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('medical.doctor')}</span>
                  <span className="text-xs font-bold">{record.doctorResponsible}</span>
                </div>
              )}

              {record.category !== 'Medical Certificate' && 'results' in record && record.results && record.results.length > 4 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t('medical.allResults')}</span>
                  <div className="space-y-1">
                    {record.results.map((res, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <span className="text-xs">{res.name}</span>
                        <div className="text-right">
                          <span className="text-xs font-bold">{res.value} {res.unit}</span>
                          {res.referenceRange && <p className="text-[8px] text-slate-400">{t('medical.ref')} {res.referenceRange}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {record.category === 'Medical Certificate' && record.certificateInfo && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('medical.cidDiagnosis')}</p>
                      <p className="text-xs font-bold">{record.certificateInfo.cid || t('medical.na')}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('medical.period')}</p>
                      <p className="text-xs font-bold">
                        {record.certificateInfo.leavePeriod 
                          ? `${record.certificateInfo.leavePeriod.value} ${record.certificateInfo.leavePeriod.unit}` 
                          : t('medical.na')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('medical.doctor')}</p>
                      <p className="text-xs font-bold">{record.certificateInfo.doctorName || t('medical.na')}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('medical.crm')}</p>
                      <p className="text-xs font-bold">{record.certificateInfo.doctorCRM || t('medical.na')}</p>
                    </div>
                  </div>
                </div>
              )}

              {record.attachmentUrl && (
                <button 
                  onClick={() => window.open(record.attachmentUrl, '_blank')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all"
                >
                  <FileText className="size-4" />
                  {t('medical.viewAttachedDoc')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal Placeholder */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold">{t('medical.editRecord')}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>
              <HistoryForm 
                category={record.category} 
                initialData={record}
                onComplete={() => setIsEditModalOpen(false)} 
                onCancel={() => setIsEditModalOpen(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotesPanel({ record, onClose, onUpdate }: { record: HistoryRecord, onClose: () => void, onUpdate: (id: string, data: Partial<HistoryRecord>) => void }) {
  const { t } = useHealth();
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      text: newNote
    };
    onUpdate(record.id, {
      notes: [...(record.notes || []), note]
    });
    setNewNote('');
  };

  const handleDeleteNote = (noteId: string) => {
    onUpdate(record.id, {
      notes: record.notes?.filter(n => n.id !== noteId)
    });
  };

  const handleUpdateNote = (noteId: string) => {
    onUpdate(record.id, {
      notes: record.notes?.map(n => n.id === noteId ? { ...n, text: editText } : n)
    });
    setEditingNoteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">{t('medical.notesHistory')}</h4>
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
          {(!record.notes || record.notes.length === 0) ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">{t('medical.noNotesYet')}</p>
          ) : (
            record.notes.map((note) => (
              <div key={note.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-primary uppercase">{new Date(note.date).toLocaleDateString()}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditText(note.text);
                      }}
                      className="text-slate-400 hover:text-primary"
                    >
                      <Edit3 className="size-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <textarea 
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20 min-h-[60px]"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateNote(note.id)} className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg">{t('common.save')}</button>
                      <button onClick={() => setEditingNoteId(null)} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-[10px] font-bold rounded-lg">{t('common.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{note.text}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('medical.addNewNote')}</label>
        <textarea 
          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
          placeholder={t('medical.typeNoteHere')}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <button 
          onClick={handleAddNote}
          disabled={!newNote.trim()}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          <PlusCircle className="size-4" />
          {t('medical.addNote')}
        </button>
      </div>
    </div>
  );
}

function FileViewerModal({ record, onClose, onDelete, onReplace, onUpdate }: { 
  record: HistoryRecord, 
  onClose: () => void, 
  onDelete: () => void, 
  onReplace: () => void,
  onUpdate: (updates: Partial<HistoryRecord>) => void 
}) {
  const { t } = useHealth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(record.files?.[0]?.name || t('medical.document'));

  const file = record.files?.[0] || { url: record.attachmentUrl, name: t('medical.document'), type: 'image' };
  const isImage = file.type?.startsWith('image') || (!file.type && file.url?.startsWith('data:image'));
  const isPdf = file.type?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf') || (file.url && file.url.startsWith('data:application/pdf'));

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-900 w-[95%] sm:w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] mx-auto mb-safe"
        >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="size-5" />
            </div>
            <div>
              {isEditing ? (
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-primary/20 rounded-lg px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                  autoFocus
                />
              ) : (
                <h3 className="font-bold text-lg">{editName}</h3>
              )}
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{record.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button 
                onClick={() => {
                  const fileId = 'id' in file ? file.id : Math.random().toString(36).substr(2, 9);
                  onUpdate({ files: [{ ...file, name: editName, id: fileId }] });
                  setIsEditing(false);
                }}
                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-full"
              >
                <Check className="size-5" />
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-primary rounded-full">
                <Edit3 className="size-5" />
              </button>
            )}
            <button onClick={onReplace} className="p-2 text-slate-400 hover:text-primary rounded-full">
              <PlusCircle className="size-5" />
            </button>
            <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 rounded-full">
              <Trash2 className="size-5" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full ml-2">
              <X className="size-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 flex items-center justify-center min-h-[350px]">
          {isImage ? (
            <img src={file.url} alt={editName} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col gap-3 min-h-[420px]">
              <iframe 
                src={file.url} 
                title={editName} 
                className="w-full flex-1 min-h-[380px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner" 
              />
              <div className="flex justify-center">
                <a 
                  href={file.url} 
                  download={editName}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2"
                >
                  <FileText className="size-4" />
                  {t('medical.downloadFile')}
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="size-24 rounded-3xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-primary">
                <FileText className="size-12" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{editName}</p>
                <p className="text-xs text-slate-500 mt-1">{t('medical.docPreviewNotAvailable')}</p>
              </div>
              <a 
                href={file.url} 
                download={editName}
                className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20"
              >
                {t('medical.downloadFile')}
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
