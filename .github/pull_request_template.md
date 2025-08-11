## 📝 Description

<!-- Provide a clear and concise description of the changes made -->

## 🔗 Related Issue

<!-- Link to the issue this PR addresses -->

Closes #<!-- issue number -->

## 🎯 Type of Change

<!-- Mark with an `x` all that apply -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update (README, comments, etc.)
- [ ] 🎨 Style/UI changes (styling, layout, visual improvements)
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test addition or update
- [ ] 🔧 Build/CI changes
- [ ] 🌍 Internationalization (i18n) changes

## 📱 Platform Testing

<!-- Mark with an `x` all platforms where you've tested this change -->

- [ ] 📱 iOS (Device/Simulator)
- [ ] 🤖 Android (Device/Emulator)
- [ ] 🌐 Web Browser
- [ ] 🔧 Expo Go
- [ ] 📦 Development Build

## 🧪 Testing

### Manual Testing Performed

<!-- Describe the testing steps you performed -->

- [ ] I have tested the happy path
- [ ] I have tested edge cases
- [ ] I have tested error scenarios
- [ ] I have tested on multiple screen sizes (if UI changes)
- [ ] I have tested with different data sets

### Automated Tests

- [ ] I have added tests that cover my changes
- [ ] All new and existing tests passed
- [ ] I have updated tests that were affected by my changes

### Test Scenarios

<!-- List specific test scenarios -->

1.
2.
3.

## 📸 Screenshots/Videos

<!-- Add screenshots or videos demonstrating the changes, especially for UI changes -->

### Before

<!-- Screenshot/video of the previous state -->

### After

<!-- Screenshot/video of the new state -->

## ⚡ Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact expected
- [ ] Performance improvement expected
- [ ] Potential performance impact (please describe below)

<!-- If there's potential performance impact, describe it -->

## 🔄 Migration/Breaking Changes

<!-- If this PR contains breaking changes, describe them and provide migration steps -->

- [ ] No breaking changes
- [ ] Contains breaking changes (described below)

<!-- Migration steps for breaking changes -->

## 📋 Code Quality Checklist

### General Code Quality

- [ ] Code follows the existing code style and conventions
- [ ] Code is properly commented where necessary
- [ ] No console.log statements left in production code
- [ ] Error handling is implemented appropriately
- [ ] Code is readable and maintainable

### React Native/Expo Specific

- [ ] Components are properly typed with TypeScript
- [ ] Props interfaces are defined and exported if reusable
- [ ] Hooks are used correctly (dependencies, cleanup, etc.)
- [ ] No memory leaks (useEffect cleanup, listeners, etc.)
- [ ] Proper key props for lists
- [ ] Accessibility props added where appropriate

### Mobile Specific

- [ ] Works in both portrait and landscape orientations (if applicable)
- [ ] Handles keyboard properly (if form inputs)
- [ ] Loading states implemented for async operations
- [ ] Offline behavior considered (if applicable)
- [ ] Deep linking works (if applicable)

## 🛡️ Security Checklist

- [ ] No sensitive data logged or exposed
- [ ] Input validation implemented where needed
- [ ] No hardcoded secrets or credentials
- [ ] Privacy considerations addressed
- [ ] Authentication/authorization respected

## 📚 Documentation

- [ ] README updated (if needed)
- [ ] Code comments added/updated
- [ ] API documentation updated (if applicable)
- [ ] Migration guide updated (if breaking changes)

## 🌍 Internationalization

- [ ] New text strings added to translation files
- [ ] All languages updated (or marked for translation)
- [ ] Text displays correctly in different languages
- [ ] No hardcoded strings in components

## 🔧 Build & Deploy

- [ ] App builds successfully for all platforms
- [ ] No new build warnings introduced
- [ ] Bundle size impact is acceptable
- [ ] Environment variables updated (if needed)

## 👀 Code Review Notes

<!-- Any specific areas you'd like reviewers to focus on -->

## 📌 Additional Context

<!-- Any additional context, concerns, or notes for reviewers -->

---

## 🚀 Post-Merge Checklist

<!-- Items to check after merging (for maintainers) -->

- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Update release notes
- [ ] Tag release (if applicable)
- [ ] Close related issues
- [ ] Update project board

---

**By submitting this pull request, I confirm that:**

- [ ] I have read and followed the [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] My code follows the project's coding standards
- [ ] I have tested my changes thoroughly
- [ ] I have provided appropriate documentation
- [ ] I understand this will be reviewed before merging
