export interface CheckoutNavigationState { dirty: boolean; busy: boolean; uncertain: boolean; }
export const emptyCheckoutNavigation: CheckoutNavigationState = { dirty: false, busy: false, uncertain: false };
export function checkoutNeedsReview(path: string, state: CheckoutNavigationState) {
  return path === '/app/pos' && (state.dirty || state.busy || state.uncertain);
}
