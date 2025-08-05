import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Play, MessageSquare, BarChart3 } from 'lucide-react';

export const LandingProcess = () => {
  const steps = [
    {
      number: '01',
      icon: Play,
      title: 'Choose Your Interview',
      description: 'Select from academic, language, or professional interviews based on your goals and requirements.',
      visual: 'Interface showing interview selection screen'
    },
    {
      number: '02',
      icon: MessageSquare,
      title: 'Practice with Digital Humans',
      description: 'Engage in realistic interview scenarios with our advanced digital human interviewers.',
      visual: 'Digital human interviewer in conversation'
    },
    {
      number: '03',
      icon: BarChart3,
      title: 'Get Instant Feedback',
      description: 'Receive detailed performance analysis and personalized improvement recommendations immediately.',
      visual: 'Detailed feedback and scoring interface'
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
                  
                  {/* Visual Placeholder */}
                  <div className="w-full h-48 bg-gradient-to-br from-primary/5 to-primary/20 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <step.icon className="w-12 h-12 text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground px-4">
                        {step.visual}
                      </p>
                    </div>
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

import { Clock } from 'lucide-react';