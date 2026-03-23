import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { cosmeticsApi, Cosmetic, UserCosmetic } from '../src/api/cosmetics';
import { apiFetch } from '../src/api/client';

const TYPE_LABELS: Record<string, string> = { badge: 'Badges', frame: 'Frames', theme: 'Themes' };
const TYPE_ORDER = ['badge', 'frame', 'theme'];

export default function ShopScreen() {
  const router = useRouter();
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Record<string, string>>({}); // type -> cosmeticId
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        cosmeticsApi.list(),
        cosmeticsApi.myCosmetics(),
      ]);
      setCosmetics(all);
      setOwned(new Set((mine as UserCosmetic[]).map((uc) => uc.cosmetic_id)));
      const activeMap: Record<string, string> = {};
      (mine as UserCosmetic[]).filter((uc) => uc.is_active).forEach((uc) => {
        activeMap[uc.cosmetic.type] = uc.cosmetic_id;
      });
      setActive(activeMap);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePurchase(cosmetic: Cosmetic) {
    setPurchasing(cosmetic.id);
    try {
      // Use a RevenueCat product matching the price
      const productId = cosmetic.price_cents <= 99 ? 'mindheist_cosmetic_099'
        : cosmetic.price_cents <= 149 ? 'mindheist_cosmetic_149'
        : cosmetic.price_cents <= 199 ? 'mindheist_cosmetic_199'
        : 'mindheist_cosmetic_299';

      const products = await Purchases.getProducts([productId]);
      if (!products.length) {
        Alert.alert('Unavailable', 'Purchase not available right now.');
        return;
      }
      await Purchases.purchaseStoreProduct(products[0]);
      await apiFetch(`/cosmetics/${cosmetic.id}/unlock`, { method: 'POST' });
      setOwned((prev) => new Set([...prev, cosmetic.id]));
      Alert.alert('Unlocked!', `${cosmetic.name} has been added to your collection.`);
    } catch (err: unknown) {
      if (!(err as { userCancelled?: boolean }).userCancelled) {
        Alert.alert('Failed', (err as Error).message);
      }
    } finally {
      setPurchasing(null);
    }
  }

  async function handleActivate(cosmetic: Cosmetic) {
    await cosmeticsApi.setActive(cosmetic.id, cosmetic.type);
    setActive((prev) => ({ ...prev, [cosmetic.type]: cosmetic.id }));
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#6C47FF" /></View>;
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    items: cosmetics.filter((c) => c.type === type),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cosmetics Shop</Text>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.type}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6C47FF" />}
        contentContainerStyle={styles.scroll}
        renderItem={({ item: group }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{group.label}</Text>
            <View style={styles.grid}>
              {group.items.map((cosmetic) => {
                const isOwned = owned.has(cosmetic.id);
                const isActive = active[cosmetic.type] === cosmetic.id;
                return (
                  <View key={cosmetic.id} style={[styles.card, isActive && styles.cardActive]}>
                    <View style={styles.cardIcon}>
                      <Text style={styles.cardIconText}>
                        {cosmetic.type === 'badge' ? '🏅' : cosmetic.type === 'frame' ? '🖼' : '🎨'}
                      </Text>
                    </View>
                    <Text style={styles.cardName}>{cosmetic.name}</Text>
                    <Text style={styles.cardPrice}>
                      {isOwned ? 'Owned' : `$${(cosmetic.price_cents / 100).toFixed(2)}`}
                    </Text>
                    {isOwned ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, isActive ? styles.activeBtn : styles.equipBtn]}
                        onPress={() => !isActive && handleActivate(cosmetic)}
                      >
                        <Text style={styles.actionBtnText}>{isActive ? 'Active' : 'Equip'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.buyBtn, purchasing === cosmetic.id && styles.btnDisabled]}
                        onPress={() => handlePurchase(cosmetic)}
                        disabled={purchasing !== null}
                      >
                        {purchasing === cosmetic.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.actionBtnText}>Buy</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { marginRight: 12, padding: 4 },
  backBtnText: { fontSize: 22, color: '#6C47FF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  cardActive: { borderColor: '#6C47FF' },
  cardIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  cardIconText: { fontSize: 28 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#222', textAlign: 'center', marginBottom: 4 },
  cardPrice: { fontSize: 12, color: '#888', marginBottom: 10 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  buyBtn: { backgroundColor: '#6C47FF' },
  equipBtn: { backgroundColor: '#E8E4FF' },
  activeBtn: { backgroundColor: '#22C55E' },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
