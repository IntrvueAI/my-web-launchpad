import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Quote } from 'lucide-react';

export const LandingTestimonials = () => {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Year 6 Student',
      school: 'London Primary',
      rating: 5,
      text: 'The digital human interviews helped me feel so much more confident before my 11+ exam. The instant feedback was incredibly helpful!',
      initials: 'SJ'
    },
    {
      name: 'Michael Chen',
      role: 'IELTS Candidate',
      school: 'University Applicant',
      rating: 5,
      text: 'Practicing with digital humans was game-changing. I improved my speaking score from 6.5 to 8.0 in just two weeks of practice.',
      initials: 'MC'
    },
    {
      name: 'Emma Thompson',
      role: 'Parent',
      school: 'Grammar School Parent',
      rating: 5,
      text: 'My daughter used this platform to prepare for her school interviews. The 24/7 availability meant she could practice whenever she felt ready.',
      initials: 'ET'
    }
  ];

  const trustIndicators = [
    { name: 'Grammar Schools', logo: 'GS' },
    { name: 'IELTS Approved', logo: 'IA' },
    { name: 'EdTech Certified', logo: 'EC' },
    { name: 'Privacy Secure', logo: 'PS' }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Trusted by Students & Parents
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands of students who have improved their interview skills and confidence with our platform.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 space-y-4">
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-primary/20" />
                
                {/* Rating */}
                <div className="flex items-center gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                
                {/* Testimonial Text */}
                <p className="text-muted-foreground leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                
                {/* Author Info */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.school}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="text-center space-y-8">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Trusted & Approved By
          </h3>
          
          <div className="flex flex-wrap justify-center items-center gap-8">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground">{indicator.logo}</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{indicator.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-16 pt-16 border-t">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">95%</div>
            <div className="text-sm text-muted-foreground">Student Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">10k+</div>
            <div className="text-sm text-muted-foreground">Practice Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">85%</div>
            <div className="text-sm text-muted-foreground">Score Improvement</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">24/7</div>
            <div className="text-sm text-muted-foreground">Support Available</div>
          </div>
        </div>
      </div>
    </section>
  );
};