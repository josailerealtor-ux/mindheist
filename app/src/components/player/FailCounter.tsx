import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface Props {
  count: number;
}

export function FailCounter({ count }: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
    prevCount.current = count;
  }, [count]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      <Text style={styles.icon}>✕</Text>
      <Text style={styles.count}>{count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  icon: { fontSize: 16, color: '#FF4747' },
  count: { fontSize: 20, fontWeight: 'bold', color: '#FF4747' },
});
