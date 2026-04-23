import { StripeProvider as NativeStripeProvider, useStripe as useNativeStripe } from '@stripe/stripe-react-native';
import React from 'react';

export const useStripe = useNativeStripe;

export function StripeProvider({
  publishableKey,
  children,
}: {
  publishableKey: string;
  children: React.ReactNode;
}) {
  return (
    <NativeStripeProvider publishableKey={publishableKey}>
      {children as any}
    </NativeStripeProvider>
  );
}
