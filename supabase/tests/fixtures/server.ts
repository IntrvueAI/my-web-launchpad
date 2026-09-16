import { state } from "./state";
export const serve = (handler: NonNullable<typeof state.handler>) => {
  state.handler = handler;
};
