// Relays browser mic audio to Deepgram for 11-plus-v2 (replacing Anam's built-in STT for this
// interview type). Exists because (a) Deepgram's server-side auth header can't be set from a
// browser WebSocket, and (b) we never want the Deepgram key reaching client code. The browser
// connects here (auth via a query-string access token — WebSocket upgrade requests can't carry
// custom headers either, same reason), we verify it, then open the real authenticated connection
// to Deepgram server-side and pipe audio one way, transcripts the other.
//
// verify_jwt = false: the platform's automatic JWT check only reads the Authorization header,
// which the browser's native WebSocket API cannot set — so we verify manually via ?token= instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");

const SAMPLE_RATE = 16000;

Deno.serve(async (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 400 });
  }
  if (!deepgramApiKey) {
    return new Response("DEEPGRAM_API_KEY not configured", { status: 500 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const pauseMs = Math.min(3000, Math.max(300, Number(url.searchParams.get("pauseMs")) || 1200));

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

  let deepgramWs: WebSocket | null = null;
  // Deepgram's own connection takes a moment to open after ours does — audio arriving in that gap
  // would otherwise be silently dropped, which can eat the very start of what the student says.
  const pending: unknown[] = [];

  clientWs.onopen = () => {
    const endpointing = pauseMs;
    const utteranceEndMs = Math.max(1000, pauseMs);
    const dgUrl =
      `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=${SAMPLE_RATE}&channels=1` +
      `&punctuate=true&interim_results=true&smart_format=true` +
      `&endpointing=${endpointing}&utterance_end_ms=${utteranceEndMs}`;

    // Deno's WebSocket client (server-side, not a browser) can set the Authorization header the
    // way Deepgram actually documents this for backend integrations.
    deepgramWs = new WebSocket(dgUrl, ["token", deepgramApiKey]);

    deepgramWs.onopen = () => {
      for (const chunk of pending) deepgramWs!.send(chunk as never);
      pending.length = 0;
    };
    deepgramWs.onmessage = (ev) => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.send(ev.data);
    };
    deepgramWs.onerror = (ev) => {
      console.error("Deepgram connection error:", ev);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: "Deepgram connection error" }));
      }
    };
    deepgramWs.onclose = () => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    };
  };

  clientWs.onmessage = (ev) => {
    if (deepgramWs?.readyState === WebSocket.OPEN) deepgramWs.send(ev.data);
    else if (deepgramWs) pending.push(ev.data);
  };
  clientWs.onclose = () => {
    if (deepgramWs?.readyState === WebSocket.OPEN) deepgramWs.close();
  };
  clientWs.onerror = () => {
    if (deepgramWs?.readyState === WebSocket.OPEN) deepgramWs.close();
  };

  return response;
});
