import React, { useState, useRef } from 'react';
import { compressImageIfNeeded } from '../lib/imageCompressor';
import { 
  X, 
  Calendar, 
  FileText, 
  Stethoscope, 
  AlertCircle, 
  AlertTriangle,
  Heart,
  ShieldAlert,
  Users,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  PlusCircle,
  MapPin,
  Phone,
  Mail,
  Clock,
  Activity,
  Upload,
  Loader2,
  Sparkles
} from './Icons';
import { motion } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { 
  HistoryCategory, 
  ExamRecord, 
  ConsultationRecord, 
  EmergencyRecord, 
  FamilyHistoryRecord,
  ExamCategory,
  ExamStatus,
  BiomarkerResult
} from '../types';
import { cn } from '../lib/utils';
import { extractMedicalData, generateMedicationInsights } from '../lib/ai';

interface HistoryFormProps {
  category: HistoryCategory;
  initialData?: any;
  onComplete: () => void;
  onCancel: () => void;
}

const EXAM_CATEGORIES: ExamCategory[] = [
  'Blood Tests',
  'Hormonal Tests',
  'Cardiovascular Tests',
  'Imaging Exams',
  'Metabolic Tests',
  'Nutritional Biomarkers',
  'Kidney Function Tests',
  'Liver Function Tests',
  'Inflammatory Markers',
  'Genetic Tests',
  'Urine Tests',
  'Stool Tests',
  'Other Exams'
];

const BIOMARKERS_BY_CATEGORY: Record<string, { name: string; unit: string; ref?: string }[]> = {
  'Blood Tests': [
    { name: 'Hemoglobin', unit: 'g/dL', ref: '13.5-17.5' },
    { name: 'Hematocrit', unit: '%', ref: '41-50' },
    { name: 'Red Blood Cells', unit: 'million/uL', ref: '4.5-5.9' },
    { name: 'White Blood Cells', unit: 'cells/uL', ref: '4,500-11,000' },
    { name: 'Platelets', unit: 'cells/uL', ref: '150,000-450,000' },
  ],
  'Metabolic Tests': [
    { name: 'Glucose (Fasting)', unit: 'mg/dL', ref: '70-99' },
    { name: 'HbA1c', unit: '%', ref: '< 5.7' },
    { name: 'Insulin', unit: 'uIU/mL', ref: '2.6-24.9' },
    { name: 'HOMA-IR', unit: 'index', ref: '< 2.5' },
    { name: 'Total Cholesterol', unit: 'mg/dL', ref: '< 200' },
    { name: 'LDL Cholesterol', unit: 'mg/dL', ref: '< 100' },
    { name: 'HDL Cholesterol', unit: 'mg/dL', ref: '> 40' },
    { name: 'Triglycerides', unit: 'mg/dL', ref: '< 150' },
  ],
  'Liver Function Tests': [
    { name: 'AST (TGO)', unit: 'U/L', ref: '8-48' },
    { name: 'ALT (TGP)', unit: 'U/L', ref: '7-55' },
    { name: 'Gamma GT', unit: 'U/L', ref: '8-61' },
    { name: 'Alkaline Phosphatase', unit: 'U/L', ref: '40-129' },
    { name: 'Total Bilirubin', unit: 'mg/dL', ref: '0.1-1.2' },
    { name: 'Direct Bilirubin', unit: 'mg/dL', ref: '< 0.3' },
  ],
  'Kidney Function Tests': [
    { name: 'Creatinine', unit: 'mg/dL', ref: '0.7-1.3' },
    { name: 'Urea (BUN)', unit: 'mg/dL', ref: '7-20' },
    { name: 'eGFR', unit: 'mL/min/1.73m²', ref: '> 90' },
    { name: 'Uric Acid', unit: 'mg/dL', ref: '3.4-7.0' },
  ],
  'Hormonal Tests': [
    { name: 'TSH', unit: 'mIU/L', ref: '0.4-4.0' },
    { name: 'Free T3', unit: 'pg/mL', ref: '2.3-4.2' },
    { name: 'Free T4', unit: 'ng/dL', ref: '0.8-1.8' },
    { name: 'Testosterone', unit: 'ng/dL', ref: '300-1000' },
    { name: 'Free Testosterone', unit: 'pg/mL', ref: '47-244' },
    { name: 'Estradiol', unit: 'pg/mL', ref: '10-40' },
    { name: 'Progesterone', unit: 'ng/mL', ref: '< 1' },
    { name: 'LH', unit: 'mIU/mL', ref: '1.7-8.6' },
    { name: 'FSH', unit: 'mIU/mL', ref: '1.5-12.4' },
    { name: 'Prolactin', unit: 'ng/mL', ref: '4-15' },
    { name: 'Cortisol', unit: 'ug/dL', ref: '5-23' },
    { name: 'DHEA-S', unit: 'ug/dL', ref: '160-450' },
  ],
  'Nutritional Biomarkers': [
    { name: 'Vitamin D', unit: 'ng/mL', ref: '30-100' },
    { name: 'Vitamin B12', unit: 'pg/mL', ref: '200-900' },
    { name: 'Folate', unit: 'ng/mL', ref: '5-20' },
    { name: 'Ferritin', unit: 'ng/mL', ref: '20-250' },
    { name: 'Iron', unit: 'ug/dL', ref: '60-170' },
    { name: 'Magnesium', unit: 'mg/dL', ref: '1.7-2.2' },
    { name: 'Zinc', unit: 'ug/dL', ref: '60-120' },
    { name: 'Calcium', unit: 'mg/dL', ref: '8.5-10.2' },
  ],
  'Inflammatory Markers': [
    { name: 'CRP', unit: 'mg/L', ref: '< 10' },
    { name: 'hs-CRP', unit: 'mg/L', ref: '< 1' },
    { name: 'ESR', unit: 'mm/hr', ref: '< 15' },
  ],
  'Cardiovascular Tests': [
    { name: 'Electrocardiogram (ECG)', unit: 'result', ref: 'Normal Sinus Rhythm' },
    { name: 'Stress Test', unit: 'result', ref: 'Negative' },
    { name: 'Holter Monitoring', unit: 'result', ref: 'Normal' },
    { name: 'Ambulatory Blood Pressure', unit: 'mmHg', ref: '< 130/80' },
  ],
  'Imaging Exams': [
    { name: 'X-Ray', unit: 'result', ref: 'Normal' },
    { name: 'Ultrasound', unit: 'result', ref: 'Normal' },
    { name: 'CT Scan', unit: 'result', ref: 'Normal' },
    { name: 'MRI', unit: 'result', ref: 'Normal' },
    { name: 'DEXA Body Composition', unit: 'result', ref: 'Normal' },
    { name: 'Echocardiogram', unit: 'result', ref: 'Normal' },
  ]
};

