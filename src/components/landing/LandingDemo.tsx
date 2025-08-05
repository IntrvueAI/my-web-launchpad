import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Calendar, Bell } from 'lucide-react';

export const LandingDemo = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            See It In Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Watch how our digital human interviewers provide realistic practice sessions and instant feedback.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Card className="overflow-hidden shadow-2xl">
            <CardContent className="p-0">
              <div className="relative">
                {/* Video Container */}
                <div className="aspect-video bg-gradient-to-br from-primary/10 via-muted to-accent/10 flex items-center justify-center">
                  <div className="text-center space-y-6">
                    <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Play className="w-10 h-10 text-primary ml-1" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">Product Demo</h3>
                      <p className="text-muted-foreground text-lg">Coming Soon</p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Our demo video will showcase a complete interview session with a digital human, 
                        real-time feedback, and detailed performance analysis.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Overlay with additional info */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
                
                {/* Duration badge */}
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                  ~3 min demo
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Play className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold">Live Interview Session</h4>
              <p className="text-sm text-muted-foreground">
                See how natural conversations flow with our digital humans
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold">Real-time Feedback</h4>
              <p className="text-sm text-muted-foreground">
                Watch instant analysis and scoring as the interview progresses
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold">Detailed Reports</h4>
              <p className="text-sm text-muted-foreground">
                Explore comprehensive performance analytics and improvement tips
              </p>
            </div>
          </div>

          {/* Notify button */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="gap-2">
              <Bell className="w-4 h-4" />
              Notify me when demo is ready
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};