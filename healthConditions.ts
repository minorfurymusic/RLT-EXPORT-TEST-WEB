export interface ConditionDetail {
  label: string;
  type: 'checkbox' | 'radio' | 'text' | 'number';
  options?: string[];
}

export interface Condition {
  name: string;
  details?: ConditionDetail[];
}

export interface HealthCategory {
  name: string;
  conditions: Condition[];
}

export const HEALTH_CONDITIONS_DATA: HealthCategory[] = [
  {
    name: 'Cardiovascular Diseases',
    conditions: [
      {
        name: 'Hypertension (High Blood Pressure)',
        details: [
          {
            label: 'Classification',
            type: 'radio',
            options: [
              'Stage 1 Hypertension',
              'Stage 2 Hypertension',
              'Resistant Hypertension',
              'White Coat Hypertension',
              'Secondary Hypertension'
            ]
          },
          {
            label: 'Management',
            type: 'checkbox',
            options: ['Uses medication', 'Controlled', 'Uncontrolled']
          }
        ]
      },
      { name: 'Coronary Artery Disease' },
      { name: 'Heart Failure' },
      { name: 'Arrhythmias' },
      { name: 'Atrial Fibrillation' },
      { name: 'Myocardial Infarction (Heart Attack)' },
      { name: 'Angina' },
      { name: 'Peripheral Artery Disease' },
      { name: 'Atherosclerosis' },
      { name: 'Cardiomyopathy' },
      { name: 'Congenital Heart Disease' },
      { name: 'Heart Valve Disease' },
      { name: 'Deep Vein Thrombosis' },
      { name: 'Pulmonary Embolism' },
      { name: 'Varicose veins' },
      { name: 'Chronic venous insufficiency' },
      { name: 'Peripheral vascular disease' },
      { name: 'Aneurysm' },
      { name: 'Thrombosis history' }
    ]
  },
  {
    name: 'Metabolic Disorders',
    conditions: [
      {
        name: 'Obesity',
        details: [
          {
            label: 'Classification',
            type: 'radio',
            options: [
              'Class I Obesity (BMI 30–34.9)',
              'Class II Obesity (BMI 35–39.9)',
              'Class III Obesity (BMI ≥ 40)',
              'Severe Obesity',
              'Central Obesity (Abdominal)',
              'Post-bariatric surgery history'
            ]
          },
          { label: 'Waist circumference (cm)', type: 'number' },
          { label: 'Body fat percentage (%)', type: 'number' }
        ]
      },
      { name: 'Overweight' },
      { name: 'Metabolic Syndrome' },
      { name: 'Insulin Resistance' },
      { name: 'Prediabetes' },
      { name: 'Type 1 Diabetes' },
      { name: 'Type 2 Diabetes' },
      { name: 'Gestational Diabetes' },
      {
        name: 'Diabetes (General)',
        details: [
          {
            label: 'Type',
            type: 'radio',
            options: ['Type 1 Diabetes', 'Type 2 Diabetes', 'Prediabetes', 'Gestational Diabetes']
          },
          {
            label: 'Management',
            type: 'checkbox',
            options: ['Uses insulin', 'Uses oral medication', 'Diet controlled']
          },
          {
            label: 'Complications',
            type: 'checkbox',
            options: ['Diabetic neuropathy', 'Diabetic retinopathy', 'Diabetic nephropathy', 'Diabetic foot']
          }
        ]
      },
      { name: 'High Cholesterol (Hypercholesterolemia)' },
      { name: 'Hypertriglyceridemia' },
      { name: 'Mixed Dyslipidemia' },
      {
        name: 'Cholesterol and Lipid Disorders (General)',
        details: [
          {
            label: 'Condition',
            type: 'checkbox',
            options: [
              'High LDL cholesterol',
              'Low HDL cholesterol',
              'High triglycerides',
              'Mixed dyslipidemia',
              'Familial hypercholesterolemia'
            ]
          },
          {
            label: 'Management',
            type: 'checkbox',
            options: ['Medication use', 'Statin therapy']
          }
        ]
      },
      { name: 'Non-alcoholic fatty liver disease (NAFLD)' }
    ]
  },
  {
    name: 'Respiratory Diseases',
    conditions: [
      { name: 'Asthma' },
      { name: 'Chronic Bronchitis' },
      { name: 'Chronic Obstructive Pulmonary Disease (COPD)' },
      { name: 'Emphysema' },
      { name: 'Allergic Rhinitis' },
      { name: 'Chronic Sinusitis' },
      { name: 'Pulmonary Fibrosis' },
      {
        name: 'Sleep Apnea',
        details: [
          {
            label: 'Type',
            type: 'radio',
            options: ['Obstructive Sleep Apnea', 'Central Sleep Apnea', 'Mixed Sleep Apnea']
          },
          {
            label: 'Management',
            type: 'checkbox',
            options: ['Uses CPAP machine', 'Diagnosed by sleep study']
          }
        ]
      },
      { name: 'Pulmonary Hypertension' },
      { name: 'Recurrent Pneumonia' },
      { name: 'Tuberculosis (history)' },
      { name: 'Bronchiectasis' }
    ]
  },
  {
    name: 'Neurological Disorders',
    conditions: [
      { name: 'Alzheimer\'s Disease' },
      { name: 'Parkinson\'s Disease' },
      { name: 'Epilepsy' },
      { name: 'Multiple Sclerosis' },
      {
        name: 'Stroke (AVC)',
        details: [
          {
            label: 'Type',
            type: 'radio',
            options: ['Ischemic Stroke', 'Hemorrhagic Stroke', 'Post-stroke recovery']
          },
          { label: 'Year occurred', type: 'number' },
          { label: 'Physical limitations', type: 'text' }
        ]
      },
      { name: 'Transient Ischemic Attack (TIA)' },
      { name: 'Migraine / Chronic Migraine' },
      { name: 'Chronic Headaches' },
      { name: 'Neuropathy' },
      { name: 'Peripheral Neuropathy' },
      { name: 'Trigeminal Neuralgia' },
      { name: 'Brain Injury (TBI)' },
      { name: 'Spinal Cord Injury' },
      { name: 'Dementia (unspecified)' },
      { name: 'Huntington\'s Disease' },
      { name: 'Amyotrophic Lateral Sclerosis (ALS)' },
      { name: 'Restless Legs Syndrome' },
      { name: 'Essential Tremor' },
      { name: 'Cerebral Palsy' },
      { name: 'Autonomic Nervous System Disorders' }
    ]
  },
  {
    name: 'Mental Health Conditions',
    conditions: [
      {
        name: 'Anxiety Disorders',
        details: [
          {
            label: 'Specific Condition',
            type: 'radio',
            options: [
              'Generalized Anxiety Disorder',
              'Social Anxiety Disorder',
              'Panic Disorder',
              'Obsessive Compulsive Disorder (OCD)',
              'Post-Traumatic Stress Disorder (PTSD)'
            ]
          },
          {
            label: 'Treatment Status',
            type: 'checkbox',
            options: [
              'Under psychological treatment',
              'Under psychiatric treatment',
              'Medication use',
              'Therapy only',
              'Previously diagnosed but untreated'
            ]
          }
        ]
      },
      {
        name: 'Depression',
        details: [
          {
            label: 'Specific Condition',
            type: 'radio',
            options: [
              'Major Depressive Disorder',
              'Persistent Depressive Disorder (Dysthymia)',
              'Seasonal Affective Disorder'
            ]
          },
          {
            label: 'Treatment Status',
            type: 'checkbox',
            options: [
              'Under psychological treatment',
              'Under psychiatric treatment',
              'Medication use',
              'Therapy only',
              'Previously diagnosed but untreated'
            ]
          }
        ]
      },
      {
        name: 'Bipolar Disorder',
        details: [
          {
            label: 'Type',
            type: 'radio',
            options: ['Bipolar Disorder Type I', 'Bipolar Disorder Type II']
          },
          {
            label: 'Treatment Status',
            type: 'checkbox',
            options: [
              'Under psychological treatment',
              'Under psychiatric treatment',
              'Medication use',
              'Therapy only',
              'Previously diagnosed but untreated'
            ]
          }
        ]
      },
      {
        name: 'ADHD',
        details: [
          {
            label: 'Treatment Status',
            type: 'checkbox',
            options: [
              'Under psychological treatment',
              'Under psychiatric treatment',
              'Medication use',
              'Therapy only',
              'Previously diagnosed but untreated'
            ]
          }
        ]
      },
      { name: 'Autism Spectrum Disorder' },
      { name: 'Borderline Personality Disorder' },
      { name: 'Schizophrenia' },
      {
        name: 'Eating Disorders',
        details: [
          {
            label: 'Type',
            type: 'radio',
            options: ['Anorexia Nervosa', 'Bulimia Nervosa', 'Binge Eating Disorder']
          }
        ]
      },
      { name: 'Sleep-related mental disorders' },
      { name: 'Burnout Syndrome' },
      { name: 'Chronic Stress Disorder' },
      { name: 'Emotional Dysregulation' }
    ]
  },
  {
    name: 'Gastrointestinal Disorders',
    conditions: [
      'Gastroesophageal Reflux Disease (GERD)', 'Chronic Gastritis', 'Peptic Ulcer',
      'Duodenal Ulcer', 'Irritable Bowel Syndrome (IBS)', 'Inflammatory Bowel Disease',
      'Crohn\'s Disease', 'Ulcerative Colitis', 'Celiac Disease', 'Lactose Intolerance',
      'Fructose Intolerance', 'Small Intestinal Bacterial Overgrowth (SIBO)',
      'Chronic Constipation', 'Chronic Diarrhea', 'Diverticulosis', 'Diverticulitis',
      'Hemorrhoids', 'Anal Fissures', 'Hiatal Hernia', 'Abdominal Hernia',
      'Umbilical Hernia', 'Inguinal Hernia', 'Incisional Hernia', 'Rectal Prolapse',
      'Colon Polyps', 'Appendicitis (history)', 'Gallstones',
      'Gallbladder Inflammation (Cholecystitis)', 'Pancreatitis', 'Chronic Pancreatitis'
    ].map(name => ({
      name,
      details: [
        {
          label: 'Severity level',
          type: 'radio',
          options: ['Mild', 'Moderate', 'Severe', 'Occasional', 'Chronic']
        },
        {
          label: 'Triggers',
          type: 'checkbox',
          options: ['Food related', 'Stress related', 'Medication related']
        }
      ]
    }))
  },
  {
    name: 'Liver Diseases',
    conditions: [
      'Fatty Liver Disease (NAFLD)', 'Alcoholic Fatty Liver Disease', 'Hepatitis A',
      'Hepatitis B', 'Hepatitis C', 'Autoimmune Hepatitis', 'Liver Cirrhosis',
      'Primary Biliary Cholangitis', 'Primary Sclerosing Cholangitis', 'Liver Fibrosis',
      'Liver Failure', 'Liver Tumor'
    ].map(name => ({
      name,
      details: [
        {
          label: 'Status',
          type: 'radio',
          options: ['Active disease', 'Under treatment', 'Controlled']
        },
        {
          label: 'Type',
          type: 'radio',
          options: ['Alcohol-related', 'Non-alcohol-related']
        }
      ]
    }))
  },
  {
    name: 'Kidney and Urinary Diseases',
    conditions: [
      'Chronic Kidney Disease', 'Kidney Stones', 'Recurrent Kidney Stones',
      'Urinary Tract Infection (UTI)', 'Recurrent UTIs', 'Interstitial Cystitis',
      'Urinary Incontinence', 'Overactive Bladder', 'Prostate Enlargement (BPH)',
      'Prostatitis', 'Glomerulonephritis', 'Nephrotic Syndrome', 'Kidney Failure',
      'Dialysis (history)', 'Kidney transplant (history)'
    ].map(name => ({
      name,
      details: [
        {
          label: 'Stage of kidney disease',
          type: 'radio',
          options: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5 (Failure)', 'Unknown']
        },
        {
          label: 'Management',
          type: 'checkbox',
          options: ['Medication use', 'Dialysis status']
        }
      ]
    }))
  },
  {
    name: 'Autoimmune Diseases',
    conditions: [
      'Rheumatoid Arthritis', 'Systemic Lupus Erythematosus', 'Psoriasis',
      'Psoriatic Arthritis', 'Ankylosing Spondylitis', 'Sjogren\'s Syndrome',
      'Hashimoto\'s Thyroiditis', 'Graves\' Disease', 'Type 1 Diabetes',
      'Multiple Sclerosis', 'Celiac Disease', 'Vasculitis', 'Myasthenia Gravis',
      'Dermatomyositis', 'Polymyositis'
    ].map(name => ({ name }))
  },
  {
    name: 'Musculoskeletal Conditions',
    conditions: [
      'Osteoarthritis', 'Rheumatoid Arthritis', 'Chronic Back Pain', 'Lower Back Pain',
      'Herniated Disc', 'Spinal Disc Degeneration', 'Sciatica', 'Spinal Stenosis',
      'Scoliosis', 'Kyphosis', 'Fibromyalgia', 'Muscle Strain', 'Muscle Tear',
      'Ligament Injury', 'Joint Instability'
    ].map(name => ({ name }))
  },
  {
    name: 'Repetitive Strain Injury (RSI / LER)',
    conditions: [
      {
        name: 'Repetitive Strain Injury',
        details: [
          {
            label: 'Affected Body Area',
            type: 'radio',
            options: [
              'Neck', 'Shoulders', 'Upper back', 'Lower back', 'Arms', 'Elbows',
              'Forearms', 'Wrists', 'Hands', 'Fingers', 'Hips', 'Thighs', 'Knees',
              'Calves', 'Ankles', 'Feet', 'Toes'
            ]
          },
          {
            label: 'Pain Intensity',
            type: 'radio',
            options: ['Mild', 'Moderate', 'Severe']
          },
          {
            label: 'Cause',
            type: 'checkbox',
            options: ['Work-related injury', 'Exercise-related injury']
          }
        ]
      }
    ]
  },
  {
    name: 'Sports Injuries',
    conditions: [
      'ACL injury', 'Meniscus tear', 'Rotator cuff injury', 'Tennis elbow',
      'Golfer\'s elbow', 'Achilles tendon injury', 'Shin splints', 'Stress fracture',
      'Patellar tendonitis'
    ].map(name => ({ name }))
  },
  {
    name: 'Endocrine Disorders',
    conditions: [
      'Hypothyroidism', 'Hyperthyroidism', 'Thyroid Nodules', 'Goiter',
      'Polycystic Ovary Syndrome (PCOS)', 'Adrenal Insufficiency', 'Cushing\'s Syndrome',
      'Hyperparathyroidism', 'Hypoparathyroidism', 'Growth Hormone Deficiency',
      'Acromegaly', 'Pituitary Tumors', 'Hormonal Imbalance'
    ].map(name => ({ name }))
  },
  {
    name: 'Infectious Diseases',
    conditions: [
      { name: 'HIV/AIDS' },
      { name: 'Tuberculosis' },
      { name: 'Chronic Infections' }
    ]
  },
  {
    name: 'Cancer',
    conditions: [
      'Breast Cancer', 'Prostate Cancer', 'Lung Cancer', 'Colorectal Cancer',
      'Skin Cancer (Non-melanoma)', 'Melanoma', 'Stomach Cancer', 'Pancreatic Cancer',
      'Liver Cancer', 'Kidney Cancer', 'Bladder Cancer', 'Ovarian Cancer',
      'Cervical Cancer', 'Uterine Cancer (Endometrial)', 'Thyroid Cancer', 'Brain Tumor',
      'Leukemia', 'Lymphoma', 'Multiple Myeloma', 'Esophageal Cancer',
      'Gallbladder Cancer', 'Testicular Cancer', 'Bone Cancer', 'Soft Tissue Sarcoma',
      'Oral Cancer', 'Tongue Cancer', 'Throat Cancer (Pharyngeal)', 'Nasopharyngeal Cancer',
      'Laryngeal Cancer', 'Eye Cancer', 'Adrenal Cancer', 'Small Intestine Cancer',
      'Appendix Cancer', 'Anal Cancer'
    ].map(cancerType => ({
      name: cancerType,
      details: [
        {
          label: 'Status',
          type: 'radio',
          options: ['In treatment', 'Remission', 'Recovered', 'Chronic management']
        },
        {
          label: 'Treatment types',
          type: 'checkbox',
          options: ['Chemotherapy', 'Radiotherapy', 'Surgery', 'Immunotherapy', 'Hormone therapy']
        },
        { label: 'Year diagnosed', type: 'number' },
        { label: 'Affected organ or region', type: 'text' },
        {
          label: 'Monitoring',
          type: 'checkbox',
          options: ['Ongoing monitoring']
        }
      ]
    }))
  },
  {
    name: 'Sleep Disorders',
    conditions: [
      'Insomnia', 'Sleep Apnea', 'Narcolepsy', 'Restless Legs Syndrome',
      'Circadian Rhythm Disorder', 'Chronic Sleep Deprivation', 'Poor Sleep Quality'
    ].map(name => ({
      name,
      details: [
        {
          label: 'Symptoms',
          type: 'checkbox',
          options: [
            'Difficulty falling asleep',
            'Frequent awakenings',
            'Daytime sleepiness'
          ]
        },
        {
          label: 'Management',
          type: 'checkbox',
          options: ['Use of sleep medication']
        }
      ]
    }))
  },
  {
    name: 'Chronic Pain',
    conditions: [
      'Chronic migraine', 'Tension headache', 'Neuropathic pain', 'Post-surgical chronic pain'
    ].map(name => ({
      name,
      details: [
        {
          label: 'Location',
          type: 'radio',
          options: [
            'Head', 'Neck', 'Jaw', 'Shoulders', 'Chest', 'Upper back', 'Lower back',
            'Abdomen', 'Hips', 'Arms', 'Hands', 'Legs', 'Knees', 'Feet', 'Generalized pain'
          ]
        }
      ]
    }))
  },
  {
    name: 'Lifestyle Risk Factors',
    conditions: [
      'Sedentary lifestyle', 'Low physical activity', 'Poor diet quality',
      'High processed food consumption', 'High sugar intake', 'High salt intake',
      'Chronic stress', 'Irregular sleep schedule', 'Shift work schedule',
      'Burnout symptoms', 'Chronic fatigue', 'Emotional exhaustion',
      'High stress work environment', 'Low social interaction', 'Digital overuse',
      'Sedentary office work'
    ].map(name => ({ name }))
  },
  {
    name: 'Substance Use',
    conditions: [
      {
        name: 'Alcohol Consumption',
        details: [
          {
            label: 'Classification',
            type: 'radio',
            options: [
              'Occasional drinking',
              'Moderate drinking',
              'Frequent drinking',
              'Heavy drinking',
              'Alcohol dependence / alcoholism',
              'Recovery from alcohol use disorder'
            ]
          }
        ]
      },
      {
        name: 'Smoking (tobacco)',
        details: [
          {
            label: 'Status',
            type: 'radio',
            options: ['Current smoker', 'Former smoker', 'Passive smoke exposure']
          },
          {
            label: 'Frequency',
            type: 'radio',
            options: ['Daily', 'Occasional']
          }
        ]
      },
      { name: 'Former smoker' },
      { name: 'Electronic cigarettes / vaping' },
      { name: 'Recreational drug use' },
      { name: 'Prescription drug misuse' }
    ]
  },
  {
    name: 'Reproductive and Hormonal Conditions',
    conditions: [
      { name: 'Menopause' },
      { name: 'Endometriosis' },
      { name: 'Infertility' }
    ]
  },
  {
    name: 'Other condition / Not listed',
    conditions: [
      { name: 'Custom Condition' }
    ]
  }
];
