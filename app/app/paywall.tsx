import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { getProPackages, purchasePackage, restorePurchases, syncProStatus } from '../src/lib/purchases';

const PRO_FEATURES = [
  'Unlimited trap drafts (free: 3)',
  'Creator analytics dashboard',
  'Step-by-step fail heatmaps',
  'Creator badge on your profile',
  'Priority feed placement',
  'Custom replay branding',
];

export default function PaywallScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getProPackages().then((pkgs) => {
      setPackages(pkgs);
      setSelected(pkgs.find((p) => p.identifier.includes('annual')) ?? pkgs[0] ?? null);
      setLoading(false);
    });
  }, []);

  async function handlePurchase() {
    if (!selected) return;
    setPurchasing(true);
    const { success, error } = await purchasePackage(selected);
    if (success) {
      await syncProStatus();
      router.back();
    } else if (error) {
      Alert.alert('Purchase failed', error);
    }
    setPurchasing(false);
  }

  async function handleRestore() {
    setRestoring(true);
    const restored = await restorePurchases();
    if (restored) {
      await syncProStatus();
      Alert.alert('Restored!', 'Your Pro subscription has been restored.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Nothing to restore', 'No active Pro subscription found.');
    }
    setRestoring(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>MindHeist Pro</Text>
        </View>
        <Text style={styles.headline}>Unlock your full{'\n'}creator potential</Text>

        {/* Features */}
        <View style={styles.featureList}>
          {PRO_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Packages */}
        {loading ? (
          <ActivityIndicator color="#6C47FF" style={{ marginVertical: 24 }} />
        ) : packages.length === 0 ? (
          <Text style={styles.noPackages}>Subscription not available in your region.</Text>
        ) : (
          <View style={styles.packageList}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[styles.packageCard, selected?.identifier === pkg.identifier && styles.packageCardSelected]}
                onPress={() => setSelected(pkg)}
              >
                <View style={styles.packageInfo}>
                  <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                  <Text style={styles.packageDesc}>{pkg.product.description}</Text>
                </View>
                <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                {selected?.identifier === pkg.identifier && (
                  <View style={styles.packageCheckBadge}>
                    <Text style={styles.packageCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, (purchasing || !selected) && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selected}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
          <Text style={styles.restoreBtnText}>{restoring ? 'Restoring...' : 'Restore purchases'}</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Subscriptions auto-renew unless cancelled. Cancel anytime in your device settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  scroll: { padding: 24, paddingBottom: 48 },
  closeBtn: { alignSelf: 'flex-end', padding: 8 },
  closeBtnText: { color: '#888', fontSize: 20 },
  badge: {
    alignSelf: 'center', backgroundColor: '#6C47FF',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginTop: 8,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  headline: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, lineHeight: 36 },
  featureList: { gap: 12, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureCheck: { color: '#6C47FF', fontSize: 18, fontWeight: 'bold', width: 24 },
  featureText: { color: '#ddd', fontSize: 15, flex: 1 },
  noPackages: { color: '#888', textAlign: 'center', marginVertical: 24 },
  packageList: { gap: 10, marginBottom: 24 },
  packageCard: {
    backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  packageCardSelected: { borderColor: '#6C47FF' },
  packageInfo: { flex: 1 },
  packageTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  packageDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  packagePrice: { color: '#6C47FF', fontWeight: 'bold', fontSize: 17 },
  packageCheckBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#6C47FF', justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  packageCheckText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ctaBtn: {
    backgroundColor: '#6C47FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 14,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  restoreBtn: { alignItems: 'center', paddingVertical: 8 },
  restoreBtnText: { color: '#888', fontSize: 14 },
  legal: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
