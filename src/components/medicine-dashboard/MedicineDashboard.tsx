import { lazy, Suspense, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { InterviewType } from '@/config/interviewTypes';
import type { ProductLine } from '@/lib/productLine';
import { MedicineDashboardShell, MedicineTab } from './MedicineDashboardShell';
import { MedicineHome } from './MedicineHome';
import { MedicinePractice } from './MedicinePractice';
import { MedicineProgress } from './MedicineProgress';
import { MedicineSchools } from './MedicineSchools';
import { MedicineFeedback } from './MedicineFeedback';

const GrownupView = lazy(() => import('@/components/GrownupView').then((m) => ({ default: m.GrownupView })));
const UserSettings = lazy(() => import('@/components/UserSettings').then((m) => ({ default: m.UserSettings })));
const CreditsStore = lazy(() => import('@/components/credits/CreditsStore').then((m) => ({ default: m.CreditsStore })));

type AccountView = 'credits' | 'settings' | 'grownup' | null;

interface Props {
  onProductLineChange: (line: ProductLine) => void;
  onStartInterview: (type: InterviewType) => void;
  onSignOut: () => void;
  onSwitchToClassic: () => void;
}

/**
 * Only ever mounted when productLine === 'medicine' AND medicineDashboardStyle === 'coral' (see
 * Index.tsx's early-return branch). Owns its own 5-tab navigation state; interview start and
 * sign-out are delegated back up to Index.tsx so they reuse the exact same credit-consuming
 * session-start path 11+ already uses.
 */
export function MedicineDashboard({ onProductLineChange, onStartInterview, onSignOut, onSwitchToClassic }: Props) {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [activeTab, setActiveTab] = useState<MedicineTab>('home');
  const [accountView, setAccountView] = useState<AccountView>(null);

  const userInitial = ((user?.user_metadata?.full_name as string | undefined)?.[0] || user?.email?.[0] || '?').toUpperCase();

  // Full-page takeover, same reasoning as Index.tsx's own 'grownup' branch: it has its own "Back"
  // button and a transcript dialog, so it must not sit inside the shell with the tab bar (desktop)
  // or bottom nav (mobile) still clickable underneath it.
  if (accountView === 'grownup') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--med-bg)' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--med-primary)' }} />
        </div>
      }>
        <GrownupView onBack={() => setAccountView(null)} />
      </Suspense>
    );
  }

  if (accountView) {
    return (
      <MedicineDashboardShell
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setAccountView(null); }}
        productLine="medicine"
        onProductLineChange={onProductLineChange}
        credits={credits}
        onOpenCredits={() => setAccountView('credits')}
        onOpenSettings={() => setAccountView('settings')}
        onOpenGrownup={() => setAccountView('grownup')}
        onSignOut={onSignOut}
        onSwitchToClassic={onSwitchToClassic}
        userInitial={userInitial}
      >
        <Suspense fallback={null}>
          <button onClick={() => setAccountView(null)} style={{ background: 'none', border: 0, color: 'var(--med-primary-dark)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
            ← Back to dashboard
          </button>
          {accountView === 'credits' && <CreditsStore />}
          {accountView === 'settings' && <UserSettings />}
        </Suspense>
      </MedicineDashboardShell>
    );
  }

  return (
    <MedicineDashboardShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      productLine="medicine"
      onProductLineChange={onProductLineChange}
      credits={credits}
      onOpenCredits={() => setAccountView('credits')}
      onOpenSettings={() => setAccountView('settings')}
      onOpenGrownup={() => setAccountView('grownup')}
      onSignOut={onSignOut}
      onSwitchToClassic={onSwitchToClassic}
      userInitial={userInitial}
    >
      {activeTab === 'home' && (
        <MedicineHome
          credits={credits}
          onStartInterview={onStartInterview}
          onOpenTab={setActiveTab}
          onOpenCredits={() => setAccountView('credits')}
        />
      )}
      {activeTab === 'practice' && <MedicinePractice onStartInterview={onStartInterview} scope={user?.id ?? 'guest'} />}
      {activeTab === 'progress' && <MedicineProgress />}
      {activeTab === 'schools' && <MedicineSchools onStartInterview={onStartInterview} />}
      {activeTab === 'feedback' && <MedicineFeedback />}
    </MedicineDashboardShell>
  );
}
