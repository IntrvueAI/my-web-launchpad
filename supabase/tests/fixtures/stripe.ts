import { state } from "./state";
export default class Stripe {
  static createFetchHttpClient() {
    return {};
  }
  checkout = state.stripe.checkout;
  webhooks = state.stripe.webhooks;
}
