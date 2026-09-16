import { beforeEach, afterEach, vi } from "vitest";
import { state } from "./fixtures/state";
beforeEach(() => {
  vi.clearAllMocks();
  state.handler = null;
  state.user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "learner@example.test",
  };
  state.queries = [];
  state.resolve = () => ({ data: null, count: 0, error: null });
  state.rpc.mockImplementation(async () => ({ data: true, error: null }));
  state.email.mockImplementation(async () => ({
    data: { id: "email-id" },
    error: null,
  }));
  state.fetch.mockImplementation(async () => {
    throw new Error("Unexpected provider call");
  });
  state.env = {
    SUPABASE_URL: "https://project.example.test",
    SUPABASE_ANON_KEY: "anon-test",
    SUPABASE_SERVICE_ROLE_KEY: "service-test",
    OPENAI_API_KEY: "openai-test",
    ANAM_API_KEY: "anam-test",
    STRIPE_SECRET_KEY: "stripe-test",
    STRIPE_WEBHOOK_SECRET: "webhook-test",
    TAVUS_API_KEY: "tavus-test",
    TAVUS_WEBHOOK_SECRET: "test-callback-secret-01234567890123456789",
    RESEND_API_KEY: "resend-test",
    DEEPGRAM_API_KEY: "deepgram-test",
    ASSEMBLYAI_API_KEY: "assembly-test",
    SPEECHMATICS_API_KEY: "speechmatics-test",
    NODE_ENV: "production",
  };
  vi.stubGlobal("Deno", {
    env: { get: (key: string) => state.env[key] },
    serve: (handler: any) => {
      state.handler = handler;
    },
    upgradeWebSocket: vi.fn(),
  });
  vi.stubGlobal("fetch", state.fetch);
});
afterEach(() => {
  vi.useRealTimers();
});
