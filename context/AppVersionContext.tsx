import { APP_VERSION } from "@/config/version";
import { versionService, VersionService } from "@/services/versionService";
import { AppVersionContextType, AppVersionState } from "@/types/version";
import { StoreUtils } from "@/utils/storeUtils";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

interface AppVersionProviderProps {
  children: ReactNode;
}

const initialState: AppVersionState = {
  isLoading: false,
  versionInfo: null,
  error: null,
  showSuggestedModal: false,
  showRequiredModal: false,
  checkingEnabled: VersionService.isVersionCheckingEnabled(),
};

const AppVersionContext = createContext<AppVersionContextType | null>(null);

export const AppVersionProvider: React.FC<AppVersionProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<AppVersionState>(initialState);

  const updateState = useCallback((updates: Partial<AppVersionState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const checkVersion = useCallback(async () => {
    if (!state.checkingEnabled) {
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      const response = await versionService.checkVersionWithRetry(APP_VERSION);

      if (response.success && response.data) {
        const versionInfo = response.data;

        updateState({
          isLoading: false,
          versionInfo,
          error: null,
          showRequiredModal: false, // Disabled for now
          showSuggestedModal: versionInfo.update_suggested,
        });
      } else {
        updateState({
          isLoading: false,
          error: response.error || "Failed to check app version",
          versionInfo: response.data,
        });
      }
    } catch (error) {
      console.error("Version check error:", error);
      updateState({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }, [state.checkingEnabled, updateState]);

  const dismissSuggestedModal = useCallback(() => {
    updateState({ showSuggestedModal: false });
  }, [updateState]);

  const openAppStore = useCallback(async () => {
    try {
      await StoreUtils.openAppStore();
    } catch (error) {
      console.error("Failed to open app store:", error);
    }
  }, []);

  const retryVersionCheck = useCallback(async () => {
    await checkVersion();
  }, [checkVersion]);

  // Handle app state changes to check version when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && state.checkingEnabled) {
        // Check version when app becomes active
        checkVersion();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, [checkVersion, state.checkingEnabled]);

  // Initial version check on mount
  useEffect(() => {
    if (state.checkingEnabled) {
      checkVersion();
    }
  }, [checkVersion, state.checkingEnabled]);

  const contextValue: AppVersionContextType = useMemo(
    () => ({
      ...state,
      checkVersion,
      dismissSuggestedModal,
      openAppStore,
      retryVersionCheck,
    }),
    [
      state,
      checkVersion,
      dismissSuggestedModal,
      openAppStore,
      retryVersionCheck,
    ],
  );

  return (
    <AppVersionContext.Provider value={contextValue}>
      {children}
    </AppVersionContext.Provider>
  );
};

export const useAppVersion = (): AppVersionContextType => {
  const context = useContext(AppVersionContext);
  if (!context) {
    throw new Error("useAppVersion must be used within an AppVersionProvider");
  }
  return context;
};
