import { state } from "./state";
export default class Stripe {
  static createFetchHttpClient() {
    return {};
  }
  checkout = state.stripe.checkout;
  webhooks = state.stripe.webhooks;
  accounts = state.stripe.accounts;
  accountLinks = state.stripe.accountLinks;
  transfers = state.stripe.transfers;
}
