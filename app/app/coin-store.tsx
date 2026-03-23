import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { apiFetch } from '../src/api/client';

const COIN_PACKS = [
  { productId: 'mindheist_coins_100', coins: 100, label: '100 Coins', price: '$0.99', bonus: null },
  { productId: 'mindheist_coins_500', coins: 500, label: '500 Coins', price: '$3.99', bonus: 'Best Value' },
  { productId: 'mindheist_coins_1500', coins: 1500, label: '1500 Coins', price: '$9.99', bonus: 'Most Popular' },
];

const HOW_TO_EARN = [
  { icon: '🔓', text: 'Escape a trap', coins: '+10' },
  { icon: '🏗️', text: 'Publish a trap', coins: '+5' },
  { icon: '⚔️', text: 'Receive a challenge', coins: '+2' },
];

const HOW_TO_SPEND = [
  { icon: '⚔️', text: 'Send a challenge', coins: '-20' },
];

export default function CoinStoreScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ balance: number }>('/coins/balance')
      .then((d) => setBalance(d.balance))
      .catch(() => null);
  }, []);

  async function handlePurchase(pack: typeof COIN_PACKS[0]) {
    setPurchasing(pack.productId);
    try {
      const products = await Purchases.getProducts([pack.productId]);
      if (!products.length) {
        Alert.alert('Unavailable', 'This pack is not available right now.');
        return;
      }
      await Purchases.purchaseStoreProduct(products[0]);
      const { awarded } = await apiFetch<{ awarded: number }>('/coins/purchase', {
        method: 'POST',
        body: JSON.stringify({ product_id: pack.productId }),
      });
      setBalance((prev) => (prev ?? 0) + awarded);
      Alert.alert('Coins added!', `${awarded} coins have been added to your balance.`);
    } catch (err: unknown) {
      if (!(err as { userCancelled?: boolean }).userCancelled) {
        Alert.alert('Purchase failed', (err as Error).message);
      }
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coin Store</Text>
        {balance !== null && (
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceText}>🪙 {balance.toLocaleString()}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Buy Coins</Text>
        {COIN_PACKS.map((pack) => (
          <TouchableOpacity
            key={pack.productId}
            style={[styles.packCard, purchasing === pack.productId && styles.packCardDisabled]}
            onPress={() => handlePurchase(pack)}
            disabled={purchasing !== null}
          >
            <View style={styles.packIcon}>
              <Text style={styles.packIconText}>🪙</Text>
            </View>
            <View style={styles.packInfo}>
              <Text style={styles.packLabel}>{pack.label}</Text>
              {pack.bonus && <Text style={styles.packBonus}>{pack.bonus}</Text>}
            </View>
            {purchasing === pack.productId ? (
              <ActivityIndicator color="#6C47FF" />
            ) : (
              <Text style={styles.packPrice}>{pack.price}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>How to Earn</Text>
        {HOW_TO_EARN.map((item) => (
          <View key={item.text} style={styles.earnRow}>
            <Text style={styles.earnIcon}>{item.icon}</Text>
            <Text style={styles.earnText}>{item.text}</Text>
            <Text style={styles.earnCoins}>{item.coins}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>How to Spend</Text>
        {HOW_TO_SPEND.map((item) => (
          <View key={item.text} style={styles.earnRow}>
            <Text style={styles.earnIcon}>{item.icon}</Text>
            <Text style={styles.earnText}>{item.text}</Text>
            <Text style={[styles.earnCoins, { color: '#EF4444' }]}>{item.coins}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { marginRight: 12, padding: 4 },
  backBtnText: { fontSize: 22, color: '#6C47FF' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111' },
  balanceBadge: {
    backgroundColor: '#FFF8E1', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FFD54F',
  },
  balanceText: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 12, marginTop: 8 },
  packCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  packCardDisabled: { opacity: 0.5 },
  packIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center',
  },
  packIconText: { fontSize: 24 },
  packInfo: { flex: 1 },
  packLabel: { fontSize: 16, fontWeight: '700', color: '#111' },
  packBonus: { fontSize: 12, color: '#6C47FF', fontWeight: '600', marginTop: 2 },
  packPrice: { fontSize: 18, fontWeight: 'bold', color: '#6C47FF' },
  earnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  earnIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  earnText: { flex: 1, fontSize: 14, color: '#444' },
  earnCoins: { fontSize: 15, fontWeight: '700', color: '#22C55E' },
});
