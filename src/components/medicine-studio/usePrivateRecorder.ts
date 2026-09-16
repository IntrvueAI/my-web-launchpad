import { useEffect, useRef, useState } from "react";

/** Audio stays in this tab; no upload, transcription or localStorage audio. */
export function usePrivateRecorder() {
  const [state, setState] = useState<
    "idle" | "requesting" | "recording" | "stopping" | "ready"
  >("idle");
  const [url, setUrl] = useState("");
  const [mime, setMime] = useState("audio/webm");
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const objectUrl = useRef("");
  const generation = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  function releaseTracks() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  function discard() {
    generation.current++;
    clearTimeout(timeout.current);
    const current = recorder.current;
    if (current && current.state !== "inactive") current.stop();
    recorder.current = null;
    releaseTracks();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = "";
    setUrl("");
    setState("idle");
    setError("");
  }
  function stop() {
    clearTimeout(timeout.current);
    if (recorder.current?.state === "recording") {
      setState("stopping");
      recorder.current.stop();
      releaseTracks();
    } else if (!recorder.current) {
      generation.current++;
      releaseTracks();
      setState("idle");
    }
  }
  async function start() {
    if (state === "requesting" || state === "recording" || state === "stopping")
      return;
    discard();
    const ticket = generation.current;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Audio recording is unavailable here. Type your answer or practise aloud without recording.",
      );
      return;
    }
    setState("requesting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (ticket !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const instance = new MediaRecorder(media);
      recorder.current = instance;
      const chunks: Blob[] = [];
      instance.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      instance.onstop = () => {
        if (ticket !== generation.current) return;
        clearTimeout(timeout.current);
        releaseTracks();
        recorder.current = null;
        const blob = new Blob(chunks, {
          type: instance.mimeType || "audio/webm",
        });
        if (!blob.size) {
          setState("idle");
          setError(
            "No audio was captured. You can still use your written notes.",
          );
          return;
        }
        objectUrl.current = URL.createObjectURL(blob);
        setUrl(objectUrl.current);
        setMime(blob.type);
        setState("ready");
      };
      instance.onerror = () => {
        if (ticket === generation.current) {
          discard();
          setError(
            "Recording stopped unexpectedly. Try again or use written notes.",
          );
        }
      };
      instance.start(1000);
      setState("recording");
      timeout.current = setTimeout(stop, 10 * 60 * 1000);
    } catch {
      if (ticket !== generation.current) return;
      releaseTracks();
      setState("idle");
      setError(
        "Microphone access was not available. You can type or practise aloud without recording.",
      );
    }
  }
  useEffect(
    () => () => {
      generation.current++;
      clearTimeout(timeout.current);
      if (recorder.current && recorder.current.state !== "inactive")
        recorder.current.stop();
      releaseTracks();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  return {
    state,
    url,
    error,
    start,
    stop,
    discard,
    extension: mime.includes("mp4")
      ? "m4a"
      : mime.includes("ogg")
        ? "ogg"
        : "webm",
  };
}
