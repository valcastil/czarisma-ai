const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * react-native-maps v1.27+ no longer ships a separate
 * `react-native-google-maps` podspec — Google Maps support is now a
 * *subspec* of the main react-native-maps pod (`react-native-maps/Google`).
 *
 * Expo / the react-native-maps config plugin still injects
 *   pod 'react-native-google-maps', path: ...
 * into the Podfile, which causes EAS iOS builds to fail with
 *   [!] No podspec found for `react-native-google-maps` in .../react-native-maps
 *
 * withPodfile (in-memory mod) can run BEFORE other Podfile-injecting
 * plugins and misses the line. withDangerousMod runs at the filesystem
 * stage, AFTER all other mods have flushed their changes to disk, so
 * the replacement always happens on the final Podfile content.
 */
module.exports = function withGoogleMapsSubspec(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');
      const patched = contents
        // Replace the whole `pod 'react-native-google-maps', path: ...` line
        // with the correct subspec pod reference.
        .replace(
          /pod\s+'react-native-google-maps'[^\n]*/g,
          "pod 'react-native-maps/Google'"
        );

      if (patched !== contents) {
        fs.writeFileSync(podfilePath, patched, 'utf8');
      }
      return config;
    },
  ]);
};
