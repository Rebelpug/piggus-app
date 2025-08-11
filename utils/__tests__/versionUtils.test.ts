import { VersionService } from "@/services/versionService";

describe("VersionService", () => {
  describe("compareVersions", () => {
    it("should correctly compare semantic versions", () => {
      // Equal versions
      expect(VersionService.compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(VersionService.compareVersions("2.1.3", "2.1.3")).toBe(0);

      // First version is less than second
      expect(VersionService.compareVersions("1.0.0", "1.0.1")).toBe(-1);
      expect(VersionService.compareVersions("1.0.0", "1.1.0")).toBe(-1);
      expect(VersionService.compareVersions("1.0.0", "2.0.0")).toBe(-1);
      expect(VersionService.compareVersions("1.2.3", "1.2.4")).toBe(-1);

      // First version is greater than second
      expect(VersionService.compareVersions("1.0.1", "1.0.0")).toBe(1);
      expect(VersionService.compareVersions("1.1.0", "1.0.0")).toBe(1);
      expect(VersionService.compareVersions("2.0.0", "1.0.0")).toBe(1);
      expect(VersionService.compareVersions("1.2.4", "1.2.3")).toBe(1);
    });

    it("should handle versions with different number of parts", () => {
      expect(VersionService.compareVersions("1.0", "1.0.0")).toBe(0);
      expect(VersionService.compareVersions("1.0.0", "1.0")).toBe(0);
      expect(VersionService.compareVersions("1.1", "1.0.1")).toBe(1);
      expect(VersionService.compareVersions("1.0.1", "1.1")).toBe(-1);
    });

    it("should handle edge cases", () => {
      expect(VersionService.compareVersions("0.0.1", "0.0.2")).toBe(-1);
      expect(VersionService.compareVersions("10.0.0", "2.0.0")).toBe(1);
      expect(VersionService.compareVersions("1.10.0", "1.2.0")).toBe(1);
    });
  });

  describe("isVersionCheckingEnabled", () => {
    it("should return the correct enabled state", () => {
      const isEnabled = VersionService.isVersionCheckingEnabled();
      expect(typeof isEnabled).toBe("boolean");
    });
  });
});
