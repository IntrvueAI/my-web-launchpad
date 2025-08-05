import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Zap, Target, TrendingUp, Clock, Shield } from 'lucide-react';

export const LandingFeatures = () => {
  const features = [
    {
      icon: Bot,
      title: 'Realistic Digital Humans',
      description: 'Practice with lifelike digital interviewers that respond naturally to your answers and provide human-like interaction.',
      image: '/api/placeholder/400/250'
    },
    {
      icon: Zap,
      title: 'Instant Feedback',
      description: 'Get detailed performance analysis immediately after each session, including scoring and personalized improvement tips.',
      image: '/api/placeholder/400/250'
    },
    {
      icon: Target,
      title: 'Multiple Interview Types',
      description: 'Support for academic (11+), language (IELTS), and professional interviews with specialized question sets.',
      image: '/api/placeholder/400/250'
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking',
      description: 'Monitor your improvement over time with detailed analytics and performance metrics across all sessions.',
      image: '/api/placeholder/400/250'
    },
    {
      icon: Clock,
      title: 'Available 24/7',
      description: 'Practice anytime, anywhere with our cloud-based platform. No scheduling required, no time constraints.',
      image: '/api/placeholder/400/250'
    },
    {
      icon: Shield,
      title: 'Safe Practice Environment',
      description: 'Build confidence in a judgment-free environment where you can make mistakes and learn without pressure.',
      image: '/api/placeholder/400/250'
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
            Experience the future of interview preparation with our cutting-edge technology that combines realism with instant feedback.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
              <CardHeader className="space-y-4">
                <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <feature.icon className="w-12 h-12 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Feature Preview</p>
                  </div>
                </div>
                <CardTitle className="flex items-center gap-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};