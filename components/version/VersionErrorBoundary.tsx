import React, { ErrorInfo, ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "@ui-kitten/components";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for the version checking system
 * Prevents version check failures from crashing the entire app
 */
export class VersionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Version system error:", error, errorInfo);

    // Log to analytics/monitoring service if available
    if (typeof global.ErrorUtils !== "undefined") {
      global.ErrorUtils.reportFatalError?.(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <VersionErrorFallback
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  onRetry: () => void;
}

const VersionErrorFallback: React.FC<FallbackProps> = ({ onRetry }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Version Check Error
      </Text>
      <Text style={[styles.message, { color: colors.text }]}>
        The version checking system encountered an error, but the app will
        continue to function normally.
      </Text>
      <Button
        style={styles.button}
        onPress={onRetry}
        appearance="outline"
        size="small"
      >
        Retry
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff6b6b",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    zIndex: 999,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    alignSelf: "center",
  },
});
