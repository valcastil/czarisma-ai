const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * react-native-maps v1.27+ no longer ships a separate
 * "react-native-google-maps" podspec.  Google Maps support is now a
 * *subspec* of the main react-native-maps pod: react-native-maps/Google.
 *
 * Expo's built-in Maps config plugin still injects:
 *   pod 'react-native-google-maps', path: ...
 * which causes "No podspec found for react-native-google-maps".
 *
 * This plugin runs AFTER Expo's built-in plugin (because it's listed
 * later in app.json plugins) and replaces that stale pod line with
 * the correct subspec reference.
 */
module.exports = function withGoogleMapsSubspec(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Match the line Expo injects (with the expo-generated comment markers)
      const oldPod =
        /^\s*pod\s+'react-native-google-maps'.*require\.resolve\('react-native-maps\/package\.json'\).*$/m;

      if (oldPod.test(podfile)) {
        podfile = podfile.replace(
          oldPod,
          "  pod 'react-native-maps/Google', path: File.dirname(`node --print \"require.resolve('react-native-maps/package.json')\"`)  # patched by withGoogleMapsSubspec"
        );
        fs.writeFileSync(podfilePath, podfile, 'utf8');
      }

      return config;
    },
  ]);
};
