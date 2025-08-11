import React from "react";
import { useAppVersion } from "@/context/AppVersionContext";
import { SuggestedUpdateModal } from "./SuggestedUpdateModal";
import { RequiredUpdateModal } from "./RequiredUpdateModal";
import { VersionErrorBoundary } from "./VersionErrorBoundary";
import { APP_VERSION } from "@/config/version";

/**
 * VersionGuard component that displays update modals based on version check results
 * This component should be placed at the root level of the app to ensure it can
 * block app functionality when required updates are needed
 */
export const VersionGuard: React.FC = () => {
  const {
    versionInfo,
    showSuggestedModal,
    showRequiredModal,
    dismissSuggestedModal,
    openAppStore,
  } = useAppVersion();

  if (!versionInfo) {
    return null;
  }

  return (
    <VersionErrorBoundary>
      <SuggestedUpdateModal
        visible={showSuggestedModal}
        currentVersion={APP_VERSION}
        latestVersion={versionInfo.current_version}
        onUpdatePress={openAppStore}
        onLaterPress={dismissSuggestedModal}
      />

      <RequiredUpdateModal
        visible={showRequiredModal}
        currentVersion={APP_VERSION}
        mandatoryVersion={versionInfo.mandatory_version}
        onUpdatePress={openAppStore}
      />
    </VersionErrorBoundary>
  );
};
