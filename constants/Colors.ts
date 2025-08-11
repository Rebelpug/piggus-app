/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#6366F1";
const tintColorDark = "#818CF8";

export const Colors = {
  light: {
    text: "#1F2937",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    tint: tintColorLight,
    icon: "#6B7280",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorLight,
    primary: "#6366F1",
    secondary: "#EC4899",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    card: "#FFFFFF",
    border: "#E5E7EB",
    accent: "#8B5CF6",
  },
  dark: {
    text: "#F9FAFB",
    background: "#0F172A",
    surface: "#1E293B",
    tint: tintColorDark,
    icon: "#94A3B8",
    tabIconDefault: "#64748B",
    tabIconSelected: tintColorDark,
    primary: "#818CF8",
    secondary: "#F472B6",
    success: "#34D399",
    warning: "#FCD34D",
    error: "#F87171",
    card: "#1E293B",
    border: "#334155",
    accent: "#A78BFA",
  },
};
