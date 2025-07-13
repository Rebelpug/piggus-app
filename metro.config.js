const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Enable safe code obfuscation for production builds
const isProduction = process.env.NODE_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

if (isProduction) {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      mangle: false, // Disable all name mangling
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true, // Start with this disabled
        unused: false,
        evaluate: false,
        reduce_vars: false,
      },
      output: {
        comments: false,
        beautify: false,
      },
    },
  };
}

// Wrap with Reanimated Metro config for better error handling
module.exports = wrapWithReanimatedMetroConfig(config);
