export interface SchoolInterview {
  school: string;
  interview_date: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  schools?: string[];
  interview_date?: string;
  school_interviews?: SchoolInterview[];
  preferred_interview_type?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditBalance {
  user_id: string;
  credits: number;
  updated_at: string;
}
