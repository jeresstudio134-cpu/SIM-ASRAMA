import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { LayoutShell, NavTabId, NAV_ITEMS } from './components/LayoutShell';
import { SetupGuideModal } from './components/SetupGuideModal';
import { DashboardView } from './pages/DashboardView';
import { SantriView } from './pages/SantriView';
import { PelanggaranView } from './pages/PelanggaranView';
import { KonselingView } from './pages/KonselingView';
import { PrestasiView } from './pages/PrestasiView';
import { KeuanganView } from './pages/KeuanganView';
import { KamarPerizinanView } from './pages/KamarPerizinanView';
import { LaporanView } from './pages/LaporanView';
import { ManajemenPenggunaView } from './pages/ManajemenPenggunaView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedPortal: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId>('santri');
  const [docsOpen, setDocsOpen] = useState(false);

  // Ensure activeTab is always allowed for the logged-in user's role
  useEffect(() => {
    if (!user) return;
    const item = NAV_ITEMS.find((n) => n.id === activeTab);
    if (!item || !item.allowedRoles.includes(user.role)) {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 text-xs font-semibold text-slate-600 shadow-xs">
          Memverifikasi sesi otentikasi SIM-ASRAMA...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <LayoutShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDocsModal={() => setDocsOpen(true)}
      >
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'santri' && <SantriView />}
        {activeTab === 'violations' && <PelanggaranView />}
        {activeTab === 'counseling' && <KonselingView />}
        {activeTab === 'achievements' && <PrestasiView />}
        {activeTab === 'finance' && <KeuanganView />}
        {activeTab === 'rooms' && <KamarPerizinanView />}
        {activeTab === 'reports' && <LaporanView />}
        {activeTab === 'users' && user.role === 'admin' && <ManajemenPenggunaView />}
      </LayoutShell>

      <SetupGuideModal open={docsOpen} onClose={() => setDocsOpen(false)} />
    </>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProtectedPortal />
      </AuthProvider>
    </QueryClientProvider>
  );
}
