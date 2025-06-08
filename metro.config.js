const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Wrap with Reanimated Metro config for better error handling
module.exports = wrapWithReanimatedMetroConfig(config);
