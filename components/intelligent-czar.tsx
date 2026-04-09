import { CzarCompanion } from '@/components/czar-companion';
import { useCzar } from '@/contexts/czar-context';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function IntelligentCzar() {
  const { shouldShowCzar, czarMessage, dismissCzar, interactWithCzar, screenContext } = useCzar();

  // Don't render if there's no screen context
  if (!screenContext) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <CzarCompanion
        size="medium"
        mood="thinking"
        position="floating"
        message={czarMessage || screenContext.actionPrompt}
        visible={shouldShowCzar}
        intelligent={true}
        onDismiss={dismissCzar}
        onInteract={interactWithCzar}
        showMessage={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    right: 20,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
});
