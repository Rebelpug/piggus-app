import { piggusApi } from '@/client/piggusApi';
import { VersionResponse, VersionCheckRequest, VersionCheckResponse } from '@/types/version';
import { VERSION_CONFIG, APP_VERSION } from '@/config/version';

export class VersionService {
  private static instance: VersionService;

  static getInstance(): VersionService {
    if (!VersionService.instance) {
      VersionService.instance = new VersionService();
    }
    return VersionService.instance;
  }

  /**
   * Get current and mandatory versions from the server
   */
  async getVersionInfo(): Promise<VersionResponse> {
    try {
      return await piggusApi.getVersion();
    } catch (error: any) {
      console.error('Failed to get version info:', error);
      throw new Error(
        error?.response?.data?.message || 
        error?.message || 
        'Failed to retrieve version information'
      );
    }
  }

  /**
   * Check if app version needs updating
   */
  async checkVersion(version: string = APP_VERSION): Promise<VersionCheckResponse> {
    try {
      const requestData: VersionCheckRequest = { version };
      return await piggusApi.checkVersion(requestData);
    } catch (error: any) {
      console.error('Failed to check version:', error);
      
      // Return a fallback response that allows the app to continue
      return {
        success: false,
        data: {
          current_version: version,
          mandatory_version: version,
          update_required: false,
          update_suggested: false,
        },
        error: error?.response?.data?.message || 
               error?.message || 
               'Failed to check app version'
      };
    }
  }

  /**
   * Check version with retry logic
   */
  async checkVersionWithRetry(version: string = APP_VERSION, maxRetries: number = VERSION_CONFIG.MAX_RETRIES): Promise<VersionCheckResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.checkVersion(version);
        
        // If successful, return the result
        if (result.success) {
          return result;
        }
        
        // If it's not the last attempt and not successful, continue to retry
        if (attempt < maxRetries) {
          await this.delay(VERSION_CONFIG.RETRY_DELAY * attempt);
          continue;
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          console.log(`Version check attempt ${attempt} failed, retrying...`);
          await this.delay(VERSION_CONFIG.RETRY_DELAY * attempt);
        }
      }
    }

    // All retries failed, return a safe fallback
    return {
      success: false,
      data: {
        current_version: version,
        mandatory_version: version,
        update_required: false,
        update_suggested: false,
      },
      error: lastError?.message || 'Version check failed after multiple attempts'
    };
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Compare version strings (e.g., "1.2.3" vs "1.2.4")
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(n => parseInt(n, 10));
    const parts2 = v2.split('.').map(n => parseInt(n, 10));
    
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }

  /**
   * Check if version checking is enabled
   */
  static isVersionCheckingEnabled(): boolean {
    return VERSION_CONFIG.ENABLED;
  }
}

export const versionService = VersionService.getInstance();