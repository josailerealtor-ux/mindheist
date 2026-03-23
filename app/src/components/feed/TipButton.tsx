import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert,
} from 'react-native';
import Purchases from 'react-native-purchases';
import { PRODUCT_IDS } from '../../lib/purchases';
import { supabase } from '../../lib/supabase';

const TIP_OPTIONS = [
  { label: '$0.99', productId: PRODUCT_IDS.TIP_SMALL, cents: 99 },
  { label: '$1.99', productId: PRODUCT_IDS.TIP_MEDIUM, cents: 199 },
  { label: '$4.99', productId: PRODUCT_IDS.TIP_LARGE, cents: 499 },
];

interface Props {
  creatorId: string;
  trapId: string;
  creatorUsername: string;
}

export function TipButton({ creatorId, trapId, creatorUsername }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  async function handleTip(productId: string, cents: number) {
    setPurchasing(productId);
    try {
      const products = await Purchases.getProducts([productId]);
      if (!products.length) {
        Alert.alert('Unavailable', 'Tips are not available right now.');
        return;
      }
      await Purchases.purchaseStoreProduct(products[0]);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('record_tip', {
          p_tipper_id: user.id,
          p_creator_id: creatorId,
          p_trap_id: trapId,
          p_amount_cents: cents,
        });
      }
      setModalVisible(false);
      Alert.alert('Thank you!', `You tipped @${creatorUsername} ${TIP_OPTIONS.find(t => t.productId === productId)?.label}!`);
    } catch (err: unknown) {
      if (!(err as { userCancelled?: boolean }).userCancelled) {
        Alert.alert('Failed', (err as Error).message);
      }
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.tipBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.tipBtnText}>💸 Tip</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Tip @{creatorUsername}</Text>
            <Text style={styles.sheetSub}>Show some love for an awesome trap!</Text>
            <View style={styles.optionRow}>
              {TIP_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.productId}
                  style={[styles.optionBtn, purchasing === opt.productId && styles.optionBtnDisabled]}
                  onPress={() => handleTip(opt.productId, opt.cents)}
                  disabled={purchasing !== null}
                >
                  {purchasing === opt.productId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tipBtn: {
    backgroundColor: '#FFF3E0', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FFB74D',
  },
  tipBtnText: { color: '#E65100', fontWeight: '600', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  sheetSub: { fontSize: 14, color: '#888', marginBottom: 20 },
  optionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  optionBtn: {
    flex: 1, backgroundColor: '#6C47FF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  optionBtnDisabled: { opacity: 0.5 },
  optionLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: '#888', fontSize: 15 },
});
