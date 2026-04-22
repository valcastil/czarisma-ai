const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Safety-net for useFrameworks:"static" builds:
 * 1. Allows non-modular header includes in framework modules (all pods).
 * 2. Ensures minimum iOS deployment target of 16.0 to silence warnings from
 *    pods like react-native-maps-ReactNativeMapsPrivacy and SDWebImage.
 */
module.exports = function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const marker = '# [withNonModularHeaders]';

      if (!podfile.includes(marker)) {
        const snippet = `
  ${marker} Static frameworks safety net
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |bc|
      bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'

      # Raise deployment target floor to silence Xcode warnings
      current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if current && current.to_f < 16.0
        bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
      end
    end
  end`;

        if (podfile.includes('post_install do |installer|')) {
          podfile = podfile.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|${snippet}`
          );
        } else {
          podfile += `\npost_install do |installer|${snippet}\nend\n`;
        }

        fs.writeFileSync(podfilePath, podfile, 'utf8');
      }

      return config;
    },
  ]);
};
