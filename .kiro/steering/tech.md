# Technology Stack

## Core Framework

- **React Native**: 0.79.5 with React 19.0.0
- **Expo**: 53.0.20 (managed workflow)
- **Expo Router**: File-based navigation system
- **TypeScript**: Strict mode enabled with path aliases (`@/*`)

## Backend & Database

- **Supabase**: Backend-as-a-Service for authentication and data storage
- **End-to-End Encryption**: Custom encryption layer using @noble/ciphers and @noble/hashes

## UI & Styling

- **UI Kitten**: Primary component library with Eva Design System
- **React Native Reanimated**: For animations
- **Expo Symbols**: For iconography
- **Custom Themed Components**: ThemedText, ThemedView with light/dark mode support

## State Management & Context

- **React Context**: For global state (Auth, Theme, Localization, etc.)
- **Custom Hooks**: useThemeColor, useColorScheme, useIntro

## Internationalization

- **i18n-js**: Multi-language support (9 languages)
- **expo-localization**: Device locale detection

## Development Tools

- **ESLint**: Code linting with Expo config + Prettier
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-push validation
- **Standard Version**: Automated versioning and changelog

## Build & Deployment

- **EAS Build**: Expo Application Services for production builds
- **Sentry**: Error monitoring and crash reporting
- **RevenueCat**: In-app purchases (optional)

## Common Commands

```bash
# Development
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run in browser

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format with Prettier
npm run type-check    # TypeScript type checking

# Release
npm run release       # Create new version with standard-version

# Building
eas build --platform android --profile production
eas build --platform ios --profile production
```

## Environment Variables

All environment variables use `EXPO_PUBLIC_` prefix for client-side access:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_REVENUE_CAT_*_API_KEY`
