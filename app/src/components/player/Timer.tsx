import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';

interface Props {
  startedAt: string;
  running: boolean;
}

export function Timer({ startedAt, running }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - new Date(startedAt).getTime());
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, startedAt]);

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return <Text style={styles.timer}>{display}</Text>;
}

const styles = StyleSheet.create({
  timer: { fontSize: 28, fontWeight: 'bold', fontVariant: ['tabular-nums'], color: '#222' },
});
