import { DailyBriefing } from '../types/index.ts';

const CACHE_KEY_PREFIX = 'merchant_offline_brief_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedBriefPacket {
  merchantId: string;
  briefing: DailyBriefing;
  cachedAtIso: string;
  cachedAtDisplay: string;
  expiresAtMs: number;
  isExpired: boolean;
}

export class OfflineCacheService {
  /**
   * Saves latest daily brief for offline inspection
   */
  public static saveBrief(merchantId: string, briefing: DailyBriefing) {
    if (typeof window === 'undefined') return;
    try {
      const now = new Date();
      const packet: CachedBriefPacket = {
        merchantId,
        briefing,
        cachedAtIso: now.toISOString(),
        cachedAtDisplay: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        expiresAtMs: now.getTime() + CACHE_EXPIRY_MS,
        isExpired: false,
      };
      localStorage.setItem(`${CACHE_KEY_PREFIX}${merchantId}`, JSON.stringify(packet));
    } catch (e) {
      console.warn('[OfflineCache] Failed to cache brief:', e);
    }
  }

  public static saveOfflineBriefing(merchantId: string, briefing: DailyBriefing) {
    this.saveBrief(merchantId, briefing);
  }

  /**
   * Returns human-readable freshness badge text for cached data, or null
   */
  public static getFreshnessBadgeText(merchantId: string): string | null {
    const cached = this.getCachedBrief(merchantId);
    if (!cached) return null;
    return `Cached at ${cached.cachedAtDisplay}`;
  }

  /**
   * Retrieves cached brief when network drops
   */
  public static getCachedBrief(merchantId: string): CachedBriefPacket | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${merchantId}`);
      if (!raw) return null;

      const packet: CachedBriefPacket = JSON.parse(raw);
      const now = Date.now();
      packet.isExpired = now > packet.expiresAtMs;
      return packet;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clears cached brief on logout for tenant separation
   */
  public static clearCache(merchantId?: string) {
    if (typeof window === 'undefined') return;
    if (merchantId) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${merchantId}`);
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    }
  }
}

