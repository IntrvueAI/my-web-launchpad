import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Play, MessageSquare, BarChart3, Clock } from 'lucide-react';

export const LandingProcess = () => {
  const steps = [
    {
      number: '01',
      icon: Play,
      title: 'Choose Your Interview',
      description: 'Select from academic, language, or professional interviews based on your goals and requirements.',
      image: '/lovable-uploads/9dfda919-9c48-45a8-b6a2-7d3000d4352a.png'
    },
    {
      number: '02',
      icon: MessageSquare,
      title: 'Practice with Digital Humans',
      description: 'Engage in realistic interview scenarios with our advanced digital human interviewers.',
      image: '/lovable-uploads/602524ba-c5ae-437f-8628-4f4ba1ba091e.png'
    },
    {
      number: '03',
      icon: BarChart3,
      title: 'Get Instant Feedback',
      description: 'Receive detailed performance analysis and personalized improvement recommendations immediately.',
      image: '/lovable-uploads/cba63a0e-9ba9-49f7-9e2c-405eeb522d48.png'
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get started with your interview practice in three simple steps. It's fast, easy, and effective.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="h-full group hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center space-y-6">
                  {/* Step Number */}
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                    {step.number}
                  </div>
                  
                  {/* Step Image */}
                  <div className="w-full h-48 rounded-lg overflow-hidden border">
                    <img 
                      src={step.image} 
                      alt={step.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <CardTitle className="text-xl">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="text-center">
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Arrow for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-primary/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 bg-card px-6 py-3 rounded-full border">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Start practicing in under 2 minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
};

