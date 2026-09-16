// Admin-only STT bake-off: fans one mic feed out to Deepgram / AssemblyAI / Speechmatics
// simultaneously so their transcripts (and turn-detection) can be compared side by side. Ported
// from a local-only Node prototype (same protocol) so it can live on the admin page instead of
// requiring `node server.js` on someone's laptop.
//
// Auth: verified manually via ?token= (a real user's access token) rather than the platform's
// automatic JWT check, because browser WebSocket upgrade requests can't carry a custom
// Authorization header — same reason as supabase/functions/deepgram-relay. Additionally gated to
// admins only (is_current_user_admin), since this fans out to three paid vendors per session.
//
// Each vendor needs a different way to authenticate an outbound WebSocket without custom headers
// (which Deno's native WebSocket client can't set either, same limitation as a browser):
//  - Deepgram: Sec-WebSocket-Protocol subprotocol (["token", key]) — same method as deepgram-relay.
//  - AssemblyAI: a short-lived, server-minted token as a `token` query parameter (documented browser-safe method).
//  - Speechmatics: requires minting a short-lived JWT first via a plain REST call (mp.speechmatics.com),
//    then connecting with that JWT as a `jwt` query parameter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { AudioBuffer } from "../_shared/audioBuffer.ts";
import { logAppEvent } from "./_shared/appLogger.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");
const assemblyaiApiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
const speechmaticsApiKey = Deno.env.get("SPEECHMATICS_API_KEY");

const SAMPLE_RATE = 16000;
type Mode = "accuracy" | "turns";

