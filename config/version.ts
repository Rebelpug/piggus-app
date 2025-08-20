// Import version from package.json
// @ts-ignore
const pkgVersion = require("../package.json").version;

// App version configuration
export const APP_VERSION = pkgVersion;

// Version checking configuration
export const VERSION_CONFIG = {
  // Enable/disable version checking (useful for development)
  ENABLED: true,

  // API endpoints
  VERSION_ENDPOINT: "/piggus-bff/api/v1/version",
  VERSION_CHECK_ENDPOINT: "/piggus-bff/api/v1/version/check",

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // milliseconds

  // Request timeout
  TIMEOUT: 10000, // milliseconds

  // Store URLs
  IOS_APP_STORE_URL: "https://apps.apple.com/app/piggus/id123456789", // Update with actual App Store URL
  ANDROID_PLAY_STORE_URL:
    "https://play.google.com/store/apps/details?id=com.rebelpug.piggus",
};

// Development overrides
if (__DEV__) {
  // In development, you might want to test version checking
  // VERSION_CONFIG.ENABLED = true;
}
