import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface LandingHeroProps {
  onSignUp: () => void;
}

export const LandingHero = ({ onSignUp }: LandingHeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Side */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Master Your Interview Skills with{' '}
                <span className="text-primary">Digital Human</span> Interviewers
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Get instant feedback and practice with realistic digital human interviews for school admissions, language tests, and professional development. Available 24/7, no judgment, unlimited practice.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={onSignUp}
                className="text-lg px-8 py-4 h-auto"
              >
                Start Practicing Now
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-4 h-auto"
              >
                Learn More
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10k+</div>
                <div className="text-sm text-muted-foreground">Practice Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">95%</div>
                <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </div>
          </div>

          {/* Video Placeholder Side */}
          <div className="relative">
            <div className="relative bg-card rounded-2xl shadow-2xl border overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-8 h-8 text-primary ml-1" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Product Demo</h3>
                    <p className="text-muted-foreground">Coming Soon</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/20 rounded-full blur-xl" />
          </div>
        </div>
      </div>
    </section>
  );
};