const MEDICAL_SPECIALTIES = [
  'General Practitioner',
  'Cardiology',
  'Endocrinology',
  'Neurology',
  'Psychiatry',
  'Psychology',
  'Dermatology',
  'Orthopedics',
  'Rheumatology',
  'Pulmonology',
  'Gastroenterology',
  'Hepatology',
  'Nephrology',
  'Urology',
  'Gynecology',
  'Oncology',
  'Immunology',
  'Allergy and Immunology',
  'Sports Medicine',
  'Nutrition / Dietitian',
  'Physical Therapy',
  'Chiropractic',
  'Sleep Medicine',
  'Infectious Diseases',
  'Other Specialty'
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONSHIPS = ['Mother', 'Father', 'Brother', 'Sister', 'Grandmother', 'Grandfather', 'Uncle', 'Aunt', 'Cousin', 'Child', 'Spouse', 'Friend', 'Caregiver', 'Other relationship'];
const CRITICAL_CONDITIONS = ['Severe asthma', 'Epilepsy', 'Diabetes requiring insulin', 'Heart disease', 'Blood clotting disorders', 'Severe allergies (anaphylaxis risk)', 'Other condition'];
const ORGAN_DONOR_STATUSES = ['Registered organ donor', 'Not registered', 'Prefer not to say'];

export default function HistoryForm({ category, initialData, onComplete, onCancel }: HistoryFormProps) {
  const { addHistoryRecord, updateHistoryRecord, historyRecords, appLanguage } = useHealth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  const [formData, setFormData] = useState<any>(() => {
    const defaults = {
      date: new Date().toISOString().split('T')[0],
      notes: [],
      examCategory: 'Blood Tests',
      status: category === 'Consultations' ? 'Completed' : 'Normal',
      results: [],
      specialty: 'General Practitioner',
      location: 'Clinic',
      prescriptions: [],
      files: [],
      treatmentPlan: {
        medication: '',
        physicalTherapy: '',
        lifestyle: '',
        dietary: '',
        exercise: ''
      },
      // Emergency defaults
      bloodType: 'O+',
      allergies: { medication: [], food: [], environmental: [] },
      currentMedications: [],
      criticalConditions: [],
      emergencyContacts: [],
      organDonorStatus: 'Prefer not to say',
      emergencyInstructions: '',
      // Family History defaults
      relativeName: '',
      relationship: 'Mother',
      age: '',
      isLiving: true,
      conditions: [],
      // Stress Report defaults
      stressLevel: 5,
      mood: 'Neutral',
      sleepQuality: 'Fair',
      triggers: [],
      physicalSymptoms: [],
      // Continuous Medication defaults
      prescriptionDate: new Date().toISOString().split('T')[0],
      validityDate: '',
      type: 'Remédio',
      medicationName: '',
      dosage: '',
      times: ['08:00'],
      aiInsights: '',
      isActive: true,
      // Routine Vitals defaults
      subtype: 'Blood Pressure',
      bloodPressure: { systolic: 120, diastolic: 80, pulse: 70 },
      glucose: { value: 90, state: 'Jejum' },
      other: { metric: '', value: '' }
    };

    if (initialData) {
      return {
        ...defaults,
        ...initialData,
        date: new Date(initialData.date).toISOString().split('T')[0],
        followUpDate: initialData.followUpDate ? new Date(initialData.followUpDate).toISOString().split('T')[0] : '',
        prescriptionDate: initialData.prescriptionDate ? new Date(initialData.prescriptionDate).toISOString().split('T')[0] : defaults.prescriptionDate,
        validityDate: initialData.validityDate ? new Date(initialData.validityDate).toISOString().split('T')[0] : '',
        // Ensure nested objects are also merged if needed, but for now simple spread handles most
      };
    }
    return defaults;
  });

  const medicalHistoryConditions = historyRecords
    .filter(r => r.category === 'Medical History')
    .map(r => (r as any).conditionName);

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const handleGenerateInsights = async () => {
    if (!formData.medicationName || !formData.dosage) return;
    setIsGeneratingInsights(true);
    const insights = await generateMedicationInsights(formData.medicationName, formData.dosage, appLanguage);
    setFormData({ ...formData, aiInsights: insights });
    setIsGeneratingInsights(false);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanProgress(10);
    setScanStatus(`Reading ${files.length} file(s)...`);

    try {
      const fileArray = Array.from(files) as File[];
      const processedFiles: { data: string, name: string, mimeType: string }[] = [];

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
        processedFiles.push({ data, name: file.name, mimeType: fileType });
      }
      
      setScanProgress(30);
      setScanStatus(`AI analyzing ${files.length} document(s)...`);
      
      // Simulate progress
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 5;
        });
      }, 500);

      const result = await extractMedicalData(processedFiles, appLanguage);
      const extractedData = result?.extracted_data;
        
      clearInterval(interval);
      setScanProgress(100);
      setScanStatus("Analysis complete!");

      if (extractedData) {
        setFormData((prev: any) => ({
          ...prev,
          // Overwrite specific fields as requested
          examName: extractedData.title || prev.examName,
          category: extractedData.category || prev.category,
          // Ensure date is in correct format for input
          date: extractedData.date ? new Date(extractedData.date).toISOString().split('T')[0] : prev.date,
          // Status mapping
          status: extractedData.status === 'ALERT' ? 'Attention Required' : (extractedData.status || prev.status),
          // Provider/Doctor
          provider: extractedData.doctor_name || prev.provider,
          doctorName: extractedData.doctor_name || prev.doctorName,
          specialty: extractedData.specialty || prev.specialty,
          // Exam category
          examCategory: extractedData.exam_category || prev.examCategory,
          // Results
          results: extractedData.results || prev.results,
          // Prescriptions
          prescriptions: extractedData.prescriptions?.map((p: any) => ({
            ...p,
            id: Math.random().toString(36).substr(2, 9),
            prescribingDoctor: extractedData.doctor_name || 'AI Smart Scan'
          })) || prev.prescriptions,
          // Metabolic impact
          metabolicAdjustment: extractedData.metabolic_impact || prev.metabolicAdjustment,
          // Certificate Info
          certificateInfo: extractedData.certificate_info ? {
            institution: extractedData.certificate_info.institution,
            patientName: extractedData.certificate_info.patient_name,
            isPatientConfirmed: extractedData.certificate_info.is_patient_confirmed,
            cid: extractedData.certificate_info.cid,
            diagnosis: extractedData.certificate_info.diagnosis,
            leavePeriod: extractedData.certificate_info.leave_period ? {
              value: extractedData.certificate_info.leave_period.value,
              unit: extractedData.certificate_info.leave_period.unit,
              startDate: extractedData.certificate_info.leave_period.start_date,
              endDate: extractedData.certificate_info.leave_period.end_date,
            } : undefined,
            doctorCRM: extractedData.doctor_crm,
            doctorName: extractedData.doctor_name
          } : prev.certificateInfo,
          // Add the files to the list
          files: [...(prev.files || []), ...processedFiles.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            name: f.name,
            type: f.mimeType.includes('pdf') ? 'pdf' : 'image',
            url: f.data
          }))]
        }));
      }

      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
        setScanStatus("");
      }, 1000);
    } catch (error) {
      console.error("Scanning failed:", error);
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus("Error scanning document");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseRecord = {
      category,
      date: new Date(formData.date).toISOString(),
      notes: formData.notes || [],
    };

    let fullRecord: any = { ...baseRecord };

    if (category === 'Exams') {
      fullRecord = {
        ...fullRecord,
        examName: formData.examName || 'Generic Exam',
        examCategory: formData.examCategory,
        provider: formData.provider || '',
        doctorResponsible: formData.doctorResponsible || '',
        status: formData.status,
        results: formData.results,
        bodyRegion: formData.bodyRegion || '',
      };
    } else if (category === 'Consultations') {
      fullRecord = {
        ...fullRecord,
        doctorName: formData.doctorName || '',
        specialty: formData.specialty === 'Other Specialty' ? formData.customSpecialty : formData.specialty,
        location: formData.location,
        reason: formData.reason || '',
        status: formData.status,
        diagnosis: formData.diagnosis,
        treatmentPlan: formData.treatmentPlan,
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate).toISOString() : undefined,
        prescriptions: formData.prescriptions,
        files: formData.files,
      };
    } else if (category === 'Emergency') {
      fullRecord = {
        ...fullRecord,
        bloodType: formData.bloodType,
        allergies: formData.allergies,
        currentMedications: formData.currentMedications,
        criticalConditions: formData.criticalConditions,
        emergencyContacts: formData.emergencyContacts,
        organDonorStatus: formData.organDonorStatus,
        emergencyInstructions: formData.emergencyInstructions,
      };
    } else if (category === 'Family History') {
      fullRecord = {
        ...fullRecord,
        relativeName: formData.relativeName || '',
        relationship: formData.relationship,
        age: formData.age ? parseInt(formData.age) : undefined,
        isLiving: formData.isLiving,
        conditions: formData.conditions,
      };
    } else if (category === 'Medical History') {
      fullRecord = {
        ...fullRecord,
        conditionName: formData.conditionName || '',
        conditionCategory: formData.conditionCategory || '',
        status: formData.status || 'Active',
      };
    } else if (category === 'Stress Reports') {
      fullRecord = {
        ...fullRecord,
        stressLevel: formData.stressLevel,
        mood: formData.mood,
        sleepQuality: formData.sleepQuality,
        triggers: formData.triggers,
        physicalSymptoms: formData.physicalSymptoms,
      };
    } else if (category === 'Continuous Medication') {
      fullRecord = {
        ...fullRecord,
        prescriptionDate: new Date(formData.prescriptionDate).toISOString(),
        validityDate: formData.validityDate ? new Date(formData.validityDate).toISOString() : undefined,
        type: formData.type,
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        times: formData.times,
        aiInsights: formData.aiInsights,
        isActive: formData.isActive,
      };
    } else if (category === 'Routine Vitals') {
      fullRecord = {
        ...fullRecord,
        subtype: formData.subtype,
        bloodPressure: formData.subtype === 'Blood Pressure' ? formData.bloodPressure : undefined,
        glucose: formData.subtype === 'Glucose' ? formData.glucose : undefined,
        other: formData.subtype === 'Other' ? formData.other : undefined,
      };
    } else if (category === 'Medical Certificate') {
      fullRecord = {
        ...fullRecord,
        certificateInfo: formData.certificateInfo,
      };
    }

    if (initialData) {
      updateHistoryRecord(initialData.id, fullRecord);
    } else {
      addHistoryRecord(fullRecord);
    }
    onComplete();
  };

  const addResult = (biomarker?: { name: string; unit: string; ref?: string }) => {
    const newResult = {
      name: biomarker?.name || '',
      value: '',
      unit: biomarker?.unit || '',
      referenceRange: biomarker?.ref || '',
      status: 'Normal' as ExamStatus,
    };
    setFormData({
      ...formData,
      results: [...(formData.results || []), newResult]
    });
  };

  const updateResult = (index: number, field: string, value: any) => {
    const newResults = [...formData.results];
    newResults[index] = { ...newResults[index], [field]: value };
    setFormData({ ...formData, results: newResults });
  };

  const removeResult = (index: number) => {
    const newResults = formData.results.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, results: newResults });
  };

  // Emergency Helpers
  const addAllergy = (type: 'medication' | 'food' | 'environmental') => {
    setFormData({
      ...formData,
      allergies: {
        ...formData.allergies,
        [type]: [...formData.allergies[type], '']
      }
    });
  };

  const updateAllergy = (type: 'medication' | 'food' | 'environmental', index: number, value: string) => {
    const newList = [...formData.allergies[type]];
    newList[index] = value;
    setFormData({
      ...formData,
      allergies: { ...formData.allergies, [type]: newList }
    });
  };

  const removeAllergy = (type: 'medication' | 'food' | 'environmental', index: number) => {
    const newList = formData.allergies[type].filter((_: any, i: number) => i !== index);
    setFormData({
      ...formData,
      allergies: { ...formData.allergies, [type]: newList }
    });
  };

  const addEmergencyMedication = () => {
    setFormData({
      ...formData,
      currentMedications: [...formData.currentMedications, { id: Date.now().toString(), name: '', dosage: '', frequency: '', purpose: '' }]
    });
  };

  const updateEmergencyMedication = (index: number, field: string, value: string) => {
    const newList = [...formData.currentMedications];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, currentMedications: newList });
  };

  const addEmergencyContact = () => {
    setFormData({
      ...formData,
      emergencyContacts: [...formData.emergencyContacts, { id: Date.now().toString(), name: '', relationship: 'Spouse', phone: '' }]
    });
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    const newList = [...formData.emergencyContacts];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, emergencyContacts: newList });
  };

  const toggleCriticalCondition = (condition: string) => {
    const current = formData.criticalConditions || [];
    if (current.includes(condition)) {
      setFormData({ ...formData, criticalConditions: current.filter((c: string) => c !== condition) });
    } else {
      setFormData({ ...formData, criticalConditions: [...current, condition] });
    }
  };

  // Family History Helpers
  const addFamilyCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { condition: '', category: 'Cardiovascular' }]
    });
  };

  const updateFamilyCondition = (index: number, field: string, value: any) => {
    const newList = [...formData.conditions];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, conditions: newList });
  };

  const removeFamilyCondition = (index: number) => {
    const newList = formData.conditions.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, conditions: newList });
  };

  const renderFields = () => {
    switch (category) {
      case 'Exams':
        return (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Exam Category</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                value={formData.examCategory}
                onChange={e => setFormData({...formData, examCategory: e.target.value, results: []})}
              >
                {EXAM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Exam Name</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Blood Test, MRI, X-Ray"
                value={formData.examName || ''}
                onChange={e => setFormData({...formData, examName: e.target.value})}
              />
            </div>

            {formData.examCategory === 'Imaging Exams' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Body Region</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Chest, Abdomen, Knee"
                  value={formData.bodyRegion || ''}
                  onChange={e => setFormData({...formData, bodyRegion: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {['Normal', 'Attention Required', 'Abnormal', 'Pending Results'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({...formData, status: s})}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                      formData.status === s 
                        ? "bg-primary border-primary text-white" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Results / Biomarkers</label>
                <button 
                  type="button"
                  onClick={() => addResult()}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add Custom
                </button>
              </div>

              {BIOMARKERS_BY_CATEGORY[formData.examCategory] && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {BIOMARKERS_BY_CATEGORY[formData.examCategory].map((bio) => (
                    <button
                      key={bio.name}
                      type="button"
                      onClick={() => addResult(bio)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      + {bio.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {formData.results?.map((res: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <input 
                        className="bg-transparent border-none p-0 font-bold text-sm focus:ring-0 w-2/3"
                        placeholder="Biomarker Name"
                        value={res.name}
                        onChange={e => updateResult(idx, 'name', e.target.value)}
                      />
                      <button type="button" onClick={() => removeResult(idx)} className="text-red-400 p-1">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Value</label>
                        <input 
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                          placeholder="Value"
                          value={res.value}
                          onChange={e => updateResult(idx, 'value', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Unit</label>
                        <input 
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                          placeholder="Unit"
                          value={res.unit}
                          onChange={e => updateResult(idx, 'unit', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Reference Range</label>
                      <input 
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                        placeholder="e.g. 70-99"
                        value={res.referenceRange}
                        onChange={e => updateResult(idx, 'referenceRange', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Laboratory / Clinic</label>
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. City Hospital Lab"
                value={formData.provider || ''}
                onChange={e => setFormData({...formData, provider: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Doctor Responsible</label>
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Dr. John Doe"
                value={formData.doctorResponsible || ''}
                onChange={e => setFormData({...formData, doctorResponsible: e.target.value})}
              />
            </div>
          </>
        );
      case 'Consultations':
        return (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Doctor Name</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Dr. Maria Silva"
                value={formData.doctorName || ''}
                onChange={e => setFormData({...formData, doctorName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Specialty</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                value={formData.specialty}
                onChange={e => setFormData({...formData, specialty: e.target.value})}
              >
                {MEDICAL_SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {formData.specialty === 'Other Specialty' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Custom Specialty</label>
                <input 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Type specialty..."
                  value={formData.customSpecialty || ''}
                  onChange={e => setFormData({...formData, customSpecialty: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Location</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              >
                <option value="Clinic">Clinic</option>
                <option value="Hospital">Hospital</option>
                <option value="Online">Online / Telemedicine</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {['Scheduled', 'Completed', 'Canceled'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({...formData, status: s})}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                      formData.status === s 
                        ? "bg-primary border-primary text-white" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Reason for Visit</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Annual Checkup, Chest Pain"
                value={formData.reason || ''}
                onChange={e => setFormData({...formData, reason: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Diagnosis</label>
              <div className="relative">
                <input 
                  list="medical-history-conditions"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Search or type diagnosis..."
                  value={formData.diagnosis || ''}
                  onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                />
                <datalist id="medical-history-conditions">
                  {medicalHistoryConditions.map((c, i) => (
                    <option key={i} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Treatment Plan</label>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Medication Prescribed</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="e.g. Amoxicillin 500mg"
                    value={formData.treatmentPlan?.medication || ''}
                    onChange={e => setFormData({...formData, treatmentPlan: {...formData.treatmentPlan, medication: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Physical Therapy</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="e.g. 10 sessions for lower back"
                    value={formData.treatmentPlan?.physicalTherapy || ''}
                    onChange={e => setFormData({...formData, treatmentPlan: {...formData.treatmentPlan, physicalTherapy: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Lifestyle Recommendations</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="e.g. Reduce stress, sleep 8h"
                    value={formData.treatmentPlan?.lifestyle || ''}
                    onChange={e => setFormData({...formData, treatmentPlan: {...formData.treatmentPlan, lifestyle: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Dietary Changes</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="e.g. Low sodium diet"
                    value={formData.treatmentPlan?.dietary || ''}
                    onChange={e => setFormData({...formData, treatmentPlan: {...formData.treatmentPlan, dietary: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Exercise Recommendations</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="e.g. 30min walking daily"
                    value={formData.treatmentPlan?.exercise || ''}
                    onChange={e => setFormData({...formData, treatmentPlan: {...formData.treatmentPlan, exercise: e.target.value}})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Prescriptions</label>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, prescriptions: [...(formData.prescriptions || []), { id: Date.now().toString(), medicationName: '', dosage: '', frequency: '', duration: '', prescribingDoctor: formData.doctorName }]})}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add Medication
                </button>
              </div>
              <div className="space-y-3">
                {formData.prescriptions?.map((p: any, idx: number) => (
                  <div key={p.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <input 
                        className="bg-transparent border-none p-0 font-bold text-sm focus:ring-0 w-2/3"
                        placeholder="Medication Name"
                        value={p.medicationName}
                        onChange={e => {
                          const newP = [...formData.prescriptions];
                          newP[idx].medicationName = e.target.value;
                          setFormData({...formData, prescriptions: newP});
                        }}
                      />
                      <button type="button" onClick={() => setFormData({...formData, prescriptions: formData.prescriptions.filter((_: any, i: number) => i !== idx)})} className="text-red-400 p-1">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                        placeholder="Dosage (e.g. 500mg)"
                        value={p.dosage}
                        onChange={e => {
                          const newP = [...formData.prescriptions];
                          newP[idx].dosage = e.target.value;
                          setFormData({...formData, prescriptions: newP});
                        }}
                      />
                      <input 
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                        placeholder="Frequency (e.g. 2x/day)"
                        value={p.frequency}
                        onChange={e => {
                          const newP = [...formData.prescriptions];
                          newP[idx].frequency = e.target.value;
                          setFormData({...formData, prescriptions: newP});
                        }}
                      />
                    </div>
                    <input 
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                      placeholder="Duration (e.g. 7 days)"
                      value={p.duration}
                      onChange={e => {
                        const newP = [...formData.prescriptions];
                        newP[idx].duration = e.target.value;
                        setFormData({...formData, prescriptions: newP});
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Files & Documents</label>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, files: [...(formData.files || []), { id: Date.now().toString(), name: '', type: 'pdf', url: '#' }]})}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
                  <Plus className="size-3" /> Attach File
                </button>
              </div>
              <div className="space-y-2">
                {formData.files?.map((f: any, idx: number) => (
                  <div key={f.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <FileText className="size-4 text-slate-400" />
                    <input 
                      className="flex-1 bg-transparent border-none p-0 text-xs focus:ring-0"
                      placeholder="File name (e.g. Prescription.pdf)"
                      value={f.name}
                      onChange={e => {
                        const newF = [...formData.files];
                        newF[idx].name = e.target.value;
                        setFormData({...formData, files: newF});
                      }}
                    />
                    <select 
                      className="bg-transparent border-none p-0 text-[10px] font-bold text-primary focus:ring-0"
                      value={f.type}
                      onChange={e => {
                        const newF = [...formData.files];
                        newF[idx].type = e.target.value;
                        setFormData({...formData, files: newF});
                      }}
                    >
                      <option value="pdf">PDF</option>
                      <option value="image">Image</option>
                      <option value="document">Doc</option>
                    </select>
                    <button type="button" onClick={() => setFormData({...formData, files: formData.files.filter((_: any, i: number) => i !== idx)})} className="text-red-400 p-1">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Follow-up Appointment</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  value={formData.followUpDate || ''}
                  onChange={e => setFormData({...formData, followUpDate: e.target.value})}
                />
              </div>
            </div>
          </>
        );
      case 'Emergency':
        return (
          <div className="space-y-8">
            {/* Blood Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Blood Type</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, bloodType: type})}
                    className={cn(
                      "py-3 rounded-xl text-xs font-bold transition-all border",
                      formData.bloodType === type 
                        ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-200" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Critical Allergies</label>
              
              {(['medication', 'food', 'environmental'] as const).map((type) => (
                <div key={type} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">{type} Allergies</span>
                    <button 
                      type="button"
                      onClick={() => addAllergy(type)}
                      className="text-[10px] font-bold text-primary flex items-center gap-1"
                    >
                      <Plus className="size-3" /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.allergies[type].map((allergy: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                          placeholder={`e.g. ${type === 'medication' ? 'Penicillin' : type === 'food' ? 'Peanuts' : 'Latex'}`}
                          value={allergy}
                          onChange={e => updateAllergy(type, idx, e.target.value)}
                        />
                        <button type="button" onClick={() => removeAllergy(type, idx)} className="text-red-400 p-2">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Current Medications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Current Medications</label>
                <button 
                  type="button"
                  onClick={addEmergencyMedication}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add Medication
                </button>
              </div>
              <div className="space-y-3">
                {formData.currentMedications.map((med: any, idx: number) => (
                  <div key={med.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <input 
                        className="bg-transparent border-none p-0 font-bold text-sm focus:ring-0 w-2/3"
                        placeholder="Medication Name"
                        value={med.name}
                        onChange={e => updateEmergencyMedication(idx, 'name', e.target.value)}
                      />
                      <button type="button" onClick={() => setFormData({...formData, currentMedications: formData.currentMedications.filter((_: any, i: number) => i !== idx)})} className="text-red-400 p-1">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={e => updateEmergencyMedication(idx, 'dosage', e.target.value)}
                      />
                      <input 
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={e => updateEmergencyMedication(idx, 'frequency', e.target.value)}
                      />
                    </div>
                    <input 
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                      placeholder="Purpose (e.g. Blood Pressure)"
                      value={med.purpose}
                      onChange={e => updateEmergencyMedication(idx, 'purpose', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Conditions */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Critical Medical Conditions</label>
              <div className="flex flex-wrap gap-2">
                {CRITICAL_CONDITIONS.map(condition => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => toggleCriticalCondition(condition)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold transition-all border",
                      formData.criticalConditions.includes(condition)
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Emergency Contacts</label>
                <button 
                  type="button"
                  onClick={addEmergencyContact}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add Contact
                </button>
              </div>
              <div className="space-y-3">
                {formData.emergencyContacts.map((contact: any, idx: number) => (
                  <div key={contact.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <input 
                        className="bg-transparent border-none p-0 font-bold text-sm focus:ring-0 w-2/3"
                        placeholder="Contact Name"
                        value={contact.name}
                        onChange={e => updateEmergencyContact(idx, 'name', e.target.value)}
                      />
                      <button type="button" onClick={() => setFormData({...formData, emergencyContacts: formData.emergencyContacts.filter((_: any, i: number) => i !== idx)})} className="text-red-400 p-1">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <select 
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20 appearance-none"
                      value={contact.relationship}
                      onChange={e => updateEmergencyContact(idx, 'relationship', e.target.value)}
                    >
                      {RELATIONSHIPS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                        <input 
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                          placeholder="Phone"
                          value={contact.phone}
                          onChange={e => updateEmergencyContact(idx, 'phone', e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                        <input 
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                          placeholder="Email (Opt)"
                          value={contact.email}
                          onChange={e => updateEmergencyContact(idx, 'email', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Organ Donation */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Organ Donor Status</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                value={formData.organDonorStatus}
                onChange={e => setFormData({...formData, organDonorStatus: e.target.value})}
              >
                {ORGAN_DONOR_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Emergency Instructions */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Emergency Instructions</label>
              <textarea 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                placeholder="e.g. Pacemaker, Medical Implants, Special Instructions..."
                value={formData.emergencyInstructions}
                onChange={e => setFormData({...formData, emergencyInstructions: e.target.value})}
              />
            </div>
          </div>
        );
      case 'Family History':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Relative Name</label>
                <input 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. John Smith"
                  value={formData.relativeName || ''}
                  onChange={e => setFormData({...formData, relativeName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Relationship</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  value={formData.relationship}
                  onChange={e => setFormData({...formData, relationship: e.target.value})}
                >
                  {RELATIONSHIPS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Age (Optional)</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. 65"
                  value={formData.age || ''}
                  onChange={e => setFormData({...formData, age: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Living Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Living', value: true },
                    { label: 'Deceased', value: false }
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setFormData({...formData, isLiving: s.value})}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                        formData.isLiving === s.value 
                          ? "bg-primary border-primary text-white" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Family Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Health Conditions</label>
                <button 
                  type="button"
                  onClick={addFamilyCondition}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add Condition
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.conditions.map((cond: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-800 relative">
                    <button 
                      type="button" 
                      onClick={() => removeFamilyCondition(idx)} 
                      className="absolute top-4 right-4 text-red-400 p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Condition</label>
                        <input 
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                          placeholder="e.g. Diabetes"
                          value={cond.condition}
                          onChange={e => updateFamilyCondition(idx, 'condition', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Category</label>
                        <select 
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20 appearance-none"
                          value={cond.category}
                          onChange={e => updateFamilyCondition(idx, 'category', e.target.value)}
                        >
                          {['Cardiovascular', 'Metabolic', 'Oncology', 'Neurological', 'Respiratory', 'Autoimmune', 'Mental Health', 'Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Age at Onset</label>
                        <input 
                          type="number"
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                          placeholder="e.g. 45"
                          value={cond.ageAtOnset || ''}
                          onChange={e => updateFamilyCondition(idx, 'ageAtOnset', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </div>

                    {cond.category === 'Oncology' && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Cancer Type</label>
                          <input 
                            className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                            placeholder="e.g. Breast Cancer"
                            value={cond.cancerType || ''}
                            onChange={e => updateFamilyCondition(idx, 'cancerType', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Affected Organ</label>
                          <input 
                            className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                            placeholder="e.g. Breast"
                            value={cond.affectedOrgan || ''}
                            onChange={e => updateFamilyCondition(idx, 'affectedOrgan', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Medical Certificate':
        return (
          <div className="space-y-8">
            <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-3xl border border-primary/10 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <FileText className="size-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Certificate Details</h4>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Extracted from document</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Institution</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. Hospital Santa Luzia"
                    value={formData.certificateInfo?.institution || ''}
                    onChange={e => setFormData({
                      ...formData, 
                      certificateInfo: { ...formData.certificateInfo, institution: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Patient Name</label>
                  <div className="relative">
                    <input 
                      className={cn(
                        "w-full bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all",
                        formData.certificateInfo?.isPatientConfirmed ? "pr-12" : ""
                      )}
                      placeholder="e.g. Jean Pierre"
                      value={formData.certificateInfo?.patientName || ''}
                      onChange={e => setFormData({
                        ...formData, 
                        certificateInfo: { ...formData.certificateInfo, patientName: e.target.value }
                      })}
                    />
                    {formData.certificateInfo?.isPatientConfirmed && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                        <CheckCircle2 className="size-5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">CID / Diagnosis</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. Z00.0"
                    value={formData.certificateInfo?.cid || ''}
                    onChange={e => setFormData({
                      ...formData, 
                      certificateInfo: { ...formData.certificateInfo, cid: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Doctor CRM</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. 12345-SP"
                    value={formData.certificateInfo?.doctorCRM || ''}
                    onChange={e => setFormData({
                      ...formData, 
                      certificateInfo: { ...formData.certificateInfo, doctorCRM: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-primary/10">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Leave Period</label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Duration</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        className="w-20 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                        value={formData.certificateInfo?.leavePeriod?.value || ''}
                        onChange={e => setFormData({
                          ...formData, 
                          certificateInfo: { 
                            ...formData.certificateInfo, 
                            leavePeriod: { ...formData.certificateInfo?.leavePeriod, value: parseInt(e.target.value) } 
                          }
                        })}
                      />
                      <select 
                        className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20 appearance-none"
                        value={formData.certificateInfo?.leavePeriod?.unit || 'days'}
                        onChange={e => setFormData({
                          ...formData, 
                          certificateInfo: { 
                            ...formData.certificateInfo, 
                            leavePeriod: { ...formData.certificateInfo?.leavePeriod, unit: e.target.value as 'days' | 'hours' } 
                          }
                        })}
                      >
                        <option value="days">Days</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Stress Reports':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stress Level (1-10)</label>
                <span className={cn(
                  "text-sm font-bold",
                  formData.stressLevel >= 8 ? "text-red-500" :
                  formData.stressLevel >= 5 ? "text-amber-500" : "text-emerald-500"
                )}>
                  {formData.stressLevel}/10
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={formData.stressLevel} 
                onChange={(e) => setFormData({...formData, stressLevel: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Mood</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  value={formData.mood}
                  onChange={e => setFormData({...formData, mood: e.target.value})}
                >
                  {['Very Happy', 'Happy', 'Neutral', 'Sad', 'Anxious', 'Irritable', 'Exhausted'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Sleep Quality</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  value={formData.sleepQuality}
                  onChange={e => setFormData({...formData, sleepQuality: e.target.value})}
                >
                  {['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Common Triggers</label>
              <div className="flex flex-wrap gap-2">
                {['Work', 'Family', 'Finances', 'Health', 'Social', 'Lack of Sleep', 'Nutrition'].map(trigger => (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => {
                      const current = formData.triggers || [];
                      if (current.includes(trigger)) {
                        setFormData({...formData, triggers: current.filter((t: string) => t !== trigger)});
                      } else {
                        setFormData({...formData, triggers: [...current, trigger]});
                      }
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold transition-all border",
                      formData.triggers?.includes(trigger)
                        ? "bg-primary border-primary text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {trigger}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Physical Symptoms</label>
              <div className="flex flex-wrap gap-2">
                {['Headache', 'Muscle Tension', 'Fatigue', 'Fast Heartbeat', 'Stomach Issues', 'Insomnia'].map(symptom => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => {
                      const current = formData.physicalSymptoms || [];
                      if (current.includes(symptom)) {
                        setFormData({...formData, physicalSymptoms: current.filter((s: string) => s !== symptom)});
                      } else {
                        setFormData({...formData, physicalSymptoms: [...current, symptom]});
                      }
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold transition-all border",
                      formData.physicalSymptoms?.includes(symptom)
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Medical History':
        return (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Condition Name</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Hypertension"
                value={formData.conditionName || ''}
                onChange={e => setFormData({...formData, conditionName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Category</label>
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Cardiovascular"
                value={formData.conditionCategory || ''}
                onChange={e => setFormData({...formData, conditionCategory: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Status</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                {['Active', 'Controlled', 'Recovered', 'Chronic'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </>
        );
      case 'Continuous Medication':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Prescription Date</label>
                <input 
                  type="date"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  value={formData.prescriptionDate}
                  onChange={e => setFormData({...formData, prescriptionDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Validity (Optional)</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  value={formData.validityDate}
                  onChange={e => setFormData({...formData, validityDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Remédio', 'Procedimento'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({...formData, type: t})}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                      formData.type === t 
                        ? "bg-primary border-primary text-white" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Medication Name</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Metformin"
                value={formData.medicationName}
                onChange={e => setFormData({...formData, medicationName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Dosage</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. 500mg"
                value={formData.dosage}
                onChange={e => setFormData({...formData, dosage: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Schedule (Times)</label>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, times: [...formData.times, '12:00']})}
                  className="text-[10px] font-bold text-primary flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add Time
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.times.map((time: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                    <Clock className="size-3 text-slate-400" />
                    <input 
                      type="time"
                      className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0"
                      value={time}
                      onChange={e => {
                        const newTimes = [...formData.times];
                        newTimes[idx] = e.target.value;
                        setFormData({...formData, times: newTimes});
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, times: formData.times.filter((_: any, i: number) => i !== idx)})}
                      className="text-red-400"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              {formData.aiInsights && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="size-3 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Cuidados e Observações (IA)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {formData.aiInsights}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 'Routine Vitals':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Vitals Subtype</label>
              <div className="grid grid-cols-3 gap-2">
                {['Blood Pressure', 'Glucose', 'Other'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({...formData, subtype: s})}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                      formData.subtype === s 
                        ? "bg-primary border-primary text-white" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {formData.subtype === 'Blood Pressure' && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Systolic (mmHg)</label>
                    <input 
                      type="number"
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                      placeholder="120"
                      value={formData.bloodPressure.systolic}
                      onChange={e => setFormData({...formData, bloodPressure: {...formData.bloodPressure, systolic: parseInt(e.target.value)}})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Diastolic (mmHg)</label>
                    <input 
                      type="number"
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                      placeholder="80"
                      value={formData.bloodPressure.diastolic}
                      onChange={e => setFormData({...formData, bloodPressure: {...formData.bloodPressure, diastolic: parseInt(e.target.value)}})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Pulse (bpm)</label>
                  <input 
                    type="number"
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="70"
                    value={formData.bloodPressure.pulse}
                    onChange={e => setFormData({...formData, bloodPressure: {...formData.bloodPressure, pulse: parseInt(e.target.value)}})}
                  />
                </div>
              </div>
            )}

            {formData.subtype === 'Glucose' && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Glucose Value (mg/dL)</label>
                  <input 
                    type="number"
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="90"
                    value={formData.glucose.value}
                    onChange={e => setFormData({...formData, glucose: {...formData.glucose, value: parseInt(e.target.value)}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">State</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Jejum', 'Pré-prandial', 'Pós-prandial'].map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setFormData({...formData, glucose: {...formData.glucose, state}})}
                        className={cn(
                          "py-2 rounded-lg text-[8px] font-bold uppercase transition-all border",
                          formData.glucose.state === state 
                            ? "bg-primary border-primary text-white" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                        )}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formData.subtype === 'Other' && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Metric Name</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="e.g. Oxygen Saturation"
                    value={formData.other.metric}
                    onChange={e => setFormData({...formData, other: {...formData.other, metric: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Value</label>
                  <input 
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/20"
                    placeholder="e.g. 98%"
                    value={formData.other.value}
                    onChange={e => setFormData({...formData, other: {...formData.other, value: e.target.value}})}
                  />
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Scan Section */}
      <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold">AI Smart Scan</h4>
            <p className="text-[10px] text-slate-500 font-medium">Anexe exames em PDF, fotos ou receitas para preencher</p>
          </div>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileScan}
          accept="image/*,application/pdf,.pdf,text/plain,.txt,.doc,.docx"
          className="hidden"
          multiple
        />
        
        <button
          type="button"
          onClick={handleScanClick}
          disabled={isScanning}
          className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 overflow-hidden relative"
        >
          {isScanning && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${scanProgress}%` }}
              className="absolute bottom-0 left-0 h-1 bg-white/30"
            />
          )}
          
          <div className="flex items-center gap-2">
            {isScanning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {scanStatus || "Scanning Document..."}
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Scan & Auto-fill
              </>
            )}
          </div>
          
          {isScanning && (
            <span className="text-[8px] opacity-70 uppercase tracking-widest">
              AI Processing: {scanProgress}%
            </span>
          )}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Date</label>
        <div className="relative">
          <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input 
            type="date"
            required
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
          />
        </div>
      </div>

      {renderFields()}

      <div className="flex gap-3 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <Check className="size-4" />
          {initialData ? 'Update Record' : 'Save Record'}
        </button>
      </div>
    </form>
  );
}
