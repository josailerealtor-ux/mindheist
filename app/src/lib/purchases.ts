import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure these in your RevenueCat dashboard
const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
}) ?? '';

// Product identifiers — must match what you configure in RevenueCat + App Store / Play Store
export const PRODUCT_IDS = {
  PRO_MONTHLY: 'mindheist_pro_monthly',
  PRO_ANNUAL: 'mindheist_pro_annual',
  TIP_SMALL: 'mindheist_tip_099',      // $0.99 consumable
  TIP_MEDIUM: 'mindheist_tip_199',     // $1.99 consumable
  TIP_LARGE: 'mindheist_tip_499',      // $4.99 consumable
  COINS_100: 'mindheist_coins_100',    // 100 coins $0.99
  COINS_500: 'mindheist_coins_500',    // 500 coins $3.99
  COINS_1500: 'mindheist_coins_1500',  // 1500 coins $9.99
} as const;

export const ENTITLEMENTS = {
  PRO: 'pro',
} as const;

export async function initPurchases(userId: string): Promise<void> {
  if (!REVENUECAT_API_KEY) return;

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function isPro(): Promise<boolean> {
  const info = await getCustomerInfo();
  return info?.entitlements.active[ENTITLEMENTS.PRO] !== undefined;
}

export async function getProPackages(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; error?: string }> {
  try {
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (err: unknown) {
    if ((err as { userCancelled?: boolean }).userCancelled) {
      return { success: false };
    }
    return { success: false, error: (err as Error).message };
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENTS.PRO] !== undefined;
  } catch {
    return false;
  }
}

// Sync pro status to Supabase after purchase
export async function syncProStatus(): Promise<void> {
  const proActive = await isPro();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('users')
    .update({
      is_pro: proActive,
      subscription_expires_at: proActive
        ? new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    })
    .eq('id', user.id);
}
