
import { Zap, Target, Clock, Brain, Award, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const LandingFeatures = () => {
  const features = [
    {
      icon: Brain,
      title: "Digital Human Examiners",
      description: "Realistic digital humans that conduct authentic IELTS speaking tests with natural conversation flow.",
      highlight: "Feels like the real exam"
    },
    {
      icon: Zap,
      title: "Instant Band Scoring",
      description: "Get immediate detailed feedback on all four criteria with specific improvement suggestions.",
      highlight: "Know your score instantly"
    },
    {
      icon: Clock,
      title: "Practice Anytime",
      description: "Available 24/7 for unlimited IELTS speaking practice sessions whenever you need them.",
      highlight: "Your schedule, your pace"
    },
    {
      icon: Target,
      title: "Exam-Authentic Format",
      description: "All three parts of the IELTS speaking test with official question types and timing.",
      highlight: "Real IELTS experience"
    },
    {
      icon: Award,
      title: "Proven Results",
      description: "Students improve their speaking band scores by an average of 1.5 bands using our platform.",
      highlight: "Track record of success"
    },
    {
      icon: Users,
      title: "Confidence Building",
      description: "Practice without pressure in a supportive environment that builds natural speaking confidence.",
      highlight: "Overcome speaking anxiety"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-accent/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose Our{' '}
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                IELTS Platform
              </span>
            </h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the most realistic IELTS speaking practice with digital human examiners that understand your goals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-xl transition-all duration-500 border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:scale-105"
              >
                <CardContent className="p-8 space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500">
                      <IconComponent className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-accent/40 to-accent/20 rounded-full blur-sm group-hover:scale-150 transition-transform duration-500" />
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-sm font-semibold text-primary/80">
                        ✨ {feature.highlight}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 bg-success/10 px-6 py-3 rounded-full border border-success/20">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-success-foreground font-medium">
              Join thousands of successful IELTS candidates today
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
