
import { Clock, Target, Zap, Users, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const LandingTruth = () => {
  const benefits = [
    {
      icon: Clock,
      title: "Available 24/7",
      description: "Practice 11+ interviews whenever you want, no scheduling conflicts or limited availability",
      stat: "Anytime access"
    },
    {
      icon: Target,
      title: "School-Aligned Assessment",
      description: "Digital humans provide consistent feedback based on real UK private and grammar school criteria",
      stat: "Official criteria"
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get immediate detailed analysis of your interview performance right after each session",
      stat: "<5 seconds"
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      description: "See your interview skills improvement over time with detailed analytics and performance trends",
      stat: "85% success rate"
    },
    {
      icon: Shield,
      title: "Safe Practice Environment",
      description: "Build confidence in a judgment-free space with digital humans who never get impatient",
      stat: "Anxiety-free learning"
    },
    {
      icon: Users,
      title: "Proven Success",
      description: "Join hundreds of students who've successfully secured places at top UK schools",
      stat: "150+ schools"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 bg-success/10 px-4 py-2 rounded-full border border-success/20">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-success font-medium text-sm">11+ Success Stories</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold">
            Real Benefits for{' '}
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              11+ Students
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See why students trust our digital human platform to secure places at top UK schools.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-xl transition-all duration-500 border-0 bg-card/60 backdrop-blur-sm hover:bg-card/80 hover:scale-105"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500">
                      <IconComponent className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">{benefit.stat}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors duration-300">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Testimonial-style section */}
        <div className="mt-16 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card/60 backdrop-blur-sm rounded-3xl p-8 border border-border/50">
              <div className="space-y-6">
                <div className="flex justify-center">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-5 h-5 text-primary">★</div>
                  ))}
                </div>
                <blockquote className="text-xl md:text-2xl font-medium text-foreground italic">
                  "I was so nervous about my Harrow interview, but after practicing here I felt completely prepared. 
                  The digital humans felt so real and the feedback was incredibly detailed. I got my offer!"
                </blockquote>
                <div className="text-muted-foreground">
                  <div className="font-semibold">Sophie Chen</div>
                  <div className="text-sm">Harrow School student</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
