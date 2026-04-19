const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Firebase native module handling ──
// @react-native-firebase requires native modules that only exist in custom dev builds.
// In Expo Go the packages are installed (for types/prebuild) but can't be bundled.
// Set EXPO_GO=1 to force the stub, or set FIREBASE_ENABLED=1 to force the real module.
// By default we auto-detect: if we're in EAS Build or the user explicitly opted in,
// we allow Firebase. Otherwise we swap it for a no-op stub.
const forceFirebase = process.env.FIREBASE_ENABLED === '1' || !!process.env.EAS_BUILD;
const forceStub = process.env.EXPO_GO === '1';

const useStub = forceStub || !forceFirebase;

if (useStub) {
  const stubPath = path.resolve(__dirname, 'lib', 'firebase-init.stub.ts');

  const originalResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Redirect lib/firebase-init → stub
    if (moduleName.includes('firebase-init') && !moduleName.includes('stub')) {
      return { filePath: stubPath, type: 'sourceFile' };
    }

    // Redirect any @react-native-firebase/* import → stub
    if (moduleName.startsWith('@react-native-firebase/')) {
      return { filePath: stubPath, type: 'sourceFile' };
    }

    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
