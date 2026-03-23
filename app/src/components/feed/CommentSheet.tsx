import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { socialApi, Comment } from '../../api/social';
import { track } from '../../lib/analytics';

interface Props {
  trapId: string | null;
  onClose: () => void;
}

export function CommentSheet({ trapId, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!trapId) return;
    setLoading(true);
    socialApi.getComments(trapId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [trapId]);

  async function handleSubmit() {
    if (!trapId || !body.trim()) return;
    setSubmitting(true);
    try {
      const comment = await socialApi.postComment(trapId, body.trim());
      track('comment_posted', { trap_id: trapId });
      setComments((prev) => [...prev, comment]);
      setBody('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={!!trapId}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator color="#6C47FF" /></View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No comments yet. Be first!</Text>}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{item.user.username[0].toUpperCase()}</Text>
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>@{item.user.username}</Text>
                  <Text style={styles.commentText}>{item.body}</Text>
                </View>
              </View>
            )}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            value={body}
            onChangeText={setBody}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!body.trim() || submitting) && styles.sendBtnDisabled]}
            onPress={handleSubmit}
            disabled={!body.trim() || submitting}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { backgroundColor: '#6C47FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  closeBtnText: { color: '#fff', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 16 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  comment: { flexDirection: 'row', gap: 10 },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#6C47FF', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  commentAvatarText: { color: '#fff', fontWeight: 'bold' },
  commentBody: { flex: 1 },
  commentUser: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 2 },
  commentText: { fontSize: 15, color: '#222', lineHeight: 20 },
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C47FF', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
