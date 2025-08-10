import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, BookOpen, Users, Award } from 'lucide-react';
interface LandingPricingProps {
  onSignUp: () => void;
}
export const LandingPricing = ({
  onSignUp
}: LandingPricingProps) => {
  const pricingPlans = [{
    id: 'single',
    name: 'Try It Out',
    credits: 1,
    price: 9.99,
    description: 'Perfect for testing our Digital Humans Interviewers platform',
    features: ['1 Complete AI Interview', 'Instant Detailed Feedback', 'Performance Score & Analysis', 'Learning Recommendations', 'Valid for 30 days'],
    popular: false,
    savings: null,
    icon: BookOpen,
    badge: 'Great for beginners'
  }, {
    id: 'value',
    name: 'Student Favorite',
    credits: 5,
    price: 44.99,
    originalPrice: 74.95,
    description: 'Most popular choice for serious preparation',
    features: ['5 Complete AI Interviews', 'Advanced Progress Tracking', 'Personalized Study Plan', 'Detailed Performance Reports', 'Priority Email Support', 'Valid for 90 days', 'Multiple Subject Areas'],
    popular: true,
    savings: 25,
    icon: Users,
    badge: 'Best value'
  }, {
    id: 'best',
    name: 'Master Package',
    credits: 10,
    price: 69.99,
    originalPrice: 149.90,
    description: 'Comprehensive preparation for top performance',
    features: ['10 Complete AI Interviews', 'Premium Analytics Dashboard', 'Custom Learning Pathways', 'Video Performance Review', 'Priority Support & Live Chat', 'Valid for 6 months', 'All Interview Types', 'Study Resources Library'],
    popular: false,
    savings: 70,
    icon: Award,
    badge: 'Maximum prep'
  }];
  return <section className="py-24 bg-gradient-to-b from-background to-accent/5">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium text-sm">Flexible Learning Credits</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold">
            Choose Your Learning Journey
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Pay only for what you need. Each credit gives you one complete AI interview session with detailed feedback and analysis.
          </p>
          
          <div className="inline-flex items-center gap-4 bg-success/10 px-6 py-3 rounded-full border border-success/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-success font-medium text-sm">No subscription required</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map(plan => {
          const IconComponent = plan.icon;
          return <Card key={plan.id} className={`relative group transition-all duration-500 overflow-hidden ${plan.popular ? 'border-primary/30 shadow-xl hover:shadow-2xl scale-105 border-2' : 'border-border hover:border-primary/20 hover:shadow-xl'} hover:scale-105`}>
                {plan.popular && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/80" />}
                
                {plan.popular && <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 translate-x-4 z-10">
                    
                  </div>}
                
                {plan.savings && !plan.popular && <div className="absolute -top-3 right-4 z-10">
                    
                  </div>}

                <CardHeader className="text-center space-y-4 pb-8">
                  {/* Icon and Badge */}
                  <div className="space-y-3">
                    <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all duration-500 ${plan.popular ? 'bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20' : 'bg-gradient-to-br from-accent/20 to-accent/10 group-hover:from-primary/20 group-hover:to-primary/10'}`}>
                      <IconComponent className={`w-8 h-8 transition-all duration-500 ${plan.popular ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} group-hover:scale-110`} />
                    </div>
                    <Badge variant="outline" className="font-medium">
                      {plan.badge}
                    </Badge>
                  </div>
                  
                  <div>
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-base">{plan.description}</CardDescription>
                  </div>
                  
                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      {plan.originalPrice && <span className="text-xl text-muted-foreground line-through">
                          ${plan.originalPrice}
                        </span>}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-primary">
                        {plan.credits} {plan.credits === 1 ? 'Interview Credit' : 'Interview Credits'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${Math.round(plan.price / plan.credits)} per interview session
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* CTA Button */}
                  <Button className="w-full group/btn" variant={plan.popular ? "default" : "outline"} size="lg" onClick={onSignUp}>
                    <span>Start Learning</span>
                    <div className="ml-2 transition-transform group-hover/btn:translate-x-1">→</div>
                  </Button>

                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      What's included
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => <li key={index} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>)}
                    </ul>
                  </div>
                </CardContent>
              </Card>;
        })}
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-16 space-y-6">
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span>Secure payment processing</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span>Instant access after purchase</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span>Works on all devices</span>
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground">
              All plans include access to our complete Digital Humans Interviewers platform with personalized feedback, 
              progress tracking, and detailed performance analytics. Credits never expire within their validity period.
            </p>
          </div>
        </div>
      </div>
    </section>;
};