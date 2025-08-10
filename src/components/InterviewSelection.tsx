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

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button variant={selectedCategory === null ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(null)}>
            All Categories
          </Button>
          {Object.entries(INTERVIEW_CATEGORIES).map(([key, category]) => <Button key={key} variant={selectedCategory === key ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(key)}>
              {category.name}
            </Button>)}
        </div>
      </div>

      {/* Interview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredInterviewTypes.map(interview => {
        const scoreRange = getScoreRange(interview.scoringSystem, interview.id);
        return <Card key={interview.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => onSelectInterview(interview)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {interview.name}
                      {interview.id === '11-plus' && <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>}
                    </CardTitle>
                    <CardDescription>{interview.description}</CardDescription>
                  </div>
                </div>
                
                {/* Interview Details */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className={`bg-${INTERVIEW_CATEGORIES[interview.category].color}-50 text-${INTERVIEW_CATEGORIES[interview.category].color}-700 border-${INTERVIEW_CATEGORIES[interview.category].color}-200`}>
                    {INTERVIEW_CATEGORIES[interview.category].name}
                  </Badge>
                  
                  <Badge variant="outline" className={`bg-${getDifficultyColor(interview.difficultyLevel)}-50 text-${getDifficultyColor(interview.difficultyLevel)}-700 border-${getDifficultyColor(interview.difficultyLevel)}-200`}>
                    {getDifficultyLabel(interview.difficultyLevel)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Interview Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{interview.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>Score: {scoreRange.min}-{scoreRange.max}</span>
                    </div>
                  </div>

                  {/* Assessment Criteria */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Assessment Areas:</h4>
                    <div className="flex flex-wrap gap-1">
                      {interview.scoringCriteria.map((criteria, index) => <Badge key={index} variant="secondary" className="text-xs">
                          {criteria}
                        </Badge>)}
                    </div>
                  </div>

                  {/* Start Button */}
                  <Button className="w-full group-hover:bg-primary/90 transition-colors" onClick={e => {
                e.stopPropagation();
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

      {/* Confirm consume credit dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Use 1 credit to start?</AlertDialogTitle>
            <AlertDialogDescription>
              Starting this interview will deduct 1 credit from your balance. You currently have {credits ?? 0} credit{(credits ?? 0) === 1 ? '' : 's'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
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