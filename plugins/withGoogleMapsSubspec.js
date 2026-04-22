const { withPodfile } = require('@expo/config-plugins');

/**
 * react-native-maps v1.27+ no longer ships a separate
 * "react-native-google-maps" podspec.  Google Maps support is now a
 * *subspec* of the main react-native-maps pod: react-native-maps/Google.
 *
 * Expo's built-in Maps config plugin still injects:
 *   pod 'react-native-google-maps', path: ...
 * which causes "No podspec found for react-native-google-maps".
 *
 * This plugin uses withPodfile (not withDangerousMod) so it operates
 * on the in-memory Podfile contents AFTER Expo's built-in Maps plugin
 * has already injected the stale line.
 */
module.exports = function withGoogleMapsSubspec(config) {
  return withPodfile(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /pod\s+'react-native-google-maps'/g,
      "pod 'react-native-maps/Google'"
    );
    return config;
  });
};
