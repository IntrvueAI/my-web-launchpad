import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Shield, Clock, Award } from 'lucide-react';

interface LandingCTAProps {
  onSignUp: () => void;
}

export const LandingCTA = ({ onSignUp }: LandingCTAProps) => {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <Card className="relative overflow-hidden border-2 border-primary/20 shadow-2xl">
          <CardContent className="p-12 lg:p-16">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full translate-y-24 -translate-x-24" />
            
            <div className="relative text-center space-y-8">
              {/* Badge */}
              <Badge className="bg-primary text-primary-foreground text-sm px-4 py-2">
                🚀 Start Your Interview Journey Today
              </Badge>

              {/* Headline */}
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold max-w-4xl mx-auto">
                  Ready to Master Your Interview Skills?
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Join thousands of students who have improved their confidence and performance with digital human interview practice.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  onClick={onSignUp}
                  className="text-lg px-8 py-4 h-auto gap-2 group"
                >
                  Sign Up & Start Practicing
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="text-lg px-8 py-4 h-auto"
                >
                  View Demo (Coming Soon)
                </Button>
              </div>

              {/* Trust Signals */}
              <div className="flex flex-wrap justify-center items-center gap-8 pt-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>30-day money-back guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Start practicing in 2 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="w-4 h-4 text-primary" />
                  <span>Trusted by 10k+ students</span>
                </div>
              </div>

              {/* Final Incentive */}
              <div className="bg-success/10 rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-success-foreground font-medium">
                  🎯 Limited Time: Get detailed progress tracking with every credit purchase
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Track your improvement over time and identify areas for focused practice
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};