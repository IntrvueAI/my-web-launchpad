import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Calendar, User, Mail, Reply, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackItem {
  id: string;
  user_id: string;
  subject: string | null;
  message: string;
  category: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

const AdminUserFeedback: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackList(data || []);
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      toast({
        title: "Error loading feedback",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;

    setIsUpdating(true);
    try {
      const updates: any = {};
      if (newStatus) updates.status = newStatus;
      if (adminResponse.trim()) updates.admin_response = adminResponse.trim();

      const { error } = await supabase
        .from('user_feedback')
        .update(updates)
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      toast({
        title: "Feedback updated successfully",
        description: "The feedback has been updated.",
      });

      // Refresh the list
      await fetchFeedback();
      setSelectedFeedback(null);
      setAdminResponse('');
      setNewStatus('');
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast({
        title: "Error updating feedback",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openFeedbackDialog = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setAdminResponse(feedback.admin_response || '');
    setNewStatus(feedback.status);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'destructive';
      case 'reviewed': return 'secondary';
      case 'in_progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'bug_report': return 'Bug Report';
      case 'feature_request': return 'Feature Request';
      case 'general': return 'General';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'new': return 'New';
      case 'reviewed': return 'Reviewed';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const filteredFeedback = feedbackList.filter(feedback => {
    const matchesSearch = !searchTerm || 
      feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || feedback.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">User Feedback Management</h2>
        <p className="text-muted-foreground">Review and respond to user feedback submissions.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
              <p className="text-muted-foreground text-center">
                {feedbackList.length === 0 
                  ? "No feedback has been submitted yet."
                  : "No feedback matches your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedback.map((feedback) => (
            <Card key={feedback.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {feedback.subject || `${getCategoryLabel(feedback.category)} Feedback`}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {feedback.profiles?.full_name || 'Anonymous'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {feedback.profiles?.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                      </span>
                      <Badge variant="outline">{getCategoryLabel(feedback.category)}</Badge>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(feedback.status)}>
                      {formatStatus(feedback.status)}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openFeedbackDialog(feedback)}
                        >
                          <Reply className="w-4 h-4 mr-2" />
                          {feedback.admin_response ? 'Edit Response' : 'Respond'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {feedback.admin_response ? 'Edit Response' : 'Respond to Feedback'}
                          </DialogTitle>
                          <DialogDescription>
                            Update the status and optionally add a response to this feedback.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="font-medium">User's Message</Label>
                            <p className="text-sm bg-muted p-3 rounded-md mt-2">
                              {selectedFeedback?.message}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="admin-response">Admin Response (Optional)</Label>
                            <Textarea
                              id="admin-response"
                              value={adminResponse}
                              onChange={(e) => setAdminResponse(e.target.value)}
                              placeholder="Add a response to the user..."
                              className="min-h-[100px]"
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedFeedback(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleUpdateFeedback}
                              disabled={isUpdating}
                              className="flex-1"
                            >
                              {isUpdating ? 'Updating...' : 'Update Feedback'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feedback.message.length > 200 
                    ? `${feedback.message.substring(0, 200)}...`
                    : feedback.message
                  }
                </p>
                {feedback.admin_response && (
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Admin Response:</h4>
                    <p className="text-sm">{feedback.admin_response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminUserFeedback;