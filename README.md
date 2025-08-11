# 🐷 Piggus

**A privacy-first personal finance app** built with React Native and Expo. Track expenses, manage your financial portfolio, and learn about personal finance while keeping your data secure and private.

## ✨ Features

- 📊 **Expense Tracking** - Monitor your spending with categorized expenses
- 💰 **Investment Portfolio** - Track your investments and portfolio performance
- 👥 **Group Expenses** - Share and split expenses with others
- 📈 **Financial Insights** - Get detailed statistics and reports
- 🔒 **Privacy-First** - End-to-end encryption keeps your data secure

## ✨ Wanted features

- 🏦 **Multi-Currency Support** - Handle expenses in different currencies
- 🌍 **Internationalization** - Available in multiple languages
- 📱 **Cross-Platform** - Works on Web
- 🎮 **Education** - Gamify the tutorials and guides with interactive lessons and rewards

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/piggus-app.git
   cd piggus-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and configure the required services (see [Configuration](#-configuration) section).

4. **Start the development server**

   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - **iOS**: Press `i` in the terminal or scan the QR code with Camera app
   - **Android**: Press `a` in the terminal or scan the QR code with Expo Go app

## ⚙️ Configuration

### Required Services

To fully use Piggus, you'll need to set up these services:

#### 1. Supabase (Database & Backend)

- The app uses the shared Supabase instance by default
- For production use, create your own [Supabase project](https://supabase.com)
- Update `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in `.env.local`

#### 2. Sentry (Error Monitoring) - Optional

- Create a [Sentry](https://sentry.io) account
- Set up a new React Native project
- Update these variables in `.env.local`:
  ```
  EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
  SENTRY_AUTH_TOKEN=your_auth_token
  SENTRY_ORG=your_org
  SENTRY_PROJECT=your_project
  ```

#### 3. RevenueCat (In-App Purchases) - Optional

- Create a [RevenueCat](https://www.revenuecat.com) account
- Set up your app and get API keys
- Update these variables in `.env.local`:
  ```
  EXPO_PUBLIC_REVENUE_CAT_GOOGLE_API_KEY=your_google_key
  EXPO_PUBLIC_REVENUE_CAT_APPLE_API_KEY=your_apple_key
  ```

### Environment Variables

All environment variables are documented in `.env.example`. Variables prefixed with `EXPO_PUBLIC_` are safe to expose in the client bundle.

## 🛠️ Development

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run release` - Create a new release with standard-version

### Project Structure

```
piggus-app/
├── app/                    # App screens and navigation (Expo Router)
├── components/             # Reusable UI components
├── context/               # React Context providers
├── lib/                   # Core utilities and configurations
├── services/              # API and data services
├── types/                 # TypeScript type definitions
├── translations/          # Internationalization files
├── utils/                 # Helper functions
└── assets/               # Images, fonts, and other static assets
```

### Key Technologies

- **[Expo](https://expo.dev)** - React Native development platform
- **[Expo Router](https://docs.expo.dev/router/introduction/)** - File-based navigation
- **[Supabase](https://supabase.com)** - Backend-as-a-Service
- **[UI Kitten](https://akveo.github.io/react-native-ui-kitten/)** - UI component library
- **[i18n-js](https://github.com/fnando/i18n-js)** - Internationalization
- **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** - Animations

## 📱 Building for Production

### Local Builds

For development builds on Windows with WSL:

```bash
# Allow Sentry failures during development
export SENTRY_ALLOW_FAILURE=true

# Build for Android
eas build --platform android --profile production --local

# Build for iOS (requires macOS)
eas build --platform ios --profile production --local
```

### EAS Build (Recommended)

1. **Install EAS CLI**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**

   ```bash
   eas login
   ```

3. **Configure your project**

   ```bash
   eas build:configure
   ```

4. **Build for production**

   ```bash
   # Android
   eas build --platform android --profile production

   # iOS
   eas build --platform ios --profile production
   ```

## 🌍 Internationalization

Piggus plan is to supports multiple languages:

- English (en)
- German (de)
- Spanish (es)
- French (fr)
- Italian (it)
- Dutch (nl)
- Polish (pl)
- Portuguese (pt)
- Swedish (sv)

Translation files are located in the `translations/` directory. To add a new language, create a new JSON file following the existing structure.

## 🔒 Privacy & Security

Piggus is designed with privacy in mind:

- **End-to-end encryption** for sensitive financial data
- **Local-first** architecture where possible
- **No tracking** or analytics beyond error monitoring
- **Open source** for full transparency
- **Minimal data collection** - only what's necessary for functionality

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository to your GitHub account
2. Clone your fork: `git clone https://github.com/Rebelpug/piggus-app`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Run tests and linting: `npm run lint`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to your fork: `git push origin feature/amazing-feature`
8. Go to the original repository and create a Pull Request from your fork

### Reporting Issues

Please use the [GitHub Issues](https://github.com/Rebelpug/piggus-app/issues) page to report bugs or request features.

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License** (CC BY-NC-SA 4.0).

**What this means:**

- ✅ You can use, modify, and distribute this software
- ✅ You can contribute back to the project
- ❌ You cannot use it for commercial purposes without permission
- 📜 You must provide attribution and share derivatives under the same license

See the [LICENSE](LICENSE) file for full details.

## 🙏 Acknowledgments

- [Expo team](https://expo.dev) for the amazing development platform
- [Supabase](https://supabase.com) for the backend infrastructure
- All our [contributors](https://github.com/Rebelpug/piggus-app/contributors)

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/Rebelpug/piggus-app/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Rebelpug/piggus-app/discussions)

---

Made with ❤️ by the Piggus team
