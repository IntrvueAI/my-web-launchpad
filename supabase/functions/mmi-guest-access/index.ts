import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { withJson, json, HttpError, isUuid } from "../_shared/http.ts";
import {
  guestInviteCode,
  verifyGuestInvite,
  guestPassword,
  guestDisplayName,
  isGuestUser,
  isShortGuestCode,
  newGuestLinkCode,
  guestReviewInput,
} from "../_shared/guestTrials.ts";

const inviteFields =
  "id,label,expires_at,max_guests,max_interviews,guest_hours,revoked_at,created_at,link_code";
const guestFields =
  "id,display_name,guest_user_id,expires_at,created_at,interviews_started,review_required_at";
function integer(value: unknown, min: number, max: number, fallback: number) {
  if (value === undefined) return fallback;
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new HttpError(400, "Invalid trial limit");
  return Number(value);
}
function available(
  invite: { revoked_at: string | null; expires_at: string } | null,
) {
  if (
    !invite ||
    invite.revoked_at ||
    Date.parse(invite.expires_at) <= Date.now()
  )
    throw new HttpError(
      403,
      "This trial invitation has expired or been closed",
    );
}

serve(
  withJson(
    async (req) => {
      const body = await req.json();
      const url = Deno.env.get("SUPABASE_URL")!;
      const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
      const service = createClient(
        url,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const auth = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      if (body.action === "inspect" || body.action === "redeem") {
        const short = isShortGuestCode(body.code);
        const id = short ? null : await verifyGuestInvite(body.code);
        const { data: invite, error } = await service
          .from("mmi_trial_invites")
          .select(inviteFields)
          .eq(short ? "link_code" : "id", short ? body.code : id)
          .maybeSingle();
        if (error)
          throw new HttpError(503, "Invitations are temporarily unavailable");
        available(invite);
        // Do not echo the bearer code into public responses or generic loggers.
        if (body.action === "inspect") {
          const { link_code: _privateCode, ...publicInvite } = invite!;
          return json({ invite: publicInvite });
        }
        const name = guestDisplayName(body.name);
        if (!isUuid(body.nonce) || body.acknowledged !== true)
          throw new HttpError(
            400,
            "Please acknowledge how your trial results will be shared",
          );
        const { data: trial, error: reserveError } = await service.rpc(
          "reserve_mmi_guest_trial",
          {
            p_invite_id: invite!.id,
            p_display_name: name,
            p_client_nonce: body.nonce,
          },
        );
        if (reserveError || !trial) {
          const safe = [
            "This invitation has reached its guest limit",
            "This trial attempt cannot be resumed",
            "This trial invitation has expired or been closed",
          ];
          throw new HttpError(
            403,
            reserveError && safe.includes(reserveError.message)
              ? reserveError.message
              : "Unable to reserve this trial",
          );
        }
        const email = `trial.${trial.id}@guest.invalid`;
        const password = await guestPassword(trial.id, body.nonce);
        if (!trial.guest_user_id) {
          const { error: createError } = await service.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name },
            app_metadata: { mmi_guest_trial: trial.id },
          });
          // Retrying the same reservation may encounter the account created by its first request.
          if (
            createError &&
            !["email_exists", "user_already_exists"].includes(
              createError.code || "",
            ) &&
            createError.status !== 422
          ) {
            throw new HttpError(
              503,
              "Unable to open your trial. Please try again.",
            );
          }
        }
        const { data, error: signInError } = await auth.auth.signInWithPassword(
          { email, password },
        );
        if (
          signInError ||
          !data.session ||
          data.user?.app_metadata?.mmi_guest_trial !== trial.id ||
          (trial.guest_user_id && trial.guest_user_id !== data.user.id)
        ) {
          throw new HttpError(
            503,
            "Unable to open your trial. Please try again.",
          );
        }
        const { error: attachError } = await service
          .from("mmi_guest_trials")
          .update({ guest_user_id: data.user.id })
          .eq("id", trial.id);
        if (attachError)
          throw new HttpError(
            503,
            "Unable to save your trial. Please try again.",
          );
        // A trial is sponsored through its invitation, never through the founder's balance or JWT.
        const { error: balanceError } = await service
          .from("credits_balance")
          .upsert(
            { user_id: data.user.id, credits: 0 },
            { onConflict: "user_id" },
          );
        if (balanceError)
          throw new HttpError(
            503,
            "Unable to prepare your trial. Please try again.",
          );
        return json({
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        });
      }

      const token = req.headers
        .get("authorization")!
        .replace(/^Bearer\s+/i, "");
      const {
        data: { user },
        error: userError,
      } = await auth.auth.getUser(token);
      if (userError || !user) throw new HttpError(401, "Please sign in");
      if (["status", "request-review", "submit-review"].includes(body.action)) {
        if (!isGuestUser(user))
          throw new HttpError(
            403,
            "Open your private trial invitation to begin",
          );
        const args: Record<string, unknown> = { p_user_id: user.id };
        let rpc =
          body.action === "request-review"
            ? "request_mmi_trial_review"
            : "get_mmi_guest_trial_status";
        if (body.action === "submit-review") {
          const review = guestReviewInput(body);
          rpc = "submit_mmi_trial_review";
          Object.assign(args, {
            p_rating: review.rating,
            p_experience: review.experience,
            p_improvement: review.improvement,
          });
        }
        const { data: status, error } = await service.rpc(rpc, args);
        if (error && error.message !== "Guest trial not found")
          throw new HttpError(
            503,
            "Trial feedback is temporarily unavailable. Please retry.",
          );
        if (
          error ||
          !status ||
          status.trialId !== user.app_metadata.mmi_guest_trial
        )
          throw new HttpError(403, "Your guest trial is not available");
        return json(status);
      }
      if (isGuestUser(user))
        throw new HttpError(403, "Founder access required");
      const caller = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data: isAdmin, error: adminError } = await caller.rpc(
        "is_current_user_admin",
      );
      if (adminError || isAdmin !== true)
        throw new HttpError(403, "Founder access required");

      if (body.action === "create") {
        const label = typeof body.label === "string" ? body.label.trim() : "";
        if (!label || label.length > 100)
          throw new HttpError(400, "Give this invitation a short label");
        // Check configuration before creating a row which could not be shared.
        const id = crypto.randomUUID();
        await guestPassword(id, id); // Check the server signing secret before creating a link.
        const code = newGuestLinkCode();
        const { data: invite, error } = await service
          .from("mmi_trial_invites")
          .insert({
            id,
            owner_id: user.id,
            label,
            expires_at: new Date(
              Date.now() + integer(body.days, 1, 14, 7) * 86400000,
            ).toISOString(),
            link_code: code,
            max_guests: 1,
            max_interviews: 2,
            guest_hours: 6,
          })
          .select(inviteFields)
          .single();
        if (error) throw new HttpError(503, "Unable to create an invitation");
        return json({ invite: { ...invite, code } });
      }
      if (body.action === "list") {
        const { data, error } = await service
          .from("mmi_trial_invites")
          .select(inviteFields)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw new HttpError(503, "Unable to load invitations");
        const summaries = new Map<
          string,
          { guest_count: number; attempts_used: number; review_count: number }
        >();
        if (data?.length) {
          const { data: trials, error: trialsError } = await service
            .from("mmi_guest_trials")
            .select(
              "invite_id,interviews_started,mmi_trial_reviews(created_at)",
            )
            .in(
              "invite_id",
              data.map((invite) => invite.id),
            )
            .limit(5000);
          if (trialsError)
            throw new HttpError(503, "Unable to load invitation usage");
          for (const trial of trials || []) {
            const summary = summaries.get(trial.invite_id) || {
              guest_count: 0,
              attempts_used: 0,
              review_count: 0,
            };
            summary.guest_count += 1;
            summary.attempts_used += trial.interviews_started;
            summary.review_count += Array.isArray(trial.mmi_trial_reviews)
              ? trial.mmi_trial_reviews.length
              : trial.mmi_trial_reviews
                ? 1
                : 0;
            summaries.set(trial.invite_id, summary);
          }
        }
        return json({
          invites: await Promise.all(
            (data || []).map(async (invite) => ({
              ...invite,
              ...(summaries.get(invite.id) || {
                guest_count: 0,
                attempts_used: 0,
                review_count: 0,
              }),
              code: invite.link_code || (await guestInviteCode(invite.id)),
            })),
          ),
        });
      }
      if (!isUuid(body.inviteId))
        throw new HttpError(400, "Select an invitation");
      const { data: owned, error: ownerError } = await service
        .from("mmi_trial_invites")
        .select("id")
        .eq("id", body.inviteId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (ownerError)
        throw new HttpError(503, "Unable to check this invitation");
      if (!owned) throw new HttpError(404, "Invitation not found");
      if (body.action === "revoke") {
        const { error } = await service
          .from("mmi_trial_invites")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", owned.id)
          .eq("owner_id", user.id);
        if (error) throw new HttpError(503, "Unable to close this invitation");
        return json({ ok: true });
      }
      if (body.action === "guests" || body.action === "feedback") {
        const { data: guests, error } = await service
          .from("mmi_guest_trials")
          .select(guestFields)
          .eq("invite_id", owned.id)
          .order("created_at", { ascending: false });
        if (error) throw new HttpError(503, "Unable to load guests");
        const ids = (guests || []).map((g) => g.guest_user_id).filter(Boolean);
        if (body.action === "feedback") {
          if (!isUuid(body.feedbackId) || !ids.length)
            throw new HttpError(404, "Feedback not found");
          const { data: feedback, error: detailError } = await service
            .from("feedback")
            .select("*")
            .eq("id", body.feedbackId)
            .in("user_id", ids)
            .maybeSingle();
          if (detailError) throw new HttpError(503, "Unable to load feedback");
          if (!feedback) throw new HttpError(404, "Feedback not found");
          return json({ feedback });
        }
        const trialIds = (guests || []).map((g) => g.id);
        let reviews: unknown[] = [];
        if (trialIds.length) {
          const { data, error: reviewError } = await service
            .from("mmi_trial_reviews")
            .select("trial_id,rating,experience,improvement,created_at")
            .in("trial_id", trialIds);
          if (reviewError)
            throw new HttpError(503, "Unable to load tester feedback");
          reviews = data || [];
        }
        if (!ids.length)
          return json({ guests: guests || [], feedback: [], reviews });
        const { data: feedback, error: feedbackError } = await service
          .from("feedback")
          .select(
            "id,user_id,interview_type,total_score,created_at,detailed_feedback",
          )
          .in("user_id", ids)
          .order("created_at", { ascending: false })
          .limit(1000);
        if (feedbackError)
          throw new HttpError(503, "Unable to load guest results");
        return json({ guests, feedback: feedback || [], reviews });
      }
      throw new HttpError(400, "Unknown trial action");
    },
    { allowGuests: true },
  ),
);
