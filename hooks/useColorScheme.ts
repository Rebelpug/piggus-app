import { useTheme } from "@/context/ThemeContext";
import { useColorScheme as useNativeColorScheme } from "react-native";

export function useColorScheme() {
  try {
    const { colorScheme } = useTheme();
    return colorScheme;
  } catch (error) {
    // Fallback to native hook if ThemeContext is not available
    console.warn(
      "ThemeContext not available, falling back to native color scheme",
    );
    return useNativeColorScheme();
  }
}
