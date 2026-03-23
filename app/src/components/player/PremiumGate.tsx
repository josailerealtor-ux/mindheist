import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import Purchases from 'react-native-purchases';
import { PRODUCT_IDS, syncProStatus } from '../../lib/purchases';
import { Trap } from '../../types/trap';

interface Props {
  trap: Trap;
  onUnlocked: () => void;
}

export function PremiumGate({ trap, onUnlocked }: Props) {
  const [purchasing, setPurchasing] = useState(false);

  const priceLabel = trap.price_cents > 0
    ? `$${(trap.price_cents / 100).toFixed(2)}`
    : 'Free';

  async function handlePurchase() {
    setPurchasing(true);
    try {
      const products = await Purchases.getProducts([PRODUCT_IDS.TIP_SMALL]);
      // Use a consumable product matching the trap price
      const productId = trap.price_cents <= 99
        ? PRODUCT_IDS.TIP_SMALL
        : trap.price_cents <= 199
        ? PRODUCT_IDS.TIP_MEDIUM
        : PRODUCT_IDS.TIP_LARGE;

      const storeProducts = await Purchases.getProducts([productId]);
      if (!storeProducts.length) {
        Alert.alert('Unavailable', 'This purchase is not available right now.');
        return;
      }
      await Purchases.purchaseStoreProduct(storeProducts[0]);
      await syncProStatus();
      onUnlocked();
    } catch (err: unknown) {
      if (!(err as { userCancelled?: boolean }).userCancelled) {
        Alert.alert('Purchase failed', (err as Error).message);
      }
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.lock}>🔒</Text>
      <Text style={styles.title}>Premium Trap</Text>
      <Text style={styles.subtitle}>
        This trap was created by a MindHeist Pro creator.{'\n'}
        Unlock it for a one-time fee to play.
      </Text>
      <Text style={styles.price}>{priceLabel}</Text>
      <TouchableOpacity
        style={[styles.btn, purchasing && styles.btnDisabled]}
        onPress={handlePurchase}
        disabled={purchasing}
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Unlock & Play</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  lock: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  price: { fontSize: 32, fontWeight: 'bold', color: '#6C47FF', marginBottom: 24 },
  btn: {
    backgroundColor: '#6C47FF', borderRadius: 14,
    paddingHorizontal: 40, paddingVertical: 14,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
