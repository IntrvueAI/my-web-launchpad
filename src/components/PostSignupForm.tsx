import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SchoolCombobox } from "@/components/shared/SchoolCombobox";
import { cn } from "@/lib/utils";

interface PostSignupFormProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface SchoolRow {
  school: string;
  date: Date | undefined;
}

export const PostSignupForm = ({ isOpen, onClose, userId }: PostSignupFormProps) => {
  const [rows, setRows] = useState<SchoolRow[]>([{ school: "", date: undefined }]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addSchoolField = () => {
    setRows([...rows, { school: "", date: undefined }]);
  };

  const removeSchoolField = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateSchool = (index: number, value: string) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, school: value } : row)));
  };

  const updateSchoolDate = (index: number, date: Date | undefined) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, date } : row)));
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const filteredRows = rows.filter((row) => row.school.trim() !== "");

      // Same shape UserSettings.tsx writes — school_interviews is the current/preferred column
      // (one row per school, its own date); schools[]/interview_date are kept in sync too since
      // some older readers still use them (see school_interviews migration comment).
      const schoolInterviews = filteredRows.map((row) => ({
        school: row.school.trim(),
        interview_date: row.date ? row.date.toISOString().split("T")[0] : null,
      }));
      const datedRows = filteredRows.filter((row): row is { school: string; date: Date } => !!row.date);
      const earliestDate = datedRows.length
        ? new Date(Math.min(...datedRows.map((row) => row.date.getTime())))
        : null;

      const { error } = await supabase
        .from("profiles")
        .update({
          school_interviews: schoolInterviews,
          schools: filteredRows.length > 0 ? filteredRows.map((row) => row.school.trim()) : null,
          interview_date: earliestDate ? earliestDate.toISOString().split('T')[0] : null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Information saved!",
        description: "Your school and interview details have been saved.",
      });

      onClose();
    } catch (error) {
      console.error("Error saving post-signup info:", error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tell us about your interview</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardDescription>
              Help us personalize your experience by sharing details about your upcoming interviews (optional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="schools">Schools you're applying to</Label>
              <div className="space-y-2 mt-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <SchoolCombobox
                        value={row.school}
                        onChange={(value) => updateSchool(index, value)}
                        className="flex-1"
                      />
                      {rows.length > 1 && (
                        <Button type="button" variant="outline" size="icon" onClick={() => removeSchoolField(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !row.date && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {row.date ? format(row.date, "PPP") : "Select interview date (optional)"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={row.date} onSelect={(date) => updateSchoolDate(index, date)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSchoolField}
                  className="w-full"
                >
                  Add another school
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSkip} variant="outline" className="flex-1">
                Skip for now
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
