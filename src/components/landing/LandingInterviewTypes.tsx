
import { MessageCircle, Clock, Users, Star, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const LandingInterviewTypes = () => {
  const testParts = [
    {
      icon: MessageCircle,
      title: "Personal Background",
      description: "Questions about yourself, your family, hobbies, and interests to build rapport",
      duration: "5-8 minutes",
      features: ["Personal introduction", "Family discussions", "Hobby exploration", "Confidence building"],
      difficulty: "Beginner"
    },
    {
      icon: Clock,
      title: "Academic & Reasoning",
      description: "Problem-solving questions, puzzles, and academic discussions to test thinking",
      duration: "8-10 minutes",
      features: ["Logical puzzles", "Problem solving", "Academic discussions", "Critical thinking"],
      difficulty: "Intermediate"
    },
    {
      icon: Users,
      title: "Values & Aspirations",
      description: "Ethical scenarios, school expectations, and future goals to assess fit",
      duration: "7-12 minutes", 
      features: ["Ethical reasoning", "Value assessment", "Future planning", "School alignment"],
      difficulty: "Advanced"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-accent/5 to-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium text-sm">Complete 11+ Interview Preparation</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold">
            Master Every Interview Section
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our digital humans guide you through comprehensive 11+ interview practice, covering all sections with authentic timing and school-style questions.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {testParts.map((part, index) => {
            const IconComponent = part.icon;
            return (
              <Card 
                key={index} 
                className="relative group transition-all duration-500 border-2 border-border hover:border-primary/20 hover:shadow-xl hover:scale-105"
              >
                <CardContent className="p-8 space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500">
                      <IconComponent className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{part.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{part.description}</p>
                    </div>
                  </div>

                  {/* Duration and Difficulty */}
                  <div className="flex justify-center gap-4 py-4 border-y border-border/50">
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-bold text-primary">{part.duration}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Star className="w-4 h-4 text-success" />
                        <span className="font-bold text-success">{part.difficulty}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Level</div>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      What You'll Practice
                    </h4>
                    <ul className="space-y-2">
                      {part.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Button asChild size="lg" className="text-lg px-8 py-4 h-auto gap-2">
            <Link to="/auth" aria-label="Start 11+ practice - sign in or sign up">
              <MessageCircle className="w-5 h-5" />
              Start Complete 11+ Practice
            </Link>
          </Button>
          <div className="mt-6">
            <div className="inline-flex items-center gap-2 bg-accent/20 px-6 py-3 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Full interview takes 20-30 minutes - just like real school interviews
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
