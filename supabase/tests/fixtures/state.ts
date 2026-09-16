import { vi } from "vitest";
export type Query = {
  table: string;
  operation: string;
  value?: unknown;
  filters: [string, unknown][];
  columns?: string;
};
export const state = {
  handler: null as null | ((request: Request) => Promise<Response>),
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "learner@example.test",
  } as { id: string; email: string } | null,
  queries: [] as Query[],
  resolve: (_query: Query): any => ({ data: null, count: 0, error: null }),
  rpc: vi.fn(
    async (_name: string, _args?: unknown): Promise<any> => ({
      data: true,
      error: null,
    }),
  ),
  fetch: vi.fn(),
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
        expire: vi.fn(async () => ({})),
        retrieve: vi.fn(),
        list: vi.fn(),
      },
    },
    webhooks: { constructEventAsync: vi.fn() },
  },
  email: vi.fn(async () => ({ data: { id: "email-id" }, error: null })),
  log: vi.fn(async () => {}),
  env: {} as Record<string, string>,
};
