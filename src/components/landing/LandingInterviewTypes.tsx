import { GraduationCap, MessageCircle, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const LandingInterviewTypes = () => {
  const interviewTypes = [
    {
      icon: GraduationCap,
      title: "11+ Interview",
      description: "Practice for private and grammar school entrance interviews",
      available: true,
      features: ["Mock interviews", "Academic questions", "Confidence building"]
    },
    {
      icon: MessageCircle,
      title: "IELTS Speaking Test",
      description: "Prepare for your IELTS speaking examination",
      available: true,
      features: ["Part 1, 2 & 3 practice", "Scoring feedback", "Accent training"]
    },
    {
      icon: Plus,
      title: "More Coming Soon",
      description: "We're continuously adding new interview types",
      available: false,
      features: ["Job interviews", "University admissions", "Professional exams"]
    }
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Practice Different Interview Types
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered platform supports multiple interview formats to help you succeed in any situation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {interviewTypes.map((type, index) => {
            const IconComponent = type.icon;
            return (
              <Card 
                key={index} 
                className={`relative transition-all duration-300 hover:shadow-lg ${
                  !type.available ? 'opacity-70' : 'hover:-translate-y-1'
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className="relative mb-4">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                      type.available ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    {!type.available && (
                      <Badge variant="secondary" className="absolute -top-2 -right-2">
                        Soon
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
                  <p className="text-muted-foreground mb-4">{type.description}</p>
                  
                  <ul className="space-y-2 text-sm">
                    {type.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center justify-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          type.available ? 'bg-primary' : 'bg-muted-foreground'
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            More interview types will be added regularly. 
            <span className="font-medium"> Sign up to be notified of new releases!</span>
          </p>
        </div>
      </div>
    </section>
  );
};