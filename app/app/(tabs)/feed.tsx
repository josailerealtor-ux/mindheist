import { useEffect, useState } from 'react';
import {
  FlatList, View, Text, ActivityIndicator,
  StyleSheet, SafeAreaView, RefreshControl,
} from 'react-native';
import { useFeedStore } from '../../src/store/feedStore';
import { TrapCard } from '../../src/components/feed/TrapCard';
import { CommentSheet } from '../../src/components/feed/CommentSheet';

export default function FeedScreen() {
  const { traps, loading, refreshing, error, load, refresh, loadMore, toggleLike } = useFeedStore();
  const [commentTrapId, setCommentTrapId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  if (loading && traps.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C47FF" />
      </View>
    );
  }

  if (error && traps.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      <FlatList
        data={traps}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TrapCard
            trap={item}
            onLike={toggleLike}
            onComment={(id) => setCommentTrapId(id)}
          />
        )}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6C47FF" />
        }
        ListFooterComponent={
          loading && traps.length > 0
            ? <ActivityIndicator style={{ margin: 20 }} color="#6C47FF" />
            : null
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No traps yet. Go build one!</Text>
          </View>
        }
      />

      <CommentSheet trapId={commentTrapId} onClose={() => setCommentTrapId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  list: { paddingVertical: 8 },
  errorText: { color: '#CC0000', textAlign: 'center' },
  emptyText: { color: '#aaa', fontSize: 16 },
});
