import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { InterviewPlatform } from '@/components/InterviewPlatform';
import { InterviewSelection } from '@/components/InterviewSelection';
import { FeedbackHistory } from '@/components/FeedbackHistory';
import { Button } from '@/components/ui/button';
import { Video, History, ArrowLeft } from 'lucide-react';
import { InterviewType } from '@/config/interviewTypes';

// Landing page components
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingInterviewTypes } from '@/components/landing/LandingInterviewTypes';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingProcess } from '@/components/landing/LandingProcess';
import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingTruth } from '@/components/landing/LandingTruth';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

/**
 * Main Index Page - 11+ Interview Preparation Platform
 * Entry point for the interview preparation application
 */
const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'selection' | 'interview' | 'history'>('selection');
  const [selectedInterviewType, setSelectedInterviewType] = useState<InterviewType | null>(null);

  // No automatic redirect - let unauthenticated users see the landing page

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSelectInterview = (interviewType: InterviewType) => {
    setSelectedInterviewType(interviewType);
    setCurrentView('interview');
  };

  const handleBackToSelection = () => {
    setCurrentView('selection');
    setSelectedInterviewType(null);
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen">
        <LandingHero onSignUp={() => navigate('/auth')} />
        <LandingInterviewTypes />
        <LandingFeatures />
        <LandingProcess />
        <LandingDemo />
        <LandingTruth />
        <LandingPricing onSignUp={() => navigate('/auth')} />
        <LandingFAQ />
        <LandingCTA onSignUp={() => navigate('/auth')} />
        <LandingFooter />
      </div>
    );
  }

  // Show main app for authenticated users
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {currentView === 'interview' && selectedInterviewType && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToSelection}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <h1 className="text-lg font-semibold">
                {currentView === 'interview' && selectedInterviewType 
                 ? `${selectedInterviewType.name} Practice`
                  : 'Intrvue AI'
                }
              </h1>
            </div>
            {currentView !== 'interview' && (
              <nav className="flex gap-2">
                <Button 
                  variant={currentView === 'selection' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setCurrentView('selection')}
                  className="gap-2"
                >
                  <Video className="w-4 h-4" />
                  Practice
                </Button>
                <Button 
                  variant={currentView === 'history' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setCurrentView('history')}
                  className="gap-2"
                >
                  <History className="w-4 h-4" />
                  History
                </Button>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main>
        {currentView === 'selection' ? (
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <InterviewSelection onSelectInterview={handleSelectInterview} />
          </div>
        ) : currentView === 'interview' ? (
          <InterviewPlatform selectedInterviewType={selectedInterviewType} />
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <FeedbackHistory />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
