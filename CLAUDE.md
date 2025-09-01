# Piggus App - Claude Code Instructions

## Project Overview

**Piggus** is a privacy-first personal finance React Native app built with Expo. It helps users track expenses, manage investment portfolios, and learn about personal finance while maintaining end-to-end encryption and data privacy.

## Tech Stack

- **Framework**: React Native with Expo (v53.0.20)
- **Navigation**: Expo Router (file-based routing)
- **UI**: UI Kitten component library with Eva Design
- **Backend**: Supabase (edge functions & database & auth)
- **Language**: TypeScript with strict mode
- **State**: React Context
- **Animations**: React Native Reanimated
- **i18n**: i18n-js (supports 9 languages)
- **Error Monitoring**: Sentry
- **In-App Purchases**: RevenueCat

## Project Structure

```
piggus-app/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (protected)/        # Protected routes requiring auth
│   │   ├── (tabs)/         # Tab navigation screens
│   │   └── *.tsx          # Individual protected screens
│   ├── login.tsx          # Authentication screens
│   └── register.tsx
├── components/             # Reusable UI components
├── context/               # React Context providers
├── lib/                   # Core utilities and configurations
├── services/              # API and data services
├── types/                 # TypeScript type definitions
├── translations/          # i18n JSON files (en, de, es, fr, it, nl, pl, pt, sv)
├── utils/                 # Helper functions
└── assets/               # Static assets
```

## Development Commands

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run in browser
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run type-check` - TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run release` - Create new release with standard-version

## Code Standards

- **TypeScript**: Strict mode enabled, all files must be typed
- **Linting**: ESLint with Expo config + Prettier integration
- **Git Hooks**: Husky + lint-staged for pre-commit checks
- **Path Aliases**: Use `@/*` for absolute imports
- **Commit Messages**: Follow conventional commits (handled by standard-version)

## Key Features

- 📊 Expense tracking with categories
- 💰 Investment portfolio management
- 👥 Group expense sharing
- 📈 Financial statistics and insights
- 🔒 End-to-end encryption for sensitive data
- 🌍 Multi-language support
- 📱 Cross-platform (iOS, Android, Web)

## Environment Setup

- Uses `.env.local` for environment variables
- Required services: Supabase (database), optional: Sentry (monitoring), RevenueCat (purchases)
- All public env vars must use `EXPO_PUBLIC_` prefix

## Testing & Quality

- Run `npm run lint` and `npm run type-check` before commits
- Husky pre-commit hooks ensure code quality
- Use EAS Build for production builds

## Important Notes

- Privacy-first architecture with minimal data collection
- CC BY-NC-SA 4.0 license (non-commercial)
- Uses Expo's new architecture with Hermes JS engine
- Supports both iOS and Android with adaptive icons
