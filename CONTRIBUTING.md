# 🤝 Contributing to Piggus

Thank you for your interest in contributing to Piggus! We welcome contributions from developers of all skill levels. This document provides guidelines and information to help you contribute effectively.

## 🌟 Ways to Contribute

### 🐛 Bug Reports

- Report bugs through [GitHub Issues](https://github.com/Rebelpug/piggus-app/issues)
- Use the bug report template
- Include steps to reproduce, expected behavior, and screenshots if applicable

### ✨ Feature Requests

- Suggest new features through [GitHub Issues](https://github.com/Rebelpug/piggus-app/issues)
- Use the feature request template
- Check our "Wanted Features" section in the README for prioritized features

### 📝 Code Contributions

- Bug fixes
- Feature implementations
- Performance improvements
- Code refactoring
- Test improvements

### 📚 Documentation

- README improvements
- Code comments
- API documentation
- Translation improvements

### 🌍 Translations

- Add new languages
- Improve existing translations
- Fix translation errors

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/Rebelpug/piggus-app.git
cd piggus

# Add the original repository as upstream
git remote add upstream https://github.com/Rebelpug/piggus-app.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start the development server
npm start
```

### 3. Create a Feature Branch

```bash
# Always create a new branch for your work
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

## 🛠️ Development Guidelines

### Code Style

- **ESLint**: Run `npm run lint` before committing
- **TypeScript**: Use TypeScript for all new code
- **Naming**: Use descriptive variable and function names
- **Comments**: Add comments for complex logic

### File Organization

```
app/                    # Screens (Expo Router)
├── (protected)/        # Authenticated screens
├── login.tsx          # Login screen
└── _layout.tsx        # Root layout

components/            # Reusable UI components
├── ui/               # Basic UI components
├── expenses/         # Expense-related components
└── ComponentName.tsx # PascalCase naming

services/             # API and business logic
├── expenseService.ts # Service files
└── index.ts         # Export barrel

types/               # TypeScript definitions
├── expense.ts       # Domain types
└── api.ts          # API types
```

### Component Guidelines

#### React Components

```typescript
// Use functional components with TypeScript
interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

export function MyComponent({ title, onPress }: MyComponentProps) {
  // Component logic here
  return (
    <ThemedView>
      <ThemedText>{title}</ThemedText>
    </ThemedView>
  );
}
```

#### UI Components

- Use `ThemedView` and `ThemedText` for consistent theming
- Follow the existing UI Kitten patterns
- Ensure components are accessible

### State Management

- Use React Context for global state
- Keep component state local when possible
- Use custom hooks for complex state logic

### API Integration

- All API calls should go through service files
- Handle errors gracefully
- Use proper TypeScript types for API responses

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

### Writing Tests

- Write tests for new features
- Include edge cases
- Test error scenarios
- Use descriptive test names

## 🔒 Security Considerations

### Privacy First

- Never log sensitive user data
- Ensure encryption is properly implemented
- Review security implications of changes

### Environment Variables

- Never commit secrets to git
- Use `.env.local` for local development
- Update `.env.example` for new required variables

## 📋 Pull Request Process

### Before Submitting

1. **Update your branch**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Test your changes**

   ```bash
   npm run lint
   npm test
   npm run build # Ensure it builds successfully
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add expense category filtering"
   ```

### Commit Message Format

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(expenses): add category filtering
fix(auth): resolve login redirect issue
docs(readme): update installation instructions
```

### Pull Request Template

When creating a pull request, please include:

- **Description**: What changes were made and why
- **Type of Change**: Bug fix, new feature, documentation, etc.
- **Testing**: How the changes were tested
- **Screenshots**: For UI changes
- **Breaking Changes**: Any breaking changes and migration steps
- **Checklist**: Completed pre-submission checklist

### Review Process

1. **Automated Checks**: All PRs must pass CI checks
2. **Code Review**: At least one maintainer review required
3. **Testing**: Changes should be tested on both iOS and Android
4. **Documentation**: Update docs if needed

## 🌍 Internationalization (i18n)

### Adding Translations

1. **Add new keys to English**

   ```json
   {
     "newFeature": {
       "title": "New Feature",
       "description": "This is a new feature"
     }
   }
   ```

2. **Add translations for other languages**

   ```json
   {
     "newFeature": {
       "title": "Nueva Característica",
       "description": "Esta es una nueva característica"
     }
   }
   ```

3. **Use in components**

   ```typescript
   import { useTranslation } from '../context/LocalizationContext';

   const { t } = useTranslation();
   return <Text>{t('newFeature.title')}</Text>;
   ```

### Translation Guidelines

- Keep strings concise but descriptive
- Use placeholders for dynamic content
- Consider cultural context, not just literal translation
- Test with longer translations to ensure UI doesn't break

## 📱 Platform-Specific Guidelines

### iOS Considerations

- Test on various iOS versions
- Follow iOS Human Interface Guidelines
- Test with different screen sizes

### Android Considerations

- Test on different Android versions
- Follow Material Design principles
- Test on various device configurations

### Web Considerations

- Ensure responsive design
- Test keyboard navigation
- Verify accessibility features

## 🆘 Getting Help

### Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [UI Kitten Documentation](https://akveo.github.io/react-native-ui-kitten/)

### Community

- 💬 [GitHub Discussions](https://github.com/Rebelpug/piggus-app/discussions) - General questions
- 🐛 [GitHub Issues](https://github.com/Rebelpug/piggus-app/issues) - Bug reports
- 📧 Email: support@rebelpug.com - Direct contact

### Development Questions

If you're stuck on something:

1. Check existing issues and discussions
2. Create a discussion thread
3. Provide context and code samples
4. Be patient and respectful

## 🏆 Recognition

Contributors will be:

- Listed in the README contributors section
- Mentioned in release notes for significant contributions
- Invited to the contributors team for regular contributors

## 📄 Code of Conduct

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome people of all backgrounds and experience levels
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning

### Unacceptable Behavior

- Harassment, discrimination, or offensive language
- Personal attacks or inflammatory comments
- Spam or self-promotion unrelated to the project
- Publishing private information without consent

### Enforcement

- Issues will be addressed by maintainers
- Serious violations may result in temporary or permanent bans
- Contact support@rebelpug.com for serious concerns

## 🎯 Contribution Priorities

### High Priority

- 🏦 Multi-currency support implementation
- 🌍 Web platform support
- 🔐 Security improvements
- 🐛 Bug fixes

### Medium Priority

- 📱 UI/UX improvements
- 🚀 Performance optimizations
- 📝 Documentation improvements
- 🌍 Additional translations

### Low Priority

- 🧹 Code refactoring
- 🎨 Visual enhancements
- 📊 Analytics improvements

---

Thank you for contributing to Piggus! Your efforts help make financial privacy accessible to everyone. 🙏
