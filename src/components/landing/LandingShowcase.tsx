import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Globe, Briefcase } from 'lucide-react';

export const LandingShowcase = () => {
  const interviewTypes = [
    {
      category: 'Academic',
      icon: GraduationCap,
      title: '11+ School Admissions',
      description: 'Comprehensive preparation for grammar school and independent school entrance interviews.',
      features: [
        'Subject-specific questions',
        'Confidence building',
        'Real school scenarios',
        'Parent progress reports'
      ],
      difficulty: 'Intermediate',
      duration: '15-20 minutes',
      color: 'from-blue-50 to-indigo-100'
    },
    {
      category: 'Language',
      icon: Globe,
      title: 'IELTS Speaking Test',
      description: 'Master the IELTS speaking component with realistic test scenarios and band scoring.',
      features: [
        'All 3 speaking parts',
        'Band score prediction',
        'Pronunciation feedback',
        'Fluency analysis'
      ],
      difficulty: 'Advanced',
      duration: '10-15 minutes',
      color: 'from-green-50 to-emerald-100'
    },
    {
      category: 'Professional',
      icon: Briefcase,
      title: 'Job Interviews',
      description: 'Practice for professional job interviews across various industries and roles.',
      features: [
        'Industry-specific questions',
        'Behavioral scenarios',
        'Competency assessment',
        'Professional feedback'
      ],
      difficulty: 'Variable',
      duration: '20-30 minutes',
      color: 'from-purple-50 to-violet-100'
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Interview Types We Support
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose from our specialized interview categories, each designed with specific question sets and assessment criteria.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {interviewTypes.map((type, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardHeader className="space-y-4">
                {/* Category Image Placeholder */}
                <div className={`w-full h-48 bg-gradient-to-br ${type.color} rounded-lg flex items-center justify-center relative overflow-hidden`}>
                  <div className="text-center space-y-3">
                    <type.icon className="w-16 h-16 text-primary mx-auto" />
                    <Badge variant="secondary" className="font-medium">
                      {type.category}
                    </Badge>
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white/20 rounded-full" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 bg-white/30 rounded-full" />
                </div>

                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-3">
                    <type.icon className="w-5 h-5 text-primary" />
                    {type.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {type.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Key Features */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Key Features:</h4>
                  <ul className="space-y-1">
                    {type.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Meta Information */}
                <div className="flex justify-between items-center pt-4 border-t text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    <span className="font-medium">{type.duration}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {type.difficulty}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16 space-y-4">
          <h3 className="text-xl font-semibold">
            Can't find your interview type?
          </h3>
          <p className="text-muted-foreground">
            We're constantly adding new interview categories. Contact us to suggest new types.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
            Request new interview type →
          </div>
        </div>
      </div>
    </section>
  );
};