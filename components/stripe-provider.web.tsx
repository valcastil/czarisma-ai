import React from 'react';

export function StripeProvider({
  children,
}: {
  publishableKey: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

// No-op hook on web. Stripe React Native is native-only; any payment UI that
// calls these will be guarded behind Platform.OS checks or simply not rendered.
export function useStripe() {
  const noop = async () => ({ error: { message: 'Stripe is not available on web.' } as any });
  return {
    initPaymentSheet: noop,
    presentPaymentSheet: noop,
    confirmPayment: noop,
    createPaymentMethod: noop,
    handleNextAction: noop,
    retrievePaymentIntent: noop,
  } as any;
}
