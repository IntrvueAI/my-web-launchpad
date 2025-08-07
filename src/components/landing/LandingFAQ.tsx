import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

export const LandingFAQ = () => {
  const faqs = [
    {
      question: 'What are digital human interviewers?',
      answer: 'Digital humans are AI-powered virtual interviewers that look and behave like real people. They use advanced technology to conduct natural conversations, ask relevant questions, and provide realistic interview experiences without the pressure of human judgment.'
    },
    {
      question: 'How does the instant feedback work?',
      answer: 'After each interview session, our platform analyzes your responses, body language, speech patterns, and overall performance. You receive detailed scoring, specific improvement suggestions, and comparisons to benchmark standards - all within seconds of completing your interview.'
    },
    {
      question: 'What technical requirements do I need?',
      answer: 'You only need a modern web browser, a webcam, and a microphone. Our platform works on computers, tablets, and smartphones. We recommend a stable internet connection for the best experience. No software downloads are required.'
    },
    {
      question: 'How accurate is the scoring system?',
      answer: 'Our scoring system is based on established assessment criteria used by real institutions. For academic interviews, we follow school admission standards. For IELTS, we align with official band descriptors. The system is continuously refined based on real-world outcomes.'
    },
    {
      question: 'Can I practice multiple times with the same credit?',
      answer: 'No, each credit provides one complete interview session with full feedback. However, you can review your feedback and recordings as many times as you want. This approach ensures you get fresh questions and scenarios each time you practice.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Absolutely. We use bank-level encryption to protect your data. Interview recordings are processed securely and automatically deleted after generating your feedback. We never share personal information with third parties and comply with GDPR regulations.'
    },
    {
      question: 'Do you offer discounts for schools or bulk purchases?',
      answer: 'Yes! We offer special pricing for educational institutions, tutoring centers, and bulk purchases. Contact our team to discuss custom packages that meet your organization\'s needs.'
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about our digital human interview platform.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* FAQ Accordion */}
          <div className="lg:col-span-2">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border rounded-lg px-6 data-[state=open]:bg-muted/30"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-6">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Support Section */}
          <div className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Still have questions?</h3>
                <p className="text-sm text-muted-foreground">
                  Our support team is here to help you get the most out of your interview practice.
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  <strong>Email:</strong> founders@intrvue.ai
                </div>
                <div className="text-muted-foreground">
                  <strong>Response time:</strong> Within 24 hours
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-6 text-center space-y-3">
              <h4 className="font-semibold text-primary">Quick Start Guide</h4>
              <p className="text-sm text-muted-foreground">
                New to digital human interviews? Check out our quick start guide to get the most out of your first session.
              </p>
              <div className="text-sm text-primary hover:underline cursor-pointer">
                Download Guide →
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};