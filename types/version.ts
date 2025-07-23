export interface VersionInfo {
  current_version: string;
  mandatory_version: string;
  update_required: boolean;
  update_suggested: boolean;
}

export interface VersionCheckRequest {
  version: string;
}

export interface VersionCheckResponse {
  success: boolean;
  data: VersionInfo;
  error?: string;
}

export interface VersionResponse {
  current_version: string;
  mandatory_version: string;
}

export interface AppVersionState {
  isLoading: boolean;
  versionInfo: VersionInfo | null;
  error: string | null;
  showSuggestedModal: boolean;
  showRequiredModal: boolean;
  checkingEnabled: boolean;
}

export interface AppVersionContextType extends AppVersionState {
  checkVersion: () => Promise<void>;
  dismissSuggestedModal: () => void;
  openAppStore: () => void;
  retryVersionCheck: () => Promise<void>;
}