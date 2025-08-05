import { Shield, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const LandingFeatures = () => {
  const features = [
    {
      icon: Shield,
      title: "More Reliable",
      description: "Unlike human interviewers who may be tired, distracted, or inconsistent, our digital humans provide the same high-quality experience every single time.",
      comparison: "Human interviewers can have off days - digital humans never do"
    },
    {
      icon: DollarSign,
      title: "Cost Effective",
      description: "Get unlimited practice sessions at a fraction of the cost of hiring human interview coaches or tutors for one-on-one sessions.",
      comparison: "Human coaches cost £50-100+ per hour - get unlimited practice for less"
    },
    {
      icon: Clock,
      title: "24/7",
      description: "Practice anytime, day or night, with comprehensive progress tracking. No need to book appointments or work around someone else's schedule.",
      comparison: "Human interviewers have limited availability - we're always here when you need us"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why Choose Digital Human Interviews?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our digital humans provide consistent, reliable interview practice that's better than traditional human coaching in every way.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      {feature.description}
                    </p>
                    <p className="text-sm font-medium text-primary/80 italic">
                      {feature.comparison}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};