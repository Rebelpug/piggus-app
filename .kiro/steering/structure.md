# Project Structure & Conventions

## Directory Organization

```
piggus-app/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (protected)/        # Protected routes requiring authentication
│   ├── _layout.tsx         # Root layout with providers
│   ├── login.tsx           # Authentication screens
│   └── register.tsx
├── components/             # Reusable UI components
│   ├── auth/              # Authentication-related components
│   ├── banking/           # Banking/financial components
│   ├── budget/            # Budget management components
│   ├── expenses/          # Expense tracking components
│   ├── investments/       # Investment portfolio components
│   ├── layout/            # Layout components
│   ├── ui/                # Generic UI components
│   └── ThemedText.tsx     # Themed components for dark/light mode
├── context/               # React Context providers
│   ├── AuthContext.tsx    # Authentication & encryption state
│   ├── ThemeContext.tsx   # Theme management
│   └── LocalizationContext.tsx
├── lib/                   # Core utilities and configurations
│   ├── supabase.ts        # Supabase client setup
│   ├── encryption.ts      # Encryption utilities
│   └── i18n.ts           # Internationalization setup
├── services/              # API and data services
│   ├── expenseService.ts  # Expense CRUD operations
│   ├── investmentService.ts
│   └── profileService.ts
├── types/                 # TypeScript type definitions
│   ├── expense.ts         # Expense-related types
│   ├── investment.ts      # Investment types
│   └── profile.ts         # User profile types
├── utils/                 # Helper functions
│   ├── currencyUtils.ts   # Currency formatting
│   ├── dateUtils.ts       # Date manipulation
│   └── financeUtils.ts    # Financial calculations
├── translations/          # i18n JSON files
│   ├── en.json           # English (default)
│   ├── es.json           # Spanish
│   └── ...               # Other supported languages
└── assets/               # Static assets (images, fonts)
```

## Naming Conventions

### Files & Directories

- **Components**: PascalCase (e.g., `ExpenseForm.tsx`, `ThemedText.tsx`)
- **Screens**: PascalCase or kebab-case (e.g., `login.tsx`, `expense-details.tsx`)
- **Utilities**: camelCase (e.g., `currencyUtils.ts`, `dateUtils.ts`)
- **Types**: camelCase with descriptive names (e.g., `expense.ts`, `investment.ts`)
- **Services**: camelCase with "Service" suffix (e.g., `expenseService.ts`)

### Code Conventions

- **Variables/Functions**: camelCase
- **Components**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **Context Hooks**: `use` prefix (e.g., `useAuth`, `useTheme`)

## Import Patterns

### Path Aliases

Use `@/` for all internal imports:

```typescript
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
```

### Import Order

1. React/React Native imports
2. Third-party libraries
3. Internal imports (using @/ alias)
4. Relative imports

## Component Architecture

### Themed Components

All UI components should support light/dark themes:

```typescript
export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "subtitle" | "link";
};
```

### Context Providers

Wrap components in provider hierarchy in `_layout.tsx`:

```typescript
<ThemeProvider>
  <LocalizationProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </LocalizationProvider>
</ThemeProvider>
```

## Data Flow Patterns

### Encryption Layer

All sensitive data must be encrypted before storage:

- Use `encryptData()` before saving to Supabase
- Use `decryptData()` when retrieving from Supabase
- Store encryption keys securely using `SecureKeyManager`

### Service Layer

Business logic should be in services, not components:

- Services handle API calls and data transformation
- Components focus on UI and user interaction
- Use TypeScript types for all data structures

### Error Handling

- Use Sentry for error monitoring in production
- Implement graceful fallbacks for encryption failures
- Validate data at service boundaries

## File Organization Rules

### Components

- Group related components in subdirectories
- Include index files for clean imports
- Keep components focused and single-purpose

### Types

- Define comprehensive TypeScript types
- Include utility functions with type definitions
- Use discriminated unions for complex state

### Translations

- Use nested JSON structure for organization
- Keep keys descriptive and hierarchical
- Include all supported languages in sync
