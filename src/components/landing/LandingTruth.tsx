import { Clock, Target, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const LandingTruth = () => {
  const truths = [
    {
      icon: Clock,
      title: "24/7 Available",
      description: "Practice anytime, anywhere with our digital humans"
    },
    {
      icon: Target,
      title: "Realistic Rubric Feedback",
      description: "Get instant feedback aligned with actual exam marking criteria"
    },
    {
      icon: Zap,
      title: "Immediate Results",
      description: "No waiting - get your performance analysis right after each session"
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why Students Choose Our Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real benefits that help you prepare effectively for your interviews.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {truths.map((truth, index) => {
            const IconComponent = truth.icon;
            return (
              <Card key={index} className="text-center border-2 hover:border-primary/20 transition-colors">
                <CardContent className="p-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{truth.title}</h3>
                  <p className="text-muted-foreground">{truth.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};