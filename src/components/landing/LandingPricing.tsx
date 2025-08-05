import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap } from 'lucide-react';

interface LandingPricingProps {
  onSignUp: () => void;
}

export const LandingPricing = ({ onSignUp }: LandingPricingProps) => {
  const pricingPlans = [
    {
      id: 'single',
      name: 'Single Interview',
      credits: 1,
      price: 14.99,
      description: 'Perfect for trying out our platform',
      features: [
        '1 Complete Interview Session',
        'Instant Feedback & Scoring',
        'Digital Human Interviewer',
        'Performance Analytics',
        'Valid for 30 days'
      ],
      popular: false,
      savings: null
    },
    {
      id: 'value',
      name: 'Value Pack',
      credits: 5,
      price: 49.99,
      originalPrice: 74.95,
      description: 'Great for regular practice',
      features: [
        '5 Complete Interview Sessions',
        'Instant Feedback & Scoring',
        'Digital Human Interviewer',
        'Performance Analytics',
        'Progress Tracking',
        'Valid for 90 days',
        'Email Support'
      ],
      popular: true,
      savings: 25
    },
    {
      id: 'best',
      name: 'Best Value',
      credits: 10,
      price: 79.99,
      originalPrice: 149.90,
      description: 'Maximum practice for serious preparation',
      features: [
        '10 Complete Interview Sessions',
        'Instant Feedback & Scoring',
        'Digital Human Interviewer',
        'Performance Analytics',
        'Progress Tracking',
        'Priority Support',
        'Valid for 6 months',
        'Detailed Reports'
      ],
      popular: false,
      savings: 70
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Pay per interview session with no hidden fees. Each credit gives you one complete interview with instant feedback.
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">1 Credit = 1 Complete Interview Session</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative group hover:shadow-xl transition-all duration-300 ${
                plan.popular ? 'border-primary ring-2 ring-primary/20 scale-105' : 'hover:border-primary/50'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              
              {plan.savings && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-3 right-4 bg-success text-success-foreground"
                >
                  Save ${plan.savings}
                </Badge>
              )}

              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        ${plan.originalPrice}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {plan.credits} {plan.credits === 1 ? 'Credit' : 'Credits'} • ${(plan.price / plan.credits).toFixed(2)} per interview
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                  onClick={onSignUp}
                >
                  Get Started
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-16 space-y-6">
          <div className="inline-flex items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>No subscription required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Secure payment processing</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>30-day money-back guarantee</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            All plans include access to our complete platform with digital human interviews, 
            instant feedback, and detailed performance analytics. No hidden fees, no recurring charges.
          </p>
        </div>
      </div>
    </section>
  );
};