-- Owner-scoped beta feedback inbox. Called only by the edge function after admin
-- verification; no new access is granted to authenticated users or guests.
CREATE INDEX IF NOT EXISTS feedback_guest_review_idx
  ON public.feedback(user_id, session_reference, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.get_mmi_feedback_inbox(
  p_owner_id uuid,
  p_search text DEFAULT '',
  p_review text DEFAULT 'all',
  p_interview_type text DEFAULT '',
  p_invite_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF p_owner_id IS NULL OR p_page IS NULL OR p_page < 1 OR p_page > 100000
    OR p_review IS NULL OR p_review NOT IN ('all','reviewed','waiting','issues')
    OR p_search IS NULL OR char_length(p_search) > 100
    OR p_interview_type IS NULL OR char_length(p_interview_type) > 80 THEN
    RAISE EXCEPTION 'Invalid feedback filter';
  END IF;
  RETURN (
    WITH owned AS MATERIALIZED (
      SELECT t.id, t.guest_user_id, t.display_name, t.created_at,
        t.interviews_started, i.id AS invite_id, i.label AS invite_label
      FROM mmi_guest_trials t JOIN mmi_trial_invites i ON i.id=t.invite_id
      WHERE i.owner_id=p_owner_id AND (p_invite_id IS NULL OR i.id=p_invite_id)
    ), latest_feedback AS MATERIALIZED (
      -- Assessment retries replace the displayed assessment, not the interview count.
      SELECT DISTINCT ON (o.id, coalesce(nullif(f.session_reference,''),f.id::text))
        o.id AS trial_id, f.id, f.session_reference, f.interview_type,
        f.total_score, f.created_at, left(f.detailed_feedback->>'overall',500) AS overview
      FROM owned o JOIN feedback f ON f.user_id=o.guest_user_id
      WHERE f.interview_type LIKE 'medicine-%'
      ORDER BY o.id, coalesce(nullif(f.session_reference,''),f.id::text), f.created_at DESC, f.id DESC
    ), interviews AS MATERIALIZED (
      SELECT o.id AS trial_id, s.id::text AS id, f.id AS feedback_id,
        s.interview_type, s.started_at AS created_at, s.status,
        f.total_score, f.overview
      FROM owned o JOIN mmi_guest_runs r ON r.trial_id=o.id
      JOIN interview_sessions s ON s.id=r.session_id AND s.user_id=o.guest_user_id
      LEFT JOIN latest_feedback f ON f.trial_id=o.id AND f.session_reference=s.session_reference
      UNION ALL
      -- Preserve older saved assessments even if their session was removed.
      SELECT f.trial_id, f.id::text, f.id, f.interview_type, f.created_at,
        'completed', f.total_score, f.overview
      FROM latest_feedback f WHERE NOT EXISTS (
        SELECT 1 FROM mmi_guest_runs r JOIN interview_sessions s ON s.id=r.session_id
        JOIN owned o ON o.id=r.trial_id AND s.user_id=o.guest_user_id
        WHERE r.trial_id=f.trial_id AND s.session_reference=f.session_reference
      )
    ), rows AS MATERIALIZED (
      SELECT o.id, o.display_name, o.created_at, o.interviews_started,
        o.invite_id, o.invite_label,
        CASE WHEN v.trial_id IS NOT NULL THEN jsonb_build_object(
          'trial_id',v.trial_id,'rating',v.rating,'experience',v.experience,
          'improvement',v.improvement,'created_at',v.created_at) END AS review,
        v.experience, v.rating,
        coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id',x.id,'feedback_id',x.feedback_id,'interview_type',x.interview_type,
          'created_at',x.created_at,'status',x.status,'total_score',x.total_score,
          'overview',x.overview) ORDER BY x.created_at DESC,x.id DESC)
          FROM interviews x WHERE x.trial_id=o.id),'[]'::jsonb) AS interviews,
        greatest(o.created_at,v.created_at,(SELECT max(x.created_at)
          FROM interviews x WHERE x.trial_id=o.id)) AS updated_at
      FROM owned o LEFT JOIN mmi_trial_reviews v ON v.trial_id=o.id
    ), matched AS MATERIALIZED (
      SELECT * FROM rows o
      WHERE (p_search='' OR strpos(lower(o.display_name||' '||o.invite_label),lower(btrim(p_search)))>0)
        AND (p_review='all' OR (p_review='reviewed' AND o.review IS NOT NULL)
          OR (p_review='waiting' AND o.review IS NULL)
          OR (p_review='issues' AND o.experience IN ('some-issues','could-not-complete')))
        AND (p_interview_type='' OR EXISTS (SELECT 1 FROM interviews x
          WHERE x.trial_id=o.id AND x.interview_type=p_interview_type))
    ), paged AS (
      SELECT * FROM matched ORDER BY updated_at DESC,id DESC LIMIT 20 OFFSET (p_page-1)*20
    )
    SELECT jsonb_build_object(
      'total',(SELECT count(*) FROM matched),'page',p_page,'pageSize',20,
      'summary',jsonb_build_object(
        'testers',(SELECT count(*) FROM owned),
        'assessments',(SELECT count(*) FROM interviews WHERE feedback_id IS NOT NULL),
        'reviews',(SELECT count(*) FROM rows WHERE review IS NOT NULL),
        'issues',(SELECT count(*) FROM rows WHERE experience IN ('some-issues','could-not-complete')),
        'averageRating',(SELECT round(avg(rating),1) FROM rows)),
      'trials',coalesce((SELECT jsonb_agg(to_jsonb(p)-'experience'-'rating'
        ORDER BY p.updated_at DESC,p.id DESC) FROM paged p),'[]'::jsonb)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_mmi_feedback_inbox(uuid,text,text,text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_mmi_feedback_inbox(uuid,text,text,text,uuid,integer) TO service_role;
