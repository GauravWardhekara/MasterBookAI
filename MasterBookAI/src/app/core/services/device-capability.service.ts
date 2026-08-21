import { Injectable } from '@angular/core';
import { DeviceCapabilities, DeviceTier } from '../models/model-hub.model';

/**
 * Service for detecting device hardware capabilities.
 * Used to filter models by compatibility.
 */
@Injectable({ providedIn: 'root' })
export class DeviceCapabilityService {
  private cachedCapabilities?: DeviceCapabilities;

  /**
   * Detect device capabilities. Results are cached after first call.
   */
  async detect(): Promise<DeviceCapabilities> {
    if (this.cachedCapabilities) return this.cachedCapabilities;

    const ramGB = this.detectRAM();
    const hasWebGPU = await this.detectWebGPU();
    const platform = this.detectPlatform();
    const os = this.detectOS();
    const tier = this.classifyTier(ramGB);

    this.cachedCapabilities = { tier, ramGB, hasWebGPU, platform, os };
    return this.cachedCapabilities;
  }

  /**
   * Force re-detection (e.g. after user overrides).
   */
  async refresh(): Promise<DeviceCapabilities> {
    this.cachedCapabilities = undefined;
    return this.detect();
  }

  /**
   * Classify a device tier from RAM.
   */
  classifyTier(ramGB: number): DeviceTier {
    if (ramGB >= 16) return 'ultra';
    if (ramGB >= 8) return 'high';
    if (ramGB >= 4) return 'medium';
    return 'low';
  }

  /**
   * Get max model file size (in GB) recommended for a tier.
   */
  getMaxModelSizeGB(tier: DeviceTier): number {
    switch (tier) {
      case 'ultra': return 50;
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 2;
    }
  }

  /**
   * Detect system RAM in GB.
   * Uses navigator.deviceMemory (Chromium) or falls back to conservative estimate.
   */
  private detectRAM(): number {
    // navigator.deviceMemory returns coarsened values: 0.25, 0.5, 1, 2, 4, 8
    // Capped at 8 in most browsers, but some Chromium builds report up to 32
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      return (navigator as any).deviceMemory || 4;
    }

    // Electron: try to read from window.process (Node integration)
    if (typeof window !== 'undefined' && (window as any).process?.versions?.electron) {
      try {
        const os = (window as any).require?.('os');
        if (os?.totalmem) {
          return Math.round(os.totalmem() / (1024 * 1024 * 1024));
        }
      } catch { /* Electron without nodeIntegration */ }
    }

    // Fallback: assume 4 GB (conservative for mobile)
    return 4;
  }

  /**
   * Check if WebGPU is available.
   */
  private async detectWebGPU(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    if (!('gpu' in navigator)) return false;
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  /**
   * Detect platform type from screen size and user agent.
   */
  private detectPlatform(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();

    // Check for mobile first
    const isMobile = /android|iphone|ipod|windows phone|blackberry/i.test(ua);
    const isTablet = /ipad|tablet|playbook|silk/i.test(ua) ||
      (isMobile && Math.min(screen.width, screen.height) >= 600);

    // Electron is always desktop
    if ((window as any).process?.versions?.electron) return 'desktop';

    if (isTablet) return 'tablet';
    if (isMobile) return 'mobile';

    // Also check screen width as a fallback
    if (typeof screen !== 'undefined' && screen.width < 768) return 'mobile';
    if (typeof screen !== 'undefined' && screen.width < 1024) return 'tablet';

    return 'desktop';
  }

  /**
   * Detect operating system.
   */
  private detectOS(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua) && !/android/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    return 'unknown';
  }
}
