import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import { HealthProvider, useHealth } from './context/HealthContext';

// Route screens are loaded on demand instead of all up front — the first
// paint no longer waits on code the user might never visit this session.
const Home = lazy(() => import('./components/Home'));
const Medical = lazy(() => import('./components/Medical'));
const Nutrition = lazy(() => import('./components/Nutrition'));
const Exercises = lazy(() => import('./components/Exercises'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));
const MetricDetail = lazy(() => import('./components/MetricDetail'));
const Insights = lazy(() => import('./components/Insights'));
const Notifications = lazy(() => import('./components/Notifications'));
const Calendar = lazy(() => import('./components/Calendar'));
const Profile = lazy(() => import('./components/Profile'));
const WaterTracking = lazy(() => import('./components/WaterTracking'));
const PrivacySecurity = lazy(() => import('./components/PrivacySecurity'));
const Personalize = lazy(() => import('./components/Personalize'));
const LanguageRegional = lazy(() => import('./components/LanguageRegional'));
const HelpSupport = lazy(() => import('./components/HelpSupport'));
const PerformanceDashboard = lazy(() =>
  import('./components/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard }))
);

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

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
      <Suspense fallback={<RouteLoadingFallback />}>
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
            <Route path="profile/personalize" element={<Personalize />} />
            <Route path="profile/language" element={<LanguageRegional />} />
            <Route path="profile/help" element={<HelpSupport />} />
            <Route path="performance" element={<PerformanceDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
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
