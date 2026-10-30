import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

// `__DEV__` is true in the Metro/dev-client runtime and false in an EAS
// preview/production build - exactly the split we need: the RevenueCat
// Test Store key must never ship in a production build, even if it's
// still sitting in .env when that build is made.
const API_KEY = __DEV__ ? TEST_API_KEY : ANDROID_API_KEY;

let configured = false;

/** Android-only for now: iOS/web keep going through the existing Stripe flow. */
export function isPurchasesAvailable(): boolean {
  return Platform.OS === 'android' && !!API_KEY;
}

export function configurePurchases(): void {
  if (configured || !isPurchasesAvailable()) return;
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey: API_KEY as string });
  configured = true;
}

/** Call once a user is authenticated, so RevenueCat's appUserID matches
 * our own User.id - the backend webhook (revenuecat.py) relies on this. */
export async function loginPurchases(userId: string): Promise<void> {
  if (!isPurchasesAvailable()) return;
  configurePurchases();
  await Purchases.logIn(userId);
}

export async function logoutPurchases(): Promise<void> {
  if (!isPurchasesAvailable() || !configured) return;
  await Purchases.logOut();
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isPurchasesAvailable()) return null;
  configurePurchases();
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export type { PurchasesOffering, PurchasesPackage, CustomerInfo };
