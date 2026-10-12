import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Matches PROVIDER_BILLING_EVENT in supabase/functions/_shared/providerRetry.ts.
export const PROVIDER_BILLING_EVENT = 'provider_credit_exhausted';
export const ACTIVE_MINUTES = 15;
const BILLING_URL = 'https://platform.openai.com/settings/organization/billing/overview';

type Failure = { created_at: string };

/** OpenAI exposes no supported balance endpoint, so this reports actual refused calls. */
export function creditAlertState(failures: Failure[], now: number) {
  if (!failures.length) return null;
  const last = new Date(failures[0].created_at).getTime();
  const minutesAgo = Math.max(0, Math.floor((now - last) / 60000));
  const lastHour = failures.filter((f) => now - new Date(f.created_at).getTime() <= 3600000).length;
  return { active: minutesAgo < ACTIVE_MINUTES, minutesAgo, lastHour, last: new Date(last) };
}

export const ProviderCreditAlert = () => {
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['admin-provider-credit'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data: rows, error } = await (supabase as any)
        .from('app_logs')
        .select('created_at')
        .eq('event_type', PROVIDER_BILLING_EVENT)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (rows ?? []) as Failure[];
    },
    refetchInterval: 60000,
  });
  const state = data ? creditAlertState(data, dataUpdatedAt || Date.now()) : null;
  if (!state) return null;
  const ago = state.minutesAgo < 1 ? 'just now' : `${state.minutesAgo} minute${state.minutesAgo === 1 ? '' : 's'} ago`;

  if (!state.active) {
    return (
      <p className="mb-6 text-xs text-muted-foreground" role="status">
        Last OpenAI credit failure: {state.last.toLocaleString()}. None in the last {ACTIVE_MINUTES} minutes.
      </p>
    );
  }
  return (
    <Alert variant="destructive" role="alert" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>OpenAI credit exhausted</AlertTitle>
      <AlertDescription>
        Interviews cannot reply and feedback cannot be generated. Last refused call {ago}
        {state.lastHour > 1 ? ` (${state.lastHour} in the last hour)` : ''}.{' '}
        <a className="underline font-medium" href={BILLING_URL} target="_blank" rel="noreferrer">Top up OpenAI credit</a>
        {' '}and consider enabling auto-reload. This alert clears {ACTIVE_MINUTES} minutes after the last refused call.
      </AlertDescription>
    </Alert>
  );
};
