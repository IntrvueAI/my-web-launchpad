import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAllInterviewTypes, getInterviewTypesByCategory, INTERVIEW_CATEGORIES, InterviewType } from '@/config/interviewTypes';
import { getScoreRange } from '@/utils/scoringSystem';
import { Search, Clock, Target, Star } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
interface InterviewSelectionProps {
  onSelectInterview: (interviewType: InterviewType) => void;
}
export const InterviewSelection = ({
  onSelectInterview
}: InterviewSelectionProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const allInterviewTypes = getAllInterviewTypes();
  const { credits } = useCredits();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingInterview, setPendingInterview] = useState<InterviewType | null>(null);

  // Filter interview types based on search and category
  const filteredInterviewTypes = allInterviewTypes.filter(interview => {
    const matchesSearch = interview.name.toLowerCase().includes(searchQuery.toLowerCase()) || interview.description.toLowerCase().includes(searchQuery.toLowerCase()) || interview.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || interview.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1:
        return 'Beginner';
      case 2:
        return 'Intermediate';
      case 3:
        return 'Advanced';
      default:
        return 'Unknown';
    }
  };
  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1:
        return 'green';
      case 2:
        return 'yellow';
      case 3:
        return 'red';
      default:
        return 'gray';
    }
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Choose Your Interview Type</h1>
        <p className="text-muted-foreground">
          Select the type of interview you'd like to practice
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search interviews by name, description, or tags..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

         {/* Category Filters - Mobile Optimized */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={selectedCategory === null ? "default" : "outline"} 
            size="sm" 
            onClick={() => setSelectedCategory(null)}
            className="min-h-[36px] text-xs md:text-sm"
          >
            All Categories
          </Button>
          {Object.entries(INTERVIEW_CATEGORIES).map(([key, category]) => 
            <Button 
              key={key} 
              variant={selectedCategory === key ? "default" : "outline"} 
              size="sm" 
              onClick={() => setSelectedCategory(key)}
              className="min-h-[36px] text-xs md:text-sm"
            >
              {category.name}
            </Button>
          )}
        </div>
      </div>

      {/* Interview Cards - Mobile Optimized Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredInterviewTypes.map(interview => {
        const scoreRange = getScoreRange(interview.scoringSystem, interview.id);
        return <Card key={interview.id} className="hover:shadow-lg transition-shadow group border-2 hover:border-primary/30">
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg leading-tight">
                      <span>{interview.name}</span>
                      {interview.id === '11-plus' && <Badge variant="secondary" className="text-xs w-fit">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{interview.description}</CardDescription>
                  </div>
                </div>
                
                {/* Interview Details - Mobile Optimized */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {INTERVIEW_CATEGORIES[interview.category].name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getDifficultyLabel(interview.difficultyLevel)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="space-y-4">
                  {/* Interview Info - Mobile Responsive */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">{interview.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">0-20</span>
                    </div>
                  </div>

                  {/* Assessment Criteria - Mobile Optimized */}
                  <div>
                    <h4 className="text-xs md:text-sm font-medium mb-2">Assessment Areas:</h4>
                    <div className="flex flex-wrap gap-1">
                      {interview.scoringCriteria.slice(0, 4).map((criteria, index) => <Badge key={index} variant="secondary" className="text-xs">
                          {criteria.length > 12 ? `${criteria.substring(0, 12)}...` : criteria}
                        </Badge>)}
                      {interview.scoringCriteria.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{interview.scoringCriteria.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Start Button - Mobile Touch Optimized */}
                  <Button 
                    className="w-full min-h-[44px] text-sm font-medium transition-colors" 
                    onClick={e => {
                      e.stopPropagation();
                      const cost = interview.costCredits ?? 1;
                      if (cost === 0) {
                        onSelectInterview(interview);
                        return;
                      }
                      if ((credits ?? 0) > 0) {
                        setPendingInterview(interview);
                        setConfirmOpen(true);
                      } else {
                        onSelectInterview(interview);
                      }
                    }}>
                    Start {interview.name}
                  </Button>
                </div>
              </CardContent>
            </Card>;
      })}
      </div>

      {filteredInterviewTypes.length === 0 && <div className="text-center py-12">
          <p className="text-muted-foreground">
            No interviews match your search criteria. Try adjusting your search or filters.
          </p>
        </div>}

      {/* Confirm consume credit dialog - Mobile Optimized */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Use 1 credit to start?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Starting this interview will deduct 1 credit from your balance. You currently have {credits ?? 0} credit{(credits ?? 0) === 1 ? '' : 's'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto min-h-[44px]"
              onClick={() => {
                if (pendingInterview) {
                  onSelectInterview(pendingInterview);
                  setPendingInterview(null);
                }
                setConfirmOpen(false);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};