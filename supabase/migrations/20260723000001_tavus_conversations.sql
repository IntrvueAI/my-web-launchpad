-- Maps a raw Tavus conversation_id to the intrvue user/session that started it. Tavus has no
-- built-in user/metadata field on a conversation, so this mapping is created by us (in
-- tavus-create-conversation) at creation time, and is what lets tavus-webhook attribute
-- webhook-delivered events (tool calls, transcripts, shutdown) back to the right person.
CREATE TABLE public.tavus_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_reference text NOT NULL,
  pal_id text,
  status text NOT NULL DEFAULT 'active', -- active | completed | error
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.tavus_conversations ENABLE ROW LEVEL SECURITY;

-- Users can see their own conversations; all writes go through edge functions (service role).
CREATE POLICY "Users can view their own tavus conversations"
  ON public.tavus_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX tavus_conversations_conversation_id_idx ON public.tavus_conversations (conversation_id);
CREATE INDEX tavus_conversations_user_id_idx ON public.tavus_conversations (user_id);
