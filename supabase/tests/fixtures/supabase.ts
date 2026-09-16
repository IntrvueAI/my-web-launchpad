import { state, type Query } from "./state";
export function createClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: state.user },
        error: state.user ? null : { message: "unauthorized" },
      }),
    },
    rpc: state.rpc,
    from(table: string) {
      const query: Query = { table, operation: "select", filters: [] };
      const chain: any = {};
      for (const method of ["select", "insert", "update", "delete", "upsert"]) {
        chain[method] = (value: unknown) => {
          if (method === "select") query.columns = value as string;
          else {
            query.operation = method;
            query.value = value;
          }
          return chain;
        };
      }
      for (const method of [
        "eq",
        "neq",
        "lt",
        "gt",
        "gte",
        "lte",
        "or",
        "in",
        "like",
        "order",
        "limit",
        "range",
        "is",
        "not",
      ]) {
        chain[method] = (...args: unknown[]) => {
          query.filters.push([method, args]);
          return chain;
        };
      }
      const resolve = async () => {
        state.queries.push(query);
        return state.resolve(query);
      };
      chain.single = resolve;
      chain.maybeSingle = resolve;
      chain.then = (yes: any, no: any) => resolve().then(yes, no);
      return chain;
    },
  };
}
