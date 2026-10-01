import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { withJson, json, HttpError, isUuid } from "../_shared/http.ts";
import {
  guestInviteCode,
  verifyGuestInvite,
  guestPassword,
  guestDisplayName,
  isGuestUser,
} from "../_shared/guestTrials.ts";

const inviteFields =
  "id,label,expires_at,max_guests,max_interviews,guest_hours,revoked_at,created_at";
const guestFields = "id,display_name,guest_user_id,expires_at,created_at";
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
        const id = await verifyGuestInvite(body.code);
        const { data: invite, error } = await service
          .from("mmi_trial_invites")
          .select(inviteFields)
          .eq("id", id)
          .maybeSingle();
        if (error)
          throw new HttpError(503, "Invitations are temporarily unavailable");
        available(invite);
        if (body.action === "inspect") return json({ invite });
        const name = guestDisplayName(body.name);
        if (!isUuid(body.nonce) || body.acknowledged !== true)
          throw new HttpError(
            400,
            "Please acknowledge how your trial results will be shared",
          );
        const { data: trial, error: reserveError } = await service.rpc(
          "reserve_mmi_guest_trial",
          {
            p_invite_id: id,
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
      if (body.action === "status") {
        if (!isGuestUser(user))
          throw new HttpError(
            403,
            "Open your private trial invitation to begin",
          );
        const { data: trial, error } = await service
          .from("mmi_guest_trials")
          .select("id,invite_id,display_name,expires_at,interviews_started")
          .eq("guest_user_id", user.id)
          .eq("id", user.app_metadata.mmi_guest_trial)
          .maybeSingle();
        if (error)
          throw new HttpError(503, "Trial status is temporarily unavailable");
        if (!trial || Date.parse(trial.expires_at) <= Date.now())
          throw new HttpError(403, "Your guest trial has expired");
        const { data: invite, error: inviteError } = await service
          .from("mmi_trial_invites")
          .select(inviteFields)
          .eq("id", trial.invite_id)
          .maybeSingle();
        if (inviteError)
          throw new HttpError(503, "Trial status is temporarily unavailable");
        available(invite);
        return json({
          name: trial.display_name,
          expiresAt: trial.expires_at,
          remaining: Math.max(
            0,
            invite!.max_interviews - trial.interviews_started,
          ),
          maxInterviews: invite!.max_interviews,
        });
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
        const code = await guestInviteCode(id);
        const { data: invite, error } = await service
          .from("mmi_trial_invites")
          .insert({
            id,
            owner_id: user.id,
            label,
            expires_at: new Date(
              Date.now() + integer(body.days, 1, 14, 7) * 86400000,
            ).toISOString(),
            max_guests: integer(body.maxGuests, 1, 50, 10),
            max_interviews: integer(body.maxInterviews, 1, 12, 12),
            guest_hours: integer(body.guestHours, 1, 24, 6),
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
        return json({
          invites: await Promise.all(
            (data || []).map(async (invite) => ({
              ...invite,
              code: await guestInviteCode(invite.id),
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
        if (!ids.length) return json({ guests: guests || [], feedback: [] });
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
        return json({ guests, feedback: feedback || [] });
      }
      throw new HttpError(400, "Unknown trial action");
    },
    { allowGuests: true },
  ),
);