async function getSpeechmaticsJwt(): Promise<string | null> {
  if (!speechmaticsApiKey) return null;
  try {
    const resp = await fetch(
      "https://mp.speechmatics.com/v1/api_keys?type=rt",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${speechmaticsApiKey}`,
        },
        body: JSON.stringify({ ttl: 60 }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.key_value ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 400 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  let userId: string | null = null;

  try {
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    userId = userData.user.id;
    const asUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: isAdmin } = await asUser.rpc("is_current_user_admin");
    if (!isAdmin) {
      return new Response("Forbidden: admin only", { status: 403 });
    }

    const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

    let deepgramWs: WebSocket | null = null;
    let assemblyaiWs: WebSocket | null = null;
    let speechmaticsWs: WebSocket | null = null;
    const pending = {
      deepgram: new AudioBuffer(),
      assemblyai: new AudioBuffer(),
      speechmatics: new AudioBuffer(),
    };
    let generation = 0;
    let running = false;
    let closed = false;
    let smSeq = 0;
    let smReady = false;

    const send = (obj: unknown) => {
      if (clientWs.readyState === WebSocket.OPEN)
        clientWs.send(JSON.stringify(obj));
    };

    function flush(
      vendor: "deepgram" | "assemblyai" | "speechmatics",
      ws: WebSocket,
    ) {
      pending[vendor].drain((chunk) => {
        ws.send(chunk);
        if (vendor === "speechmatics") smSeq++;
      });
    }

    function connectDeepgram(mode: Mode, pauseMs: number) {
      if (!deepgramApiKey) {
        send({ vendor: "deepgram", error: "No DEEPGRAM_API_KEY configured" });
        return;
      }
      const turnParams =
        mode === "turns"
          ? `&endpointing=${Math.max(10, pauseMs)}&utterance_end_ms=${Math.max(1000, pauseMs)}`
          : "";
      const dgUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=${SAMPLE_RATE}&channels=1&punctuate=true&interim_results=true&smart_format=true${turnParams}`;
      const ws = new WebSocket(dgUrl, ["token", deepgramApiKey]);
      ws.onopen = () => flush("deepgram", ws);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "UtteranceEnd") {
            send({ vendor: "deepgram", kind: "turnEnd", text: "" });
            return;
          }
          const alt = msg?.channel?.alternatives?.[0];
          if (!alt?.transcript) return;
          if (mode === "turns") {
            if (msg.is_final) {
              send({
                vendor: "deepgram",
                kind: "commit",
                text: alt.transcript,
              });
              if (msg.speech_final)
                send({ vendor: "deepgram", kind: "turnEnd", text: "" });
            } else {
              send({ vendor: "deepgram", kind: "live", text: alt.transcript });
            }
          } else {
            send({
              vendor: "deepgram",
              text: alt.transcript,
              isFinal: Boolean(msg.is_final),
            });
          }
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onerror = () => {
        send({ vendor: "deepgram", error: "Deepgram connection error" });
        logAppEvent("edge:stt-bakeoff-relay", {
          level: "error",
          eventType: "deepgram_ws_error",
          message: "Deepgram connection error",
          userId,
        }).catch(() => {});
      };
      deepgramWs = ws;
    }

    async function connectAssemblyAI(mode: Mode, pauseMs: number, run: number) {
      if (!assemblyaiApiKey) {
        send({
          vendor: "assemblyai",
          error: "No ASSEMBLYAI_API_KEY configured",
        });
        return;
      }
      let temporaryToken: string;
      try {
        const response = await fetch(
          "https://streaming.assemblyai.com/v3/token?expires_in_seconds=60",
          {
            headers: { Authorization: assemblyaiApiKey },
            signal: AbortSignal.timeout(10_000),
          },
        );
        const data = await response.json();
        if (!response.ok || typeof data.token !== "string" || !data.token)
          throw new Error("Missing token");
        temporaryToken = data.token;
      } catch {
        send({ vendor: "assemblyai", error: "Could not obtain a session key" });
        return;
      }
      if (closed || !running || generation !== run) return;
      const extra =
        mode === "turns"
          ? `&min_end_of_turn_silence_when_confident=${pauseMs}`
          : "";
      const aaiUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${SAMPLE_RATE}&encoding=pcm_s16le&format_turns=true&token=${encodeURIComponent(temporaryToken)}${extra}`;
      const ws = new WebSocket(aaiUrl);
      ws.onopen = () => flush("assemblyai", ws);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          // turn_is_formatted just means "punctuation/casing cleaned up" and fires repeatedly per
          // turn — only end_of_turn means the turn is actually over (a past bug here caused
          // duplicated/growing transcripts by treating the former as the latter).
          if (msg.type === "Turn" && typeof msg.transcript === "string") {
            if (mode === "turns") {
              send({
                vendor: "assemblyai",
                kind: "live",
                text: msg.transcript,
              });
              if (msg.end_of_turn)
                send({ vendor: "assemblyai", kind: "turnEnd", text: "" });
            } else {
              send({
                vendor: "assemblyai",
                text: msg.transcript,
                isFinal: Boolean(msg.end_of_turn),
              });
            }
          }
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onerror = () => {
        send({ vendor: "assemblyai", error: "AssemblyAI connection error" });
        logAppEvent("edge:stt-bakeoff-relay", {
          level: "error",
          eventType: "assemblyai_ws_error",
          message: "AssemblyAI connection error",
          userId,
        }).catch(() => {});
      };
      assemblyaiWs = ws;
    }

    async function connectSpeechmatics(
      mode: Mode,
      pauseMs: number,
      run: number,
    ) {
      if (!speechmaticsApiKey) {
        send({
          vendor: "speechmatics",
          error: "No SPEECHMATICS_API_KEY configured",
        });
        return;
      }
      const jwt = await getSpeechmaticsJwt();
      if (closed || !running || generation !== run) return;
      if (!jwt) {
        send({
          vendor: "speechmatics",
          error: "Could not obtain a Speechmatics session key",
        });
        return;
      }
      const ws = new WebSocket(`wss://eu.rt.speechmatics.com/v2?jwt=${jwt}`);
      ws.onopen = () => {
        const transcriptionConfig: Record<string, unknown> = {
          language: "en",
          enable_partials: true,
          max_delay: 2,
        };
        if (mode === "turns") {
          const silenceTrigger = Math.min(2, Math.max(0.1, pauseMs / 1000));
          transcriptionConfig.conversation_config = {
            end_of_utterance_silence_trigger: silenceTrigger,
          };
        }
        ws.send(
          JSON.stringify({
            message: "StartRecognition",
            audio_format: {
              type: "raw",
              encoding: "pcm_s16le",
              sample_rate: SAMPLE_RATE,
            },
            transcription_config: transcriptionConfig,
          }),
        );
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.message === "RecognitionStarted") {
            if (!running || generation !== run || closed) return;
            smReady = true;
            flush("speechmatics", ws);
            return;
          }
          if (msg.message === "EndOfUtterance") {
            send({ vendor: "speechmatics", kind: "turnEnd", text: "" });
            return;
          }
          if (
            msg.message === "AddPartialTranscript" ||
            msg.message === "AddTranscript"
          ) {
            const text = (msg.results || [])
              .map(
                (r: { alternatives?: { content?: string }[] }) =>
                  r.alternatives?.[0]?.content,
              )
              .filter(Boolean)
              .join(" ");
            if (!text) return;
            if (mode === "turns") {
              send({
                vendor: "speechmatics",
                kind: msg.message === "AddTranscript" ? "commit" : "live",
                text,
              });
            } else {
              send({
                vendor: "speechmatics",
                text,
                isFinal: msg.message === "AddTranscript",
              });
            }
          } else if (msg.message === "Error") {
            send({
              vendor: "speechmatics",
              error: msg.reason || JSON.stringify(msg),
            });
          }
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onerror = () => {
        send({
          vendor: "speechmatics",
          error: "Speechmatics connection error",
        });
        logAppEvent("edge:stt-bakeoff-relay", {
          level: "error",
          eventType: "speechmatics_ws_error",
          message: "Speechmatics connection error",
          userId,
        }).catch(() => {});
      };
      speechmaticsWs = ws;
    }

    function stopAll() {
      generation++;
      running = false;
      Object.values(pending).forEach((buffer) => buffer.clear());
      try {
        if (speechmaticsWs?.readyState === WebSocket.OPEN) {
          speechmaticsWs.send(
            JSON.stringify({ message: "EndOfStream", last_seq_no: smSeq }),
          );
        }
        speechmaticsWs?.close();
      } catch {
        /* already closed */
      }
      try {
        deepgramWs?.close();
      } catch {
        /* already closed */
      }
      try {
        assemblyaiWs?.close();
      } catch {
        /* already closed */
      }
      deepgramWs = null;
      assemblyaiWs = null;
      speechmaticsWs = null;
      smSeq = 0;
      smReady = false;
    }

    clientWs.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        let msg: { type?: string; mode?: string; pauseMs?: number };
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "start") {
          if (closed || running) return;
          running = true;
          const run = ++generation;
          const mode: Mode = msg.mode === "turntaking" ? "turns" : "accuracy";
          const pauseMs = Math.min(
            3000,
            Math.max(300, Number(msg.pauseMs) || 1000),
          );
          connectDeepgram(mode, pauseMs);
          void connectAssemblyAI(mode, pauseMs, run);
          void connectSpeechmatics(mode, pauseMs, run);
        } else if (msg.type === "stop") {
          stopAll();
        }
        return;
      }
      // Binary audio frame (raw PCM16LE mono @ 16kHz) — forward to every vendor still connecting/open;
      // queue it if the vendor's own connection hasn't finished opening yet rather than dropping it.
      if (!running || closed) return;
      if (deepgramApiKey) {
        if (deepgramWs?.readyState === WebSocket.OPEN) deepgramWs.send(ev.data);
        else if (
          (!deepgramWs || deepgramWs.readyState === WebSocket.CONNECTING) &&
          !pending.deepgram.push(ev.data)
        ) {
          stopAll();
          send({ error: "Audio buffer exceeded; please restart" });
        }
      }
      if (assemblyaiApiKey) {
        if (assemblyaiWs?.readyState === WebSocket.OPEN)
          assemblyaiWs.send(ev.data);
        else if (
          (!assemblyaiWs || assemblyaiWs.readyState === WebSocket.CONNECTING) &&
          !pending.assemblyai.push(ev.data)
        ) {
          stopAll();
          send({ error: "Audio buffer exceeded; please restart" });
        }
      }
      if (speechmaticsApiKey) {
        if (speechmaticsWs?.readyState === WebSocket.OPEN && smReady) {
          speechmaticsWs.send(ev.data);
          smSeq++;
        } else if (
          (!speechmaticsWs ||
            speechmaticsWs.readyState === WebSocket.CONNECTING ||
            (speechmaticsWs.readyState === WebSocket.OPEN && !smReady)) &&
          !pending.speechmatics.push(ev.data)
        ) {
          stopAll();
          send({ error: "Audio buffer exceeded; please restart" });
        }
      }
    };
    const close = () => {
      closed = true;
      clearTimeout(sessionLimit);
      stopAll();
    };
    const sessionLimit = setTimeout(() => {
      close();
      try {
        clientWs.close();
      } catch {
        /* closed */
      }
    }, 20 * 60_000);
    clientWs.onclose = close;
    clientWs.onerror = close;

    return response;
  } catch (err) {
    console.error("stt-bakeoff-relay error:", (err as Error)?.message || err);
    logAppEvent("edge:stt-bakeoff-relay", {
      level: "error",
      eventType: "unhandled_exception",
      message: (err as Error)?.message || String(err),
      userId,
      metadata: { stack: (err as Error)?.stack },
    }).catch(() => {});
    return new Response("Internal server error", { status: 500 });
  }
});
