import { useEffect, useRef, useState } from "react";
import { createClient, type AnamClient } from "@anam-ai/js-sdk";
import { AnamEvent, type MessageStreamEvent } from "@anam-ai/js-sdk/dist/module/types";
import { Circle, Maximize2, Minimize2, Pause, Play, Send, Square, Download, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

const VIDEO_ID = "lab-sandbox-video";
const SCRIPT_KEY = "lab:sandbox-script:v1";
/** Same interviewer as real interviews: Clara on the current avatar model. */
const CLARA = { avatarId: "bb4f5306-ffdb-4437-a837-da6fdc23cbff", avatarModel: "cara-4", voiceId: "04965b9e-ff4c-4b54-a4dc-fba6e458c760" };

/** Script lines are paragraphs: a blank line starts the next thing Clara says. */
export function scriptLines(script: string): string[] {
  return script.split(/\n\s*\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}
/** A generous estimate of speaking time, used only if the avatar's end-of-speech event is missed. */
export const estimatedSpeechMs = (text: string) => Math.min(90_000, (text.split(/\s+/).length / 2.4) * 1000 + 2500);

type Status = "idle" | "connecting" | "live" | "ended" | "error";

/** Clara reads exactly what she is given: a prepared script or lines typed live. No AI, no microphone. */
export function LabSandbox() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [script, setScript] = useState(() => {
    try { return localStorage.getItem(SCRIPT_KEY) ?? ""; } catch { return ""; }
  });
  const [cursor, setCursor] = useState(0);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const [pauseMs, setPauseMs] = useState(700);
  const [live, setLive] = useState("");
  const [clean, setClean] = useState(false);
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const clientRef = useRef<AnamClient | null>(null);
  const finishedRef = useRef<(() => void) | null>(null);
  const stopPlayRef = useRef(false);
  const streamsRef = useRef<{ video?: MediaStream; audio?: MediaStream }>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const lines = scriptLines(script);

  useEffect(() => {
    try { localStorage.setItem(SCRIPT_KEY, script); } catch { /* Optional convenience only. */ }
  }, [script]);
  useEffect(() => () => { void clientRef.current?.stopStreaming(); }, []);
  useEffect(() => {
    if (!clean) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setClean(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clean]);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip); }, [clip]);

  async function connect() {
    setStatus("connecting");
    setError("");
    try {
      const { data, error: tokenError } = await invokeEdgeFunction<{ sessionToken: string }>("get-anam-session-token", {
        body: { personaConfig: { name: "Clara (sandbox)", ...CLARA, llmId: "CUSTOMER_CLIENT_V1", maxSessionLengthSeconds: minutes * 60 }, engineDriven: true },
      });
      if (tokenError || !data?.sessionToken) throw new Error(tokenError?.message || "No session token received");
      const client = createClient(data.sessionToken, { disableInputAudio: true });
      clientRef.current = client;
      client.addListener(AnamEvent.SESSION_READY, () => setStatus("live"));
      client.addListener(AnamEvent.CONNECTION_CLOSED, () => { setStatus("ended"); setSpeaking(null); finishedRef.current?.(); });
      client.addListener(AnamEvent.VIDEO_STREAM_STARTED, (stream: MediaStream) => { streamsRef.current.video = stream; });
      client.addListener(AnamEvent.AUDIO_STREAM_STARTED, (stream: MediaStream) => { streamsRef.current.audio = stream; });
      client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: MessageStreamEvent) => {
        if (String(event.role) === "persona" && event.endOfSpeech) finishedRef.current?.();
      });
      client.addListener(AnamEvent.TALK_STREAM_INTERRUPTED, () => finishedRef.current?.());
      await client.streamToVideoElement(VIDEO_ID);
      setStatus("live");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Clara could not connect");
      clientRef.current = null;
    }
  }

  /** Say one line exactly, resolving when Clara finishes (or the estimate runs out). */
  async function say(text: string) {
    const client = clientRef.current;
    const line = text.trim();
    if (!client || !line) return;
    setSpeaking(line);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(done, estimatedSpeechMs(line));
      function done() { clearTimeout(timer); finishedRef.current = null; resolve(); }
      finishedRef.current = done;
      client.talk(line).catch((e) => { setError(e instanceof Error ? e.message : "Clara could not say that line"); done(); });
    });
    setSpeaking(null);
  }
  async function playFrom(start: number) {
    stopPlayRef.current = false;
    setPlayingAll(true);
    for (let i = start; i < lines.length && !stopPlayRef.current; i++) {
      setCursor(i);
      await say(lines[i]);
      setCursor(i + 1);
      if (i < lines.length - 1 && !stopPlayRef.current) await new Promise((r) => setTimeout(r, pauseMs));
    }
    setPlayingAll(false);
  }
  function stopSpeaking() {
    stopPlayRef.current = true;
    setPlayingAll(false);
    try { clientRef.current?.interruptPersona(); } catch { /* Already quiet. */ }
    finishedRef.current?.();
  }
  async function end() {
    stopSpeaking();
    if (recording) stopRecording();
    await clientRef.current?.stopStreaming();
    clientRef.current = null;
    setStatus("ended");
  }
  function startRecording() {
    const video = (document.getElementById(VIDEO_ID) as HTMLVideoElement | null);
    const videoTracks = streamsRef.current.video?.getVideoTracks() ?? (video?.srcObject as MediaStream | null)?.getVideoTracks() ?? [];
    const audioTracks = streamsRef.current.audio?.getAudioTracks() ?? (video?.srcObject as MediaStream | null)?.getAudioTracks() ?? [];
    if (!videoTracks.length || typeof MediaRecorder === "undefined") {
      setError("Recording is not available in this browser. Use a screen recorder with the clean view instead.");
      return;
    }
    const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(new MediaStream([...videoTracks, ...audioTracks]), type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      if (clip) URL.revokeObjectURL(clip);
      setClip(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "video/webm" })));
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    setClip(null);
  }
  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  const connected = status === "live";
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <section aria-label="Clara" className={clean ? "fixed inset-0 z-[200] flex items-center justify-center bg-black" : "space-y-3"}>
        <div className={clean ? "relative h-full w-full" : "relative aspect-video overflow-hidden rounded-2xl bg-muted"}>
          <video id={VIDEO_ID} autoPlay playsInline className={`h-full w-full ${clean ? "object-contain" : "object-cover"}`} />
          {!connected && !clean && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {status === "connecting" ? "Connecting Clara…" : status === "ended" ? "Session ended." : "Connect to bring Clara on screen."}
            </div>
          )}
          {speaking && !clean && <p className="absolute inset-x-3 bottom-3 rounded-lg bg-background/85 px-3 py-2 text-sm" aria-live="polite">Saying: {speaking}</p>}
          {clean && (
            <button type="button" onClick={() => setClean(false)}
              className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100" aria-label="Leave clean view (Esc)">
              <Minimize2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {!clean && (
          <div className="flex flex-wrap items-center gap-2">
            {!connected ? (
              <>
                <label className="text-sm">
                  Session length{" "}
                  <select className="ml-1 rounded-md border bg-background px-2 py-1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} disabled={status === "connecting"}>
                    {[5, 10, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </label>
                <Button onClick={() => void connect()} disabled={status === "connecting"}>{status === "connecting" ? "Connecting…" : "Connect Clara"}</Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setClean(true)}><Maximize2 className="h-4 w-4" aria-hidden /> Clean view</Button>
                {recording
                  ? <Button variant="destructive" className="gap-2" onClick={stopRecording}><Square className="h-4 w-4" aria-hidden /> Stop recording</Button>
                  : <Button variant="outline" className="gap-2" onClick={startRecording}><Circle className="h-4 w-4 fill-red-500 text-red-500" aria-hidden /> Record clip</Button>}
                <Button variant="ghost" onClick={() => void end()}>End session</Button>
              </>
            )}
            {clip && (
              <Button asChild variant="secondary" className="gap-2">
                <a href={clip} download={`clara-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`}><Download className="h-4 w-4" aria-hidden /> Download clip</a>
              </Button>
            )}
          </div>
        )}
        {error && !clean && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!clean && (
          <p className="text-xs text-muted-foreground">
            Clara has no AI and no microphone here: she says only the lines you send. The avatar service is billed per minute while connected, so end the session when you finish.
          </p>
        )}
      </section>

      <section aria-label="Script" className="space-y-4">
        <div className="rounded-2xl border bg-card p-4">
          <label htmlFor="sandbox-live" className="text-sm font-medium">Say this now</label>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const text = live; setLive(""); void say(text); }}>
            <Input id="sandbox-live" value={live} onChange={(e) => setLive(e.target.value)} placeholder="Type a line and press Enter" disabled={!connected} maxLength={1500} />
            <Button type="submit" size="icon" aria-label="Say it" disabled={!connected || !live.trim()}><Send className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="outline" aria-label="Stop speaking" disabled={!connected || !speaking} onClick={stopSpeaking}><Hand className="h-4 w-4" /></Button>
          </form>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <label htmlFor="sandbox-script" className="text-sm font-medium">Script</label>
          <p className="text-xs text-muted-foreground">Leave a blank line between the things Clara should say. Saved in this browser.</p>
          <Textarea id="sandbox-script" className="mt-2" rows={8} value={script} onChange={(e) => { setScript(e.target.value); setCursor(0); }}
            placeholder={"Hi, I'm Clara. Interviews can feel daunting, so let's practise together.\n\nOn intrvue.ai you can rehearse real interview questions and get feedback straight away."} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {playingAll
              ? <Button variant="outline" className="gap-2" onClick={stopSpeaking}><Pause className="h-4 w-4" aria-hidden /> Stop</Button>
              : <Button className="gap-2" disabled={!connected || !lines.length} onClick={() => void playFrom(cursor >= lines.length ? 0 : cursor)}><Play className="h-4 w-4" aria-hidden /> {cursor > 0 && cursor < lines.length ? "Continue script" : "Play script"}</Button>}
            <Button variant="outline" disabled={!connected || !!speaking || cursor >= lines.length} onClick={() => { const i = cursor; void say(lines[i]).then(() => setCursor(i + 1)); }}>Say next line</Button>
            <Button variant="ghost" disabled={playingAll} onClick={() => setCursor(0)}>Back to start</Button>
            <label className="ml-auto text-xs text-muted-foreground">
              Pause between lines{" "}
              <select className="rounded-md border bg-background px-1 py-0.5" value={pauseMs} onChange={(e) => setPauseMs(Number(e.target.value))}>
                {[0, 400, 700, 1200, 2000].map((ms) => <option key={ms} value={ms}>{ms / 1000}s</option>)}
              </select>
            </label>
          </div>
          {!!lines.length && (
            <ol className="mt-4 space-y-1.5 text-sm">
              {lines.map((line, i) => (
                <li key={i} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${i === cursor ? "bg-primary/10" : ""} ${speaking === line ? "font-medium" : i < cursor ? "text-muted-foreground" : ""}`}>
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{line}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2" disabled={!connected || !!speaking} onClick={() => { setCursor(i); void say(line).then(() => setCursor(i + 1)); }}>Say</Button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
