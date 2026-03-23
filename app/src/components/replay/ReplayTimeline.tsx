import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { AttemptEvent } from '../../types/attempt';
import { normalizeTimestamp } from '../../engine/replayAnalyzer';

interface Props {
  events: AttemptEvent[];
  totalDurationMs: number;
}

const EVENT_COLORS: Partial<Record<AttemptEvent['type'], string>> = {
  step_pass: '#47C96A',
  escape:    '#47C96A',
  step_fail: '#FF4747',
  step_submit: '#6C47FF',
  step_start:  '#aaa',
};

const EVENT_SIZE = 10;

export function ReplayTimeline({ events, totalDurationMs }: Props) {
  const { width } = useWindowDimensions();
  const trackWidth = width - 48; // 24px padding each side

  const durationLabel = totalDurationMs >= 60000
    ? `${Math.floor(totalDurationMs / 60000)}m ${Math.floor((totalDurationMs % 60000) / 1000)}s`
    : `${(totalDurationMs / 1000).toFixed(1)}s`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Timeline</Text>
        <Text style={styles.duration}>{durationLabel}</Text>
      </View>

      {/* Track */}
      <View style={[styles.track, { width: trackWidth }]}>
        <View style={styles.trackLine} />

        {events.map((event, idx) => {
          if (!EVENT_COLORS[event.type]) return null;
          const position = normalizeTimestamp(event.timestamp_ms, totalDurationMs) * trackWidth;
          return (
            <View
              key={idx}
              style={[
                styles.marker,
                {
                  left: position - EVENT_SIZE / 2,
                  backgroundColor: EVENT_COLORS[event.type]!,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color="#47C96A" label="Pass / Escape" />
        <LegendItem color="#FF4747" label="Fail" />
        <LegendItem color="#6C47FF" label="Submit" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingVertical: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  duration: { fontSize: 13, color: '#888' },
  track: { height: 40, justifyContent: 'center', position: 'relative' },
  trackLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2, backgroundColor: '#e5e5e5', borderRadius: 1,
  },
  marker: {
    position: 'absolute',
    width: EVENT_SIZE,
    height: EVENT_SIZE,
    borderRadius: EVENT_SIZE / 2,
    top: (40 - EVENT_SIZE) / 2,
  },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: '#888' },
});
