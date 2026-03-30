const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Config plugin to enable Jetifier and AndroidX in gradle.properties
 */
const withJetifier = (config) => {
  return withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'android.useAndroidX',
      value: 'true',
    });
    config.modResults.push({
      type: 'property',
      key: 'android.enableJetifier',
      value: 'true',
    });
    return config;
  });
};

module.exports = withJetifier;
