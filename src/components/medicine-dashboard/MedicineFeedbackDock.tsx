import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Send,
  Star,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredProductLine } from "@/lib/productLine";
import { isMedicineSite } from "@/lib/site";
import {
  FEEDBACK_COMMENT_LIMIT,
  submitMedicineProductFeedback,
} from "@/lib/medicineProductFeedback";
import { useMedicineColourScheme } from "./MedicineTheme";
import "./medicine-feedback-dock.css";

/** Mount once outside the route content so drafts survive medicine navigation. */
export function MedicineFeedbackDock() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [product, setProduct] = useState(getStoredProductLine);
  useEffect(() => {
    const update = () => setProduct(getStoredProductLine());
    window.addEventListener("intrvue:product-line-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("intrvue:product-line-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  const path = location.pathname;
  const medicinePage =
    isMedicineSite() || path.startsWith("/medicine") || product === "medicine";
  const accountPage = [
    "/",
    "/landing",
    "/medicine",
    "/practice",
    "/medicine/practice",
    "/examples",
    "/medicine/examples",
    "/about",
    "/faq",
  ].includes(path);
  if (
    !user ||
    loading ||
    user.is_anonymous ||
    user.app_metadata?.mmi_guest_trial ||
    !medicinePage ||
    !accountPage
  )
    return null;
  return <FeedbackPanel key={user.id} user={user} />;
}

function FeedbackPanel({ user }: { user: User }) {
  const { theme } = useMedicineColourScheme();
  const preferenceKey = `mmi:feedback-panel:${user.id}`;
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) !== "collapsed";
    } catch {
      return true;
    }
  });
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const attempt = useRef<{ fingerprint: string; id: string }>();
  const toggle = useRef<HTMLButtonElement>(null);
  const bodyId = useId();
  const inputId = useId();
  function changeExpanded(value: boolean) {
    setExpanded(value);
    try {
      localStorage.setItem(preferenceKey, value ? "expanded" : "collapsed");
    } catch {
      /* The control works without storage. */
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!comment.trim() && !rating) {
      setError("Add a message or choose a rating first.");
      return;
    }
    const fingerprint = JSON.stringify([comment.trim(), rating]);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, id: crypto.randomUUID() };
    inFlight.current = true;
    setSending(true);
    setError("");
    try {
      await submitMedicineProductFeedback({
        id: attempt.current.id,
        userId: user.id,
        email: user.email,
        comment,
        rating,
      });
      setSent(true);
      setComment("");
      setRating(0);
      attempt.current = undefined;
    } catch {
      setError(
        "Your feedback couldn't be sent. Your message is still here—please try again.",
      );
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }
  return (
    <aside
      className="medicine-theme medicine-feedback-dock"
      data-medicine-theme={theme}
      data-expanded={expanded}
      aria-label="Share feedback with MMI Practice"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          changeExpanded(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="medicine-feedback-toggle"
        aria-expanded={expanded}
        aria-controls={bodyId}
        aria-label={
          expanded ? "Minimise feedback panel" : "Open feedback panel"
        }
        onClick={() => changeExpanded(!expanded)}
      >
        <MessageSquare size={18} aria-hidden="true" />
        <span>{sent ? "Feedback sent · thank you" : "Share feedback"}</span>
        {expanded ? (
          <ChevronDown size={18} aria-hidden="true" />
        ) : (
          <ChevronUp size={18} aria-hidden="true" />
        )}
      </button>
      <div id={bodyId} hidden={!expanded} className="medicine-feedback-body">
        {sent ? (
          <div className="medicine-feedback-thanks" role="status">
            <Check size={24} aria-hidden="true" />
            <p>Thank you! Your feedback has been saved for our team.</p>
            <button
              type="button"
              className="medicine-feedback-again"
              onClick={() => setSent(false)}
            >
              Leave more feedback
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="medicine-feedback-intro">
              How can we make MMI Practice better?
            </p>
            <fieldset disabled={sending} className="medicine-feedback-rating">
              <legend>
                Your experience <span>(optional)</span>
              </legend>
              <div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`Rate ${value} out of 5`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(rating === value ? 0 : value)}
                  >
                    <Star
                      size={23}
                      aria-hidden="true"
                      fill={value <= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </fieldset>
            <label htmlFor={inputId}>Your feedback</label>
            <textarea
              id={inputId}
              rows={3}
              value={comment}
              maxLength={FEEDBACK_COMMENT_LIMIT}
              disabled={sending}
              onChange={(event) => setComment(event.target.value)}
              placeholder="What worked well? What could be better?"
              aria-describedby={`${inputId}-note`}
            />
            <p id={`${inputId}-note`} className="medicine-feedback-note">
              Linked to your account. Only our team can review it.
            </p>
            {error && (
              <p className="medicine-feedback-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="medicine-feedback-send"
              disabled={sending}
            >
              {sending ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}
              {sending ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
