# App Version Check System

This document describes the app version checking system implemented in Piggus.

## Overview

The version system automatically checks for app updates and displays appropriate modals to users based on the update requirements. It supports both suggested updates (optional) and required updates (mandatory).

## Architecture

### Components

#### 1. **AppVersionProvider** (`context/AppVersionContext.tsx`)

- React Context provider that manages version state across the app
- Automatically triggers version checks on app startup and when app becomes active
- Provides version checking functions to child components
- Handles loading states, errors, and modal visibility

#### 2. **VersionGuard** (`components/version/VersionGuard.tsx`)

- Main component that renders update modals based on version state
- Should be placed at the root level of the app
- Includes error boundary protection and development testing controls

#### 3. **SuggestedUpdateModal** (`components/version/SuggestedUpdateModal.tsx`)

- Modal for optional updates (`update_suggested: true`, `update_required: false`)
- Shows "Update Now" and "Later" buttons
- Can be dismissed by the user
- Does not block app functionality

#### 4. **RequiredUpdateModal** (`components/version/RequiredUpdateModal.tsx`)

- Modal for mandatory updates (`update_required: true`)
- Shows only "Update Now" button
- Cannot be dismissed
- Blocks app functionality until user updates

#### 5. **VersionService** (`services/versionService.ts`)

- Singleton service that handles API communication
- Implements retry logic for failed version checks
- Provides version comparison utilities

### Configuration

#### Version Configuration (`config/version.ts`)

```typescript
export const APP_VERSION = "1.0.0"; // Update this when releasing new versions

export const VERSION_CONFIG = {
  ENABLED: true, // Enable/disable version checking
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  TIMEOUT: 10000,
  // Store URLs for updates
  IOS_APP_STORE_URL: "https://apps.apple.com/app/piggus/id123456789",
  ANDROID_PLAY_STORE_URL:
    "https://play.google.com/store/apps/details?id=com.rebelpug.piggus",
};
```

## API Integration

### Endpoints

#### GET `/piggus-bff/api/v1/version`

Returns current and mandatory version information:

```json
{
  "current_version": "1.2.0",
  "mandatory_version": "1.1.0"
}
```

#### POST `/piggus-bff/api/v1/version/check`

Send current app version and receive update status:

**Request:**

```json
{
  "version": "1.0.0"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "current_version": "1.2.0",
    "mandatory_version": "1.1.0",
    "update_required": false,
    "update_suggested": true
  }
}
```

## Usage

### 1. Integration

The system is already integrated into the app's root layout (`app/_layout.tsx`):

```tsx
<AppVersionProvider>
  <AuthProvider>
    <Stack screenOptions={{ headerShown: false }} />
    <VersionGuard />
  </AuthProvider>
</AppVersionProvider>
```

### 2. Accessing Version State

Use the `useAppVersion` hook in any component:

```tsx
import { useAppVersion } from "@/context/AppVersionContext";

function MyComponent() {
  const { versionInfo, isLoading, error, checkVersion, openAppStore } =
    useAppVersion();

  // Your component logic
}
```

### 3. Manual Version Check

```tsx
const { retryVersionCheck } = useAppVersion();

// Trigger a manual version check
await retryVersionCheck();
```

## Development

### Testing Modals

In development mode, the `VersionTestControls` component provides buttons to test both update modals:

- "Test Suggested Update" - Shows suggested update modal
- "Test Required Update" - Shows required update modal
- "Force Version Check" - Triggers a manual version check

### Disabling Version Checks

To disable version checking during development:

```typescript
// In config/version.ts
export const VERSION_CONFIG = {
  ENABLED: false, // Disable version checking
  // ... other config
};
```

Or set environment variable:

```bash
EXPO_PUBLIC_ENABLE_VERSION_CHECK=false
```

### Testing Version Comparisons

```typescript
import { VersionService } from "@/services/versionService";

// Compare versions (returns -1, 0, or 1)
const result = VersionService.compareVersions("1.0.0", "1.1.0"); // -1
```

## Error Handling

### Graceful Degradation

- Network failures allow the app to continue functioning
- Version check errors are logged but don't crash the app
- Error boundary prevents version system errors from affecting main app

### Retry Logic

- Automatic retry with exponential backoff
- Maximum of 3 retry attempts by default
- Configurable retry delay and timeout

### Fallback Behavior

If version checking fails:

- App continues to function normally
- No update modals are shown
- Error is logged for monitoring

## Internationalization

Version-related strings are fully localized in the translation files (`translations/*.json`):

```json
{
  "version": {
    "newVersionAvailable": "New Version Available",
    "updateRequired": "Update Required",
    "updateNow": "Update Now"
    // ... more translations
  }
}
```

## Store Integration

### Opening App Stores

The system automatically opens the appropriate app store:

- iOS: Opens App Store with direct app link
- Android: Opens Google Play Store with package ID
- Fallback: Shows manual update instructions

### Configuration

Update store URLs in `config/version.ts`:

```typescript
export const VERSION_CONFIG = {
  IOS_APP_STORE_URL: "https://apps.apple.com/app/your-app/id123456789",
  ANDROID_PLAY_STORE_URL:
    "https://play.google.com/store/apps/details?id=your.package.name",
};
```

## Release Process

### 1. Update App Version

When releasing a new version:

```typescript
// In config/version.ts
export const APP_VERSION = "1.1.0"; // Update this
```

### 2. Server Configuration

Configure the backend to return appropriate version information:

- Set `current_version` to the latest available version
- Set `mandatory_version` to the minimum required version
- The system will automatically determine `update_required` and `update_suggested`

### 3. Testing

1. Test with version checking enabled
2. Verify both suggested and required update flows
3. Test store opening functionality
4. Verify internationalization works correctly

## Monitoring

### Logging

The system logs important events:

- Version check attempts and results
- Update modal displays
- Store opening attempts
- Errors and failures

### Analytics Integration

To add analytics tracking:

```typescript
// In the version service or context
import Analytics from "your-analytics-service";

// Track version check events
Analytics.track("version_check_performed", {
  current_version: APP_VERSION,
  latest_version: response.data.current_version,
  update_required: response.data.update_required,
});
```

## Security Considerations

### API Security

- Version endpoints should be publicly accessible (no authentication required)
- Implement rate limiting to prevent abuse
- Use HTTPS for all version check requests

### Data Validation

- Validate version strings on both client and server
- Sanitize version information before display
- Handle malformed version responses gracefully

## Troubleshooting

### Common Issues

1. **Version modals not showing**
   - Check if version checking is enabled
   - Verify API endpoints are accessible
   - Check network connectivity

2. **App store not opening**
   - Verify store URLs are correct
   - Check device app store availability
   - Test fallback instructions

3. **Version comparison errors**
   - Ensure version strings follow semantic versioning
   - Handle edge cases in version comparison logic

### Debug Information

Enable debug logging:

```typescript
// In development
console.log("Version check result:", response);
console.log(
  "Version comparison:",
  VersionService.compareVersions(current, latest),
);
```

## Future Enhancements

- [ ] Background version checking with notifications
- [ ] Version update changelog display
- [ ] Partial update support (delta updates)
- [ ] Custom update scheduling
- [ ] Analytics dashboard for version adoption
- [ ] A/B testing for update prompts
