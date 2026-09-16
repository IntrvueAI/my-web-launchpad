import { useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import prompts from "@/interview/bank/questions/medicine/motivation-reflection/1.json";

export function MedicineWarmup() {
  const q = prompts[0];
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState(false);
  return (
    <div className="med-warmup" aria-label="Interactive practice preview">
      <div className="med-warmup-top">
        <span>
          <i />
          TRY A REAL PRACTICE PROMPT
        </span>
        <span>01 / REFLECTION</span>
      </div>
      <div className="med-warmup-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <h2>{q.question}</h2>
      {review ? (
        <div className="med-warmup-review">
          <span>
            <Check size={15} />A POINT TO REFLECT ON
          </span>
          <p>{q.rubric.strong}</p>
          <p className="med-warmup-note">
            Compare this with your own answer. This is a review guide, not an AI
            assessment.
          </p>
          <button onClick={() => setReview(false)}>
            <RotateCcw size={14} />
            Try a clearer version
          </button>
        </div>
      ) : (
        <>
          <label htmlFor="medicine-warmup">What comes to mind?</label>
          <textarea
            id="medicine-warmup"
            value={answer}
            maxLength={1000}
            rows={3}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Try an opening sentence…"
          />
          <button disabled={!answer.trim()} onClick={() => setReview(true)}>
            Reflect on my answer <ArrowRight size={15} />
          </button>
        </>
      )}
      <a href={`/medicine/practice?question=${q.id}`}>
        Open the full practice room <ArrowRight size={15} />
      </a>
      <small>No sign-up · your preview answer stays on this page</small>
    </div>
  );
}
