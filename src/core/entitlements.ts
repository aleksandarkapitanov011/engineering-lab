/**
 * The single seam for paid features. Replace `LocalEntitlements` with a RevenueCat-backed
 * implementation later (e.g. Purchases.getCustomerInfo()) without touching the shell:
 * call `setEntitlementService(new RevenueCatEntitlements())` at startup.
 */
export interface EntitlementService {
  isPro(): Promise<boolean>;
  /** Starts a purchase flow. The stub only reports that payments are not available yet. */
  purchasePro(): Promise<{ ok: boolean; reason?: 'not-available' | 'cancelled' | 'error' }>;
}

class LocalEntitlements implements EntitlementService {
  async isPro(): Promise<boolean> {
    return false;
  }
  async purchasePro(): Promise<{ ok: boolean; reason?: 'not-available' }> {
    return { ok: false, reason: 'not-available' };
  }
}

let service: EntitlementService = new LocalEntitlements();

export function entitlements(): EntitlementService {
  return service;
}

export function setEntitlementService(s: EntitlementService): void {
  service = s;
}

export function isPro(): Promise<boolean> {
  return service.isPro();
}
