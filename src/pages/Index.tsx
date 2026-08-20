
import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Button } from '@/components/ui/button';
// Everything below only ever renders after a user navigates away from the dashboard (the one
// view guaranteed to be the first thing an authenticated user sees) — lazy so the initial
// authenticated load doesn't ship the Anam/WebRTC SDK, Stripe, and every other screen's JS up
// front. This (plus Index/LandingV2 staying eager for the logged-out first paint) was the biggest
// single contributor to a ~3.9MB single-chunk bundle.
const InterviewPlatform = lazy(() => import('@/components/InterviewPlatform').then((m) => ({ default: m.InterviewPlatform })));
const TavusInterviewPlatform = lazy(() => import('@/components/TavusInterviewPlatform').then((m) => ({ default: m.TavusInterviewPlatform })));
const InterviewPlatformV2 = lazy(() => import('@/components/InterviewPlatformV2').then((m) => ({ default: m.InterviewPlatformV2 })));
const InterviewSelection = lazy(() => import('@/components/InterviewSelection').then((m) => ({ default: m.InterviewSelection })));
const QuestionsHub = lazy(() => import('@/components/questions/QuestionsHub').then((m) => ({ default: m.QuestionsHub })));
const AchievementsPage = lazy(() => import('@/components/AchievementsPage').then((m) => ({ default: m.AchievementsPage })));
const GrownupView = lazy(() => import('@/components/GrownupView').then((m) => ({ default: m.GrownupView })));
const FeedbackHistory = lazy(() => import('@/components/FeedbackHistory').then((m) => ({ default: m.FeedbackHistory })));
const UserSettings = lazy(() => import('@/components/UserSettings').then((m) => ({ default: m.UserSettings })));
const CreditsStore = lazy(() => import('@/components/credits/CreditsStore').then((m) => ({ default: m.CreditsStore })));
const PaymentSuccess = lazy(() => import('@/components/PaymentSuccess').then((m) => ({ default: m.PaymentSuccess })));
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, Video, History, ArrowLeft, Settings, Wallet, ListChecks, Trophy, LogOut, UserCog } from 'lucide-react';
import { InterviewType } from '@/config/interviewTypes';
import { useCredits } from '@/hooks/useCredits';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Landing page (marketing) — the new design, rendered 1:1 from the authored HTML.
import { LandingV2 } from '@/components/landing/LandingV2';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { SidebarNav, SidebarTopBar } from '@/components/dashboard/SidebarLayout';
import { LayoutGrid, PanelLeft } from 'lucide-react';

