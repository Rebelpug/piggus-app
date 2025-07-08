const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Wrap with Reanimated Metro config for better error handling
module.exports = wrapWithReanimatedMetroConfig(config);