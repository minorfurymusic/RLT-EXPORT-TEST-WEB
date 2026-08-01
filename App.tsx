import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import Medical from './components/Medical';
import Nutrition from './components/Nutrition';
import Exercises from './components/Exercises';
import AIAssistant from './components/AIAssistant';
import MetricDetail from './components/MetricDetail';
import Insights from './components/Insights';
import Notifications from './components/Notifications';
import Calendar from './components/Calendar';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import WaterTracking from './components/WaterTracking';
import PrivacySecurity from './components/PrivacySecurity';
import LanguageRegional from './components/LanguageRegional';
import HelpSupport from './components/HelpSupport';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { HealthProvider, useHealth } from './context/HealthContext';

function AppRoutes() {
  const { profile, appLanguage, googleUser } = useHealth();

  if (!googleUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-sans" dir={appLanguage === 'ar-SA' ? 'rtl' : 'ltr'}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  if (!profile.onboardingCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-sans" dir={appLanguage === 'ar-SA' ? 'rtl' : 'ltr'}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-sans" dir={appLanguage === 'ar-SA' ? 'rtl' : 'ltr'}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="medical" element={<Medical />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="metric/hydration" element={<WaterTracking />} />
          <Route path="metric/:metricType" element={<MetricDetail />} />
          <Route path="insights" element={<Insights />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/privacy" element={<PrivacySecurity />} />
          <Route path="profile/language" element={<LanguageRegional />} />
          <Route path="profile/help" element={<HelpSupport />} />
          <Route path="performance" element={<PerformanceDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HealthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </HealthProvider>
  );
}
