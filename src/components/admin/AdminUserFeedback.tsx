import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { MEDICINE_PRODUCT_FEEDBACK } from "@/lib/medicineProductFeedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import {
  Star,
  ChevronDown,
  FileText,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

interface FeedbackShare {
  id: string;
  user_email: string | null;
  session_reference: string | null;
  interview_type: string | null;
  rating: number | null;
  comment: string | null;
  share_transcript: boolean;
  transcript: string | null;
  created_at: string;
}

/** Admin view of feedback students chose to share (comment, rating, and optionally their transcript). */
export const AdminUserFeedback: React.FC = () => {
  const { user } = useAuth();
  const feedback = useQuery({
    queryKey: ["admin-user-feedback", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_feedback_shares")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as FeedbackShare[];
    },
    refetchInterval: 30000,
    gcTime: 0,
    retry: 1,
  });
  const rows = feedback.data ?? [];

  if (feedback.isLoading)
    return <p className="text-muted-foreground">Loading feedback…</p>;
  if (feedback.error)
    return (
      <div role="alert" className="space-y-3">
        <p className="text-destructive">Feedback could not be loaded.</p>
        <Button variant="outline" onClick={() => feedback.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3" />
          No shared feedback yet.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Website comments and interview feedback shared with the team.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => feedback.refetch()}
          disabled={feedback.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">
                  {r.user_email || "Unknown user"}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {r.interview_type && (
                    <Badge variant="outline" className="text-xs">
                      {r.interview_type === MEDICINE_PRODUCT_FEEDBACK
                        ? "MMI website feedback"
                        : r.interview_type}
                    </Badge>
                  )}
                  {r.session_reference && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {r.session_reference}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("en-GB")}
                  </span>
                </div>
              </div>
              {r.rating != null && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${n <= r.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.comment && (
              <p className="whitespace-pre-wrap break-words text-sm">
                {r.comment}
              </p>
            )}
            {r.share_transcript && r.transcript ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="w-4 h-4" /> View shared transcript{" "}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-3 whitespace-pre-wrap text-xs bg-muted p-3 rounded-md max-h-96 overflow-auto">
                    {r.transcript}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            ) : r.interview_type !== MEDICINE_PRODUCT_FEEDBACK ? (
              <p className="text-xs text-muted-foreground">
                Transcript not shared.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
