
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { InterviewPlatform } from '@/components/InterviewPlatform';
import { PostSignupForm } from '@/components/PostSignupForm';
import { InterviewSelection } from '@/components/InterviewSelection';
import { FeedbackHistory } from '@/components/FeedbackHistory';
import { UserSettings } from '@/components/UserSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, History, ArrowLeft, Settings, Wallet } from 'lucide-react';
import { InterviewType } from '@/config/interviewTypes';
import { useCredits } from '@/hooks/useCredits';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Landing page components
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingInterviewTypes } from '@/components/landing/LandingInterviewTypes';
import { LandingProcess } from '@/components/landing/LandingProcess';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingTruth } from '@/components/landing/LandingTruth';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { CreditsStore } from '@/components/credits/CreditsStore';
import { PaymentSuccess } from '@/components/PaymentSuccess';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const {
    user,
    loading,
    signOut,
    showPostSignupForm,
    setShowPostSignupForm
  } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'selection' | 'interview' | 'history' | 'settings' | 'credits'>('selection');
  const [selectedInterviewType, setSelectedInterviewType] = useState<InterviewType | null>(null);

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
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'payment-success' || !!params.get('session_id');
  }, [typeof window]);

  useEffect(() => {
    // If we just paid, refresh credits once landing back
    if (showPaymentSuccess) {
      refetchCredits();
    }
  }, [showPaymentSuccess, refetchCredits]);

  // Show loading spinner while checking auth
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }

  // Show landing page if not authenticated
  if (!user) {
    return <div className="min-h-screen">
        <LandingHero onSignUp={() => navigate('/auth')} />
        <LandingInterviewTypes />
        <LandingProcess />
        <LandingTruth />
        <LandingPricing onSignUp={() => navigate('/auth')} />
        <LandingFAQ />
        <LandingCTA onSignUp={() => navigate('/auth')} />
        <LandingFooter />
      </div>;
  }

  // Show main app for authenticated users
  return <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          {/* Mobile Layout */}
          <div className="flex items-center gap-2 md:gap-6 w-full">
            {/* Logo and Back Button */}
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/lovable-uploads/logo.png" alt="Intrvue.ai Logo" className="h-6 md:h-8 w-auto" />
              {currentView === 'interview' && selectedInterviewType && (
                <Button variant="ghost" size="sm" onClick={handleBackToSelection} className="gap-1 md:gap-2 px-2 md:px-3">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
            </div>
            
            {/* Desktop Navigation */}
            {currentView !== 'interview' && (
              <nav className="hidden lg:flex gap-2">
                <Button variant={currentView === 'selection' ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentView('selection')} className="gap-2">
                  <Video className="w-4 h-4" />
                  Practice
                </Button>
                <Button variant={currentView === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentView('history')} className="gap-2">
                  <History className="w-4 h-4" />
                  History
                </Button>
                <Button variant={currentView === 'credits' ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentView('credits')} className="gap-2">
                  <Wallet className="w-4 h-4" />
                  Credits
                </Button>
                <Button variant={currentView === 'settings' ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentView('settings')} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </nav>
            )}
            
            {/* Mobile Navigation - Icons Only */}
            {currentView !== 'interview' && (
              <nav className="flex lg:hidden gap-1 ml-auto">
                <Button 
                  variant={currentView === 'selection' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setCurrentView('selection')} 
                  className="p-2"
                  aria-label="Practice"
                >
                  <Video className="w-4 h-4" />
                </Button>
                <Button 
                  variant={currentView === 'history' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setCurrentView('history')} 
                  className="p-2"
                  aria-label="History"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button 
                  variant={currentView === 'credits' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setCurrentView('credits')} 
                  className="p-2"
                  aria-label="Credits"
                >
                  <Wallet className="w-4 h-4" />
                </Button>
                <Button 
                  variant={currentView === 'settings' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setCurrentView('settings')} 
                  className="p-2"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </nav>
            )}
          </div>
          
          {/* Desktop User Info */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            <span className="text-xs lg:text-sm text-muted-foreground truncate max-w-32 lg:max-w-none">
              {user.user_metadata?.full_name || user.email}
            </span>
            <Badge variant="outline" className="text-xs">
              {credits ?? 0}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setCurrentView('credits')} className="hidden lg:flex">
              Buy Credits
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <span className="hidden lg:inline">Sign Out</span>
              <span className="lg:hidden">Out</span>
            </Button>
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
          onViewChange={setCurrentView}
          onSignOut={handleSignOut}
        />
      )}
      
      <main className={cn("pb-safe", isMobile && "pb-20")}>
        {showPaymentSuccess ? (
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            <PaymentSuccess onGoToPractice={() => setCurrentView('selection')} />
          </div>
        ) : currentView === 'selection' ? (
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <InterviewSelection onSelectInterview={handleSelectInterview} />
          </div>
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
    </div>;
};
export default Index;
