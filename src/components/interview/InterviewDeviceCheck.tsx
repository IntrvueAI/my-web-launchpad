import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

/** A local microphone check. No recording, upload or provider session is created. */
export function InterviewDeviceCheck() {
  const [status, setStatus] = useState<
    "idle" | "pending" | "listening" | "done" | "error"
  >("idle");
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState(
    "Check that your microphone picks up your voice before connecting.",
  );
  const resources = useRef<{
    stream?: MediaStream;
    audio?: AudioContext;
    frame?: number;
    timer?: ReturnType<typeof setTimeout>;
  }>({});
  const generation = useRef(0);
  const stop = () => {
    generation.current += 1;
    const current = resources.current;
    resources.current = {};
    current.stream?.getTracks().forEach((track) => track.stop());
    if (current.frame) cancelAnimationFrame(current.frame);
    if (current.timer) clearTimeout(current.timer);
    void current.audio?.close().catch(() => {});
  };
  useEffect(() => () => stop(), []);
  const check = async () => {
    stop();
    const run = generation.current;
    setStatus("pending");
    setMessage("Allow microphone access when your browser asks.");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Microphone checks need a secure connection and a supported browser.",
        );
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (run !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      resources.current.stream = stream;
      const audio = new AudioContext();
      resources.current.audio = audio;
      await audio.resume();
      if (run !== generation.current) return;
      const analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      audio.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let peak = 0;
      setStatus("listening");
      setMessage("Say a few words. The meter should move with your voice.");
      const sample = () => {
        if (run !== generation.current) return;
        analyser.getByteTimeDomainData(data);
        const rms = Math.sqrt(
          data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) /
            data.length,
        );
        peak = Math.max(peak, rms);
        setLevel(Math.min(100, Math.round(rms * 500)));
        resources.current.frame = requestAnimationFrame(sample);
      };
      sample();
      resources.current.timer = setTimeout(() => {
        stop();
        setLevel(0);
        setStatus("done");
        setMessage(
          peak > 0.015
            ? "Sound detected. Check that it followed your voice, then start when ready."
            : "Microphone access works, but very little sound was detected. Check your input device or move closer.",
        );
      }, 8000);
    } catch (error) {
      if (run !== generation.current) return;
      stop();
      setStatus("error");
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow it in your browser’s site settings, then try again."
          : error instanceof Error
            ? error.message
            : "Microphone check failed. Try another input device.",
      );
    }
  };
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Mic className="w-4 h-4" />
          Microphone check
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (status === "pending" || status === "listening") {
              stop();
              setLevel(0);
              setStatus("idle");
              setMessage(
                "Microphone check stopped. You can try again when ready.",
              );
            } else {
              void check();
            }
          }}
        >
          {status === "pending" || status === "listening"
            ? "Cancel check"
            : "Check microphone"}
        </Button>
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {message}
      </p>
      {status === "listening" && (
        <div
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level}
          className="h-2 overflow-hidden rounded bg-muted"
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${level}%` }}
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        This check stays on your device and records nothing. Headphones can
        reduce echo.
      </p>
    </div>
  );
}
