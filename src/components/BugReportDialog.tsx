import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBugReport } from '@/hooks/useBugReport';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const bugReportSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(100, "Subject must be less than 100 characters"),
  category: z.string().min(1, "Please select a category"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  stepsToReproduce: z.string().max(500, "Steps must be less than 500 characters").optional(),
});

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BugReportDialog: React.FC<BugReportDialogProps> = ({ open, onOpenChange }) => {
  const { submitBugReport, isLoading } = useBugReport();
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    description: '',
    stepsToReproduce: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentUrl = window.location.href;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    try {
      bugReportSchema.parse(formData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    // Submit bug report
    const success = await submitBugReport({
      ...formData,
      currentUrl,
    });

    if (success) {
      // Reset form
      setFormData({
        subject: '',
        category: '',
        description: '',
        stepsToReproduce: '',
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Help us improve by reporting any issues you encounter. We'll investigate and get back to you.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief description of the bug"
              maxLength={100}
            />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ui_issue">UI Issue</SelectItem>
                <SelectItem value="functionality_bug">Functionality Bug</SelectItem>
                <SelectItem value="performance_issue">Performance Issue</SelectItem>
                <SelectItem value="audio_video_issue">Audio/Video Issue</SelectItem>
                <SelectItem value="payment_issue">Payment Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the bug in detail..."
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.description.length}/1000
            </p>
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stepsToReproduce">Steps to Reproduce (Optional)</Label>
            <Textarea
              id="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData(prev => ({ ...prev, stepsToReproduce: e.target.value }))}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.stepsToReproduce.length}/500
            </p>
            {errors.stepsToReproduce && <p className="text-sm text-destructive">{errors.stepsToReproduce}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentUrl">Current Page</Label>
            <Input
              id="currentUrl"
              value={currentUrl}
              readOnly
              className="bg-muted"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Bug Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