const Index = () => {
  const {
    user,
    loading,
    signOut,
    showPostSignupForm,
    setShowPostSignupForm
  } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'dashboard' | 'selection' | 'interview' | 'history' | 'settings' | 'credits' | 'questions' | 'achievements' | 'grownup'>('dashboard');
  const [selectedInterviewType, setSelectedInterviewType] = useState<InterviewType | null>(null);
  const [paymentSuccessDismissed, setPaymentSuccessDismissed] = useState(false);
  // Testing aid: bump to force-restart the guided tour (see Dashboard's "Replay onboarding flow"
  // button, admin-only). replayingOnboarding gates the school-selection step back in first, so the
  // whole chain (schools -> founder video -> walkthrough) replays like a real fresh sign-on.
  const [tourRestartKey, setTourRestartKey] = useState(0);
  const [replayingOnboarding, setReplayingOnboarding] = useState(false);
  const handleReplayOnboarding = () => {
    setReplayingOnboarding(true);
    setShowPostSignupForm(true);
  };
  const handleOnboardingComplete = () => {
    setShowPostSignupForm(false);
    if (replayingOnboarding) {
      setReplayingOnboarding(false);
      setTourRestartKey((k) => k + 1);
    }
  };
  // Dashboard 1 (top-nav) vs Dashboard 2 (left sidebar) — admin-only preview now, not a public
  // toggle. Reachable via /admin's "Preview Dashboard 2" link (?dashboardLayout=sidebar) or the
  // corner toggle, both hidden from regular users; non-admins are force-reset to topnav below in
  // case a browser has a stale 'sidebar' value in localStorage from before this was admin-gated.
  const { isAdmin } = useAdminStatus();
  const [dashboardLayout, setDashboardLayout] = useState<'topnav' | 'sidebar'>(
    () => (localStorage.getItem('intrvue-dashboard-layout') as 'topnav' | 'sidebar' | null) ?? 'topnav'
  );
  useEffect(() => {
    localStorage.setItem('intrvue-dashboard-layout', dashboardLayout);
  }, [dashboardLayout]);
  useEffect(() => {
    if (!isAdmin && dashboardLayout === 'sidebar') setDashboardLayout('topnav');
  }, [isAdmin, dashboardLayout]);
  useEffect(() => {
    if (!isAdmin) return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('dashboardLayout');
    if (requested === 'sidebar' || requested === 'topnav') {
      setDashboardLayout(requested);
      params.delete('dashboardLayout');
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState({}, '', url.toString());
    }
  }, [isAdmin]);

  // Reachable from /admin's "Replay onboarding flow" link (?replayOnboarding=true) as well as the
  // Dashboard's own floating button — same handler either way.
  useEffect(() => {
    if (!isAdmin) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('replayOnboarding') === 'true') {
      handleReplayOnboarding();
      params.delete('replayOnboarding');
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const { credits, refetchCredits } = useCredits();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSelectInterview = async (interviewType: InterviewType) => {
    // Check and consume a credit before starting an interview
    if (!user) {
      setCurrentView('selection');
      return;
    }
    try {
      const cost = interviewType.costCredits ?? 1;

      // Free/demo interviews: skip credit checks and consumption
      if (cost === 0) {
        setSelectedInterviewType(interviewType);
        setCurrentView('interview');
        return;
      }

      // If we know balance and it's 0, shortcut to credits
      if ((credits ?? 0) <= 0) {
        toast({
          title: "You're out of credits",
          description: "Buy credits to start a new interview.",
        });
        setCurrentView('credits');
        return;
      }

      const { data, error } = await supabase.rpc('consume_credit');
      if (error) {
        console.error('consume_credit error', error);
        toast({
          title: "Unable to start interview",
          description: "There was a problem consuming a credit. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data !== true) {
        toast({
          title: "No credits available",
          description: "Please purchase more credits to continue.",
        });
        setCurrentView('credits');
        return;
      }

      // Locally refresh credits and proceed
      refetchCredits();
      setSelectedInterviewType(interviewType);
      setCurrentView('interview');
    } catch (e: any) {
      console.error('start interview error', e);
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBackToSelection = () => {
    setCurrentView('selection');
    setSelectedInterviewType(null);
  };

  // Detect payment success via URL and display success page
  const showPaymentSuccess = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (paymentSuccessDismissed) return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'payment-success' || !!params.get('session_id');
  }, [typeof window, paymentSuccessDismissed]);

  useEffect(() => {
    // If we just paid, refresh credits once landing back
    if (showPaymentSuccess) {
      refetchCredits();
    }
  }, [showPaymentSuccess, refetchCredits]);

  // Function to clear URL parameters and dismiss payment success
  const clearPaymentSuccessAndNavigate = (view: 'dashboard' | 'selection' | 'interview' | 'history' | 'settings' | 'credits' | 'questions' | 'achievements' | 'grownup') => {
    // Clear URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
    
    // Dismiss payment success and navigate
    setPaymentSuccessDismissed(true);
    setCurrentView(view);
  };

  // Show loading spinner while checking auth
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }

  // Show landing page if not authenticated
  if (!user) {
    return <LandingV2 onSignUp={() => navigate('/auth')} />;
  }

  // Full-page takeover for onboarding (fresh sign-ups, or the admin "Replay onboarding flow" aid)
  // — its own header stands in for the real nav, then chains into the guided tour + founder video.
  if (showPostSignupForm) {
    return <OnboardingFlow userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  // Grown-up view is a full-page takeover, not another tab inside the kid-facing nav — it has its
  // own "Back to home" button, and showing the Practise/Questions/Feedback pills alongside it let
  // you click straight through it into another view while its own transcript dialog was still
  // mounted, leaving the page in a broken state.
  if (currentView === 'grownup') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <GrownupView onBack={() => setCurrentView('dashboard')} />
      </Suspense>
    );
  }

  // Show main app for authenticated users
  return <div className={cn("min-h-screen", dashboardLayout === 'sidebar' && "md:flex")}>
      {dashboardLayout === 'sidebar' && (
        <SidebarNav
          currentView={currentView}
          onNavigate={(v) => (showPaymentSuccess ? clearPaymentSuccessAndNavigate(v) : setCurrentView(v))}
          onSignOut={handleSignOut}
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col">
      {dashboardLayout === 'sidebar' && (
        <SidebarTopBar
          currentView={currentView}
          onNavigate={(v) => (showPaymentSuccess ? clearPaymentSuccessAndNavigate(v) : setCurrentView(v))}
          credits={credits ?? 0}
          user={user}
        />
      )}
      {/* Original top-nav header — hidden on desktop when the sidebar layout is active; mobile
          always uses this regardless of layout choice (a fixed icon rail doesn't fit a phone). */}
      <header className={cn("border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", dashboardLayout === 'sidebar' && "md:hidden")}>
        <div className="container flex h-14 items-center justify-between px-4">
          {/* Mobile Layout */}
          <div className="flex items-center gap-2 md:gap-6 w-full">
            {/* Logo and Back Button */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                aria-label="intrvue — go to home"
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setSelectedInterviewType(null);
                  if (showPaymentSuccess) clearPaymentSuccessAndNavigate('dashboard');
                  else setCurrentView('dashboard');
                }}
              >
                <img src="/lovable-uploads/logo.png" alt="intrvue.ai" className="h-[26px] md:h-[30px] w-auto" />
              </button>
              {currentView === 'interview' && selectedInterviewType && (
                <Button variant="ghost" size="sm" onClick={handleBackToSelection} className="gap-1 md:gap-2 px-2 md:px-3">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
            </div>
            
            {/* Desktop Navigation — text pills, active filled ink (mock) */}
            {currentView !== 'interview' && (
              <nav className="hidden lg:flex items-center gap-1 ml-3">
                {([
                  ['dashboard', 'Home', undefined],
                  ['selection', 'Practise', 'nav-practice'],
                  ['questions', 'Questions', 'nav-questions'],
                  ['history', 'Feedback', 'nav-history'],
                  ['achievements', 'Achievements', 'nav-achievements'],
                  ['credits', 'Buy Credits', undefined],
                ] as const).map(([view, label, tourKey]) => {
                  const active = currentView === view;
                  return (
                    <button
                      key={view}
                      onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate(view) : setCurrentView(view)}
                      data-tour={tourKey}
                      className={cn(
                        'px-3 py-2 rounded-xl text-[13px] font-extrabold whitespace-nowrap transition-colors',
                        active ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white hover:bg-white/5',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="px-3 py-2 rounded-xl text-[13px] font-extrabold whitespace-nowrap transition-colors text-muted-foreground hover:text-white hover:bg-white/5"
                  >
                    Admin Dashboard
                  </button>
                )}
              </nav>
            )}

            {/* Mobile Navigation - Icons Only */}
            {currentView !== 'interview' && (
              <nav className="flex lg:hidden gap-1 ml-auto">
                <Button
                  variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('dashboard') : setCurrentView('dashboard')}
                  className="p-2"
                  aria-label="Home"
                >
                  <Home className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentView === 'selection' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('selection') : setCurrentView('selection')}
                  data-tour="nav-practice"
                  className="p-2"
                  aria-label="Practice"
                >
                  <Video className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentView === 'questions' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('questions') : setCurrentView('questions')}
                  data-tour="nav-questions"
                  className="p-2"
                  aria-label="Questions"
                >
                  <ListChecks className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentView === 'achievements' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('achievements') : setCurrentView('achievements')}
                  data-tour="nav-achievements"
                  className="p-2"
                  aria-label="Achievements"
                >
                  <Trophy className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentView === 'history' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('history') : setCurrentView('history')}
                  data-tour="nav-history"
                  className="p-2"
                  aria-label="History"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentView === 'credits' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('credits') : setCurrentView('credits')}
                  className="p-2"
                  aria-label="Credits"
                >
                  <Wallet className="w-4 h-4" />
                </Button>
                <Button 
                  variant={currentView === 'settings' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('settings') : setCurrentView('settings')} 
                  className="p-2"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="p-2"
                    aria-label="Admin Dashboard"
                  >
                    <UserCog className="w-4 h-4" />
                  </Button>
                )}
              </nav>
            )}
          </div>
          
          {/* Desktop User Info — credits pill + avatar (Settings/Grown-up/Sign out live in its dropdown) */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              onClick={() => setCurrentView('credits')}
              className="px-3.5 py-[7px] rounded-full border border-foreground/15 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {credits ?? 0} credits
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-rose flex items-center justify-center font-extrabold text-[13px] text-white select-none hover:opacity-90 transition-opacity"
                  title={user.user_metadata?.full_name || user.email || undefined}
                >
                  {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('settings') : setCurrentView('settings')}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('grownup') : setCurrentView('grownup')}>
                  <UserCog className="w-4 h-4 mr-2" /> Grown-up view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Mobile User Info - Credits Badge Only */}
          <div className="md:hidden">
            <Badge variant="outline" className="text-xs">
              {credits ?? 0}
            </Badge>
          </div>
        </div>
      </header>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          currentView={currentView}
          credits={credits ?? 0}
          onViewChange={showPaymentSuccess ? clearPaymentSuccessAndNavigate : setCurrentView}
          onSignOut={handleSignOut}
        />
      )}
      
      <main className={cn("pb-safe", isMobile && "pb-20")}>
        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }>
        {showPaymentSuccess ? (
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <PaymentSuccess 
              onGoToPractice={() => clearPaymentSuccessAndNavigate('selection')} 
              onGoToCredits={() => clearPaymentSuccessAndNavigate('credits')}
            />
          </div>
        ) : currentView === 'dashboard' ? (
          <Dashboard
            onStartInterview={() => setCurrentView('selection')}
            onViewHistory={() => setCurrentView('history')}
            onManageDates={() => setCurrentView('settings')}
            onAchievements={() => setCurrentView('achievements')}
            onReplayTour={isAdmin ? handleReplayOnboarding : undefined}
          />
        ) : currentView === 'selection' ? (
          <InterviewSelection onSelectInterview={handleSelectInterview} />
        ) : currentView === 'questions' ? (
          <QuestionsHub name={(user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || user.email?.split('@')[0]} onViewHistory={() => setCurrentView('history')} />
        ) : currentView === 'achievements' ? (
          <AchievementsPage />
        ) : currentView === 'interview' ? (
          selectedInterviewType?.provider === 'tavus' ? (
            <div className="container mx-auto px-4 py-8">
              <TavusInterviewPlatform selectedInterviewType={selectedInterviewType} />
            </div>
          ) : selectedInterviewType?.provider === 'anam-deepgram' ? (
            <InterviewPlatformV2 selectedInterviewType={selectedInterviewType} />
          ) : (
            <InterviewPlatform selectedInterviewType={selectedInterviewType} />
          )
        ) : currentView === 'history' ? (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <FeedbackHistory />
          </div>
        ) : currentView === 'credits' ? (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Buy Credits</h2>
                <p className="text-muted-foreground">
                  You currently have <span className="font-semibold">{credits ?? 0}</span> credit{(credits ?? 0) === 1 ? '' : 's'}.
                </p>
              </div>
              <CreditsStore />
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <UserSettings />
          </div>
        )}
        </Suspense>
      </main>
      </div>

      {/* First-time guided tour — paused while another modal/form is already on top */}
      <TourOverlay suspended={showPaymentSuccess} restartKey={tourRestartKey} />

      {/* Dashboard layout toggle — admin-only (regular users always get top-nav). Desktop-only
          (the sidebar itself doesn't apply on mobile, so there's nothing to toggle). */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setDashboardLayout((l) => (l === 'topnav' ? 'sidebar' : 'topnav'))}
          className="hidden md:flex fixed bottom-5 right-5 z-40 items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-[12.5px] font-semibold shadow-medium hover:bg-accent transition-colors"
        >
          {dashboardLayout === 'topnav' ? <PanelLeft className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          Admin: switch to {dashboardLayout === 'topnav' ? 'Dashboard 2' : 'Dashboard 1'}
        </button>
      )}
    </div>;
};
export default Index;
