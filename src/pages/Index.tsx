
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { InterviewPlatform } from '@/components/InterviewPlatform';
import { PostSignupForm } from '@/components/PostSignupForm';
import { InterviewSelection } from '@/components/InterviewSelection';
import { QuestionsHub } from '@/components/questions/QuestionsHub';
import { AchievementsPage } from '@/components/AchievementsPage';
import { GrownupView } from '@/components/GrownupView';
import { LockerRoom } from '@/components/LockerRoom';
import { FeedbackHistory } from '@/components/FeedbackHistory';
import { UserSettings } from '@/components/UserSettings';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Video, History, ArrowLeft, Settings, Wallet, ListChecks, Trophy, LogOut } from 'lucide-react';
import { InterviewType } from '@/config/interviewTypes';
import { useCredits } from '@/hooks/useCredits';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Landing page (marketing) — the new design, rendered 1:1 from the authored HTML.
import { LandingV2 } from '@/components/landing/LandingV2';
import { CreditsStore } from '@/components/credits/CreditsStore';
import { PaymentSuccess } from '@/components/PaymentSuccess';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { PipMark } from '@/components/brand/Pip';
import { useIsMobile } from '@/hooks/use-mobile';
import { TourOverlay } from '@/components/tour/TourOverlay';

const Index = () => {
  const {
    user,
    loading,
    signOut,
    showPostSignupForm,
    setShowPostSignupForm
  } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'dashboard' | 'selection' | 'interview' | 'history' | 'settings' | 'credits' | 'questions' | 'achievements' | 'locker' | 'grownup'>('dashboard');
  const [selectedInterviewType, setSelectedInterviewType] = useState<InterviewType | null>(null);
  const [paymentSuccessDismissed, setPaymentSuccessDismissed] = useState(false);
  // Testing aid: bump to force-restart the guided tour (see Dashboard's "Replay tour" button).
  const [tourRestartKey, setTourRestartKey] = useState(0);

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
  const clearPaymentSuccessAndNavigate = (view: 'dashboard' | 'selection' | 'interview' | 'history' | 'settings' | 'credits' | 'questions' | 'achievements' | 'locker' | 'grownup') => {
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

  // Show main app for authenticated users
  return <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                <PipMark size={30} />
                <span className="font-display text-lg md:text-xl font-semibold tracking-tight text-white">intrvue</span>
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
                  ['selection', 'Practice', 'nav-practice'],
                  ['questions', 'Questions', undefined],
                  ['achievements', 'Achievements', 'nav-achievements'],
                  ['locker', 'Locker room', undefined],
                  ['history', 'My sessions', undefined],
                  ['settings', 'Settings', undefined],
                  ['credits', 'Buy Credits', 'nav-credits'],
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
                  className="p-2"
                  aria-label="History"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentView === 'credits' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('credits') : setCurrentView('credits')}
                  data-tour="nav-credits"
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
              </nav>
            )}
          </div>
          
          {/* Desktop User Info — credits pill + Grown-up + avatar + Sign out (mock) */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              onClick={() => setCurrentView('credits')}
              className="px-3.5 py-[7px] rounded-full border border-foreground/15 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {credits ?? 0} credits
            </button>
            {currentView !== 'interview' && (
              <button
                onClick={() => showPaymentSuccess ? clearPaymentSuccessAndNavigate('grownup') : setCurrentView('grownup')}
                className={cn(
                  'px-3.5 py-[7px] rounded-full text-[12.5px] font-extrabold whitespace-nowrap transition-colors border',
                  currentView === 'grownup'
                    ? 'bg-white/10 text-white border-white/15'
                    : 'text-muted-foreground border-foreground/15 hover:text-white hover:bg-white/5',
                )}
              >
                Grown-up
              </button>
            )}
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-rose flex items-center justify-center font-extrabold text-[13px] text-white select-none"
              title={user.user_metadata?.full_name || user.email || undefined}
              aria-hidden="true"
            >
              {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-[7px] rounded-full text-[12.5px] font-extrabold text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
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
            onReplayTour={() => setTourRestartKey((k) => k + 1)}
          />
        ) : currentView === 'selection' ? (
          <InterviewSelection onSelectInterview={handleSelectInterview} />
        ) : currentView === 'questions' ? (
          <QuestionsHub name={(user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || user.email?.split('@')[0]} onViewHistory={() => setCurrentView('history')} />
        ) : currentView === 'achievements' ? (
          <AchievementsPage onLockerRoom={() => setCurrentView('locker')} />
        ) : currentView === 'locker' ? (
          <LockerRoom onAchievements={() => setCurrentView('achievements')} />
        ) : currentView === 'grownup' ? (
          <GrownupView onBack={() => setCurrentView('dashboard')} />
        ) : currentView === 'interview' ? (
          <InterviewPlatform selectedInterviewType={selectedInterviewType} />
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
      </main>
      
      {/* Post-signup form */}
      {user && showPostSignupForm && (
        <PostSignupForm
          isOpen={showPostSignupForm}
          onClose={() => setShowPostSignupForm(false)}
          userId={user.id}
        />
      )}

      {/* First-time guided tour — paused while another modal/form is already on top */}
      <TourOverlay suspended={showPostSignupForm || showPaymentSuccess} restartKey={tourRestartKey} />
    </div>;
};
export default Index;